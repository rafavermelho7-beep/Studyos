// Testes de banco: migrations aplicam, RLS isola usuários, auditoria é append-only,
// ingestão por token funciona e rejeita tokens inválidos, busca de memória ignora
// memórias restritas/obsoletas. Executado por scripts/test-db.sh.
import pg from "pg";
import crypto from "node:crypto";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL_TEST });
await client.connect();

const A = crypto.randomUUID();
const B = crypto.randomUUID();
let passed = 0;
let failed = 0;

async function as(user, fn) {
  await client.query("begin");
  try {
    if (user === "anon") {
      await client.query("set local role anon");
    } else {
      await client.query("set local role authenticated");
      await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [user]);
    }
    return await fn();
  } finally {
    await client.query("rollback");
  }
}

async function asCommit(user, fn) {
  await client.query("begin");
  try {
    await client.query("set local role authenticated");
    await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [user]);
    const r = await fn();
    await client.query("commit");
    return r;
  } catch (e) {
    await client.query("rollback");
    throw e;
  }
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log("  ✓", name);
  } catch (e) {
    failed++;
    console.log("  ✗", name, "\n     ", e.message);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
async function expectError(fn, pattern) {
  try {
    await fn();
  } catch (e) {
    if (pattern && !pattern.test(e.message)) throw new Error("erro inesperado: " + e.message);
    return;
  }
  throw new Error("esperava erro, mas a operação passou");
}

// Usuários de auth (dispara criação de perfil)
await client.query("insert into auth.users(id, email) values ($1,'a@x.com'),($2,'b@x.com')", [A, B]);

console.log("Banco de dados — migrations e RLS");

await test("trigger cria perfil para novos usuários", async () => {
  const r = await client.query("select count(*)::int n from public.profiles where id in ($1,$2)", [A, B]);
  assert(r.rows[0].n === 2, "perfis não criados");
});

await asCommit(A, () =>
  client.query(
    `insert into memories(kind, content, domain, source, sensitivity) values
     ('fact','Treino musculação três vezes por semana','saude','user_stated','normal'),
     ('fact','Diagnóstico médico confidencial','saude','user_stated','restricted'),
     ('preference','Prefiro estudar de manhã cedo','estudos','user_stated','normal')`,
  ),
);
await asCommit(A, () => client.query(`insert into goals(title, domain) values ('Correr meia maratona','saude')`));

await test("usuário A vê as próprias memórias", async () => {
  const r = await as(A, () => client.query("select count(*)::int n from memories"));
  assert(r.rows[0].n === 3, `esperava 3, obteve ${r.rows[0].n}`);
});

await test("usuário B não vê dados de A (memórias, objetivos)", async () => {
  const r = await as(B, () =>
    client.query("select (select count(*) from memories)::int m, (select count(*) from goals)::int g"),
  );
  assert(r.rows[0].m === 0 && r.rows[0].g === 0, "vazamento entre usuários");
});

await test("anônimo não lê nada", async () => {
  const r = await as("anon", () => client.query("select count(*)::int n from memories"));
  assert(r.rows[0].n === 0, "anônimo leu memórias");
});

await test("B não consegue inserir dados em nome de A", async () => {
  await expectError(
    () => as(B, () => client.query(`insert into goals(user_id, title) values ($1,'x')`, [A])),
    /row-level security/,
  );
});

await test("B não consegue alterar objetivos de A", async () => {
  const r = await as(B, () => client.query(`update goals set title='hack' returning id`));
  assert(r.rowCount === 0, "update atravessou RLS");
});

await test("inferência não pode ser registrada como fato declarado", async () => {
  await expectError(
    () => as(A, () => client.query(`insert into memories(kind, content, source) values ('inference','x','user_stated')`)),
    /inference_not_stated/,
  );
});

await test("domínio inválido é rejeitado", async () => {
  await expectError(() => as(A, () => client.query(`insert into goals(title, domain) values ('x','inexistente')`)));
});

await test("match_memories encontra por relevância e exclui restritas", async () => {
  const r = await as(A, () => client.query(`select content from match_memories('quantas vezes eu treino?', 10)`));
  const contents = r.rows.map((x) => x.content);
  assert(contents.some((c) => c.includes("musculação") || c.includes("Treino")), "não achou memória de treino");
  const r2 = await as(A, () => client.query(`select content from match_memories('diagnóstico médico', 10)`));
  assert(r2.rowCount === 0, "memória restrita retornada");
});

await test("match_memories ignora memórias obsoletas", async () => {
  const r = await as(A, async () => {
    await client.query(`update memories set status='outdated' where content like 'Prefiro estudar%'`);
    return client.query(`select content from match_memories('estudar manhã', 10)`);
  });
  assert(r.rowCount === 0, "memória obsoleta retornada");
});

await test("auditoria é append-only", async () => {
  await asCommit(A, () => client.query(`insert into audit_log(actor, action, entity) values ('user','test','x')`));
  const r = await as(A, () => client.query(`update audit_log set action='forged' returning id`));
  assert(r.rowCount === 0, "auditoria foi alterada");
  const d = await as(A, () => client.query(`delete from audit_log returning id`));
  assert(d.rowCount === 0, "auditoria foi apagada");
});

await test("mensagem não pode ser inserida em espaço de outro usuário", async () => {
  const s = await asCommit(A, () => client.query(`insert into spaces(title) values ('Espaço A') returning id`));
  const spaceId = s.rows[0].id;
  await expectError(
    () => as(B, () => client.query(`insert into messages(space_id, role, content) values ($1,'user','oi')`, [spaceId])),
  );
});

await test("apenas um espaço ambient por usuário", async () => {
  await asCommit(A, () => client.query(`insert into spaces(title, kind) values ('Ambiente','ambient')`));
  await expectError(() => as(A, () => client.query(`insert into spaces(title, kind) values ('Outro','ambient')`)));
});

const token = crypto.randomBytes(32).toString("hex");
const hash = crypto.createHash("sha256").update(token).digest("hex");
await asCommit(A, () => client.query(`insert into ingest_tokens(name, token_hash) values ('iPhone',$1)`, [hash]));

await test("ingestão de saúde com token válido grava agregados do dono", async () => {
  const r = await as("anon", () =>
    client.query(`select ingest_health_daily($1, $2::jsonb) n`, [
      token,
      JSON.stringify([
        { day: "2026-10-30", sleep_minutes: 410, steps: 8000, workouts: 1, workout_minutes: 50 },
        { day: "2026-10-31", sleep_minutes: 380 },
      ]),
    ]),
  );
  assert(r.rows[0].n === 2, "linhas não gravadas");
});

await test("ingestão com token inválido é rejeitada", async () => {
  await expectError(
    () => as("anon", () => client.query(`select ingest_health_daily($1, '[]'::jsonb)`, ["x".repeat(64)])),
    /invalid token/,
  );
});

await test("token revogado deixa de funcionar", async () => {
  await expectError(
    () =>
      as(A, async () => {
        await client.query(`update ingest_tokens set revoked_at = now()`);
        await client.query("set local role anon");
        return client.query(`select ingest_health_daily($1, '[]'::jsonb)`, [token]);
      }),
    /invalid token/,
  );
});

await test("payload acima de 400 dias é rejeitado", async () => {
  const rows = Array.from({ length: 401 }, (_, i) => ({ day: "2026-01-01", steps: i }));
  await expectError(
    () => as("anon", () => client.query(`select ingest_health_daily($1, $2::jsonb)`, [token, JSON.stringify(rows)])),
    /invalid payload/,
  );
});

await test("ai_spend agrega gasto do mês e do dia", async () => {
  const r = await as(A, async () => {
    await client.query(
      `insert into ai_usage(local_day, task, provider, model, cost_brl) values
       ('2026-11-01','chat','anthropic','m',0.50),('2026-11-01','chat','anthropic','m',0.25),
       ('2026-10-31','chat','anthropic','m',9.00)`,
    );
    return client.query(`select * from ai_spend('2026-11-01','2026-11-01')`);
  });
  assert(Number(r.rows[0].month_brl) === 0.75 && Number(r.rows[0].today_brl) === 0.75, JSON.stringify(r.rows[0]));
});

await test("ai_spend de B não inclui gastos de A", async () => {
  const r = await as(B, () => client.query(`select * from ai_spend('2026-01-01','2026-11-01')`));
  assert(Number(r.rows[0].month_brl) === 0, "gasto de outro usuário contabilizado");
});

await client.end();
console.log(`\n${passed} passaram, ${failed} falharam`);
process.exit(failed ? 1 : 0);

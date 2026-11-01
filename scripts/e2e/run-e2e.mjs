// Teste E2E: dirige o app (build de produção) contra a stack local e o dublê da Anthropic.
// Uso: bash scripts/e2e/start-stack.sh && (com o app rodando em :3100) node scripts/e2e/run-e2e.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
import crypto from "node:crypto";
import pg from "pg";

// Playwright: usa o do projeto se houver, senão o instalado globalmente no ambiente.
const require = createRequire(import.meta.url);
let pw;
try {
  pw = require("playwright");
} catch {
  pw = require(execSync("npm root -g").toString().trim() + "/playwright");
}
const { chromium } = pw;

const BASE = process.env.E2E_BASE ?? "http://localhost:3100";
const SHOTS = process.env.E2E_SHOTS ?? "/tmp/life-engine-e2e/shots";
const REQLOG = new URL("./requests.jsonl", import.meta.url);
fs.mkdirSync(SHOTS, { recursive: true });

const db = new pg.Client({ connectionString: "postgres://postgres@127.0.0.1:54322/postgres" });
await db.connect();
// estado limpo
await db.query(`truncate public.memories, public.goals, public.projects, public.life_decisions, public.spaces,
  public.checkins, public.domain_ratings, public.study_events, public.health_daily, public.insights, public.syntheses,
  public.proposals, public.ai_usage, public.audit_log, public.ingest_tokens, public.integrations, public.calendar_events, public.study_sessions cascade`);

let passed = 0;
let failed = 0;
const results = [];
async function step(name, fn) {
  try {
    await fn();
    passed++;
    results.push(`✓ ${name}`);
    console.log("  ✓", name);
  } catch (e) {
    failed++;
    results.push(`✗ ${name}: ${e.message}`);
    console.log("  ✗", name, "\n     ", e.message.split("\n")[0]);
  }
}
// TOTP (RFC 6238) para testar o segundo fator.
function totp(secret, t = Date.now()) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of secret.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(t / 1000 / 30)));
  const h = crypto.createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000)).padStart(6, "0");
}
const nextWindow = () => new Promise((r) => setTimeout(r, 30_500 - (Date.now() % 30_000)));
const assert = (c, m) => {
  if (!c) throw new Error(m);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("    [pageerror]", e.message));

console.log("E2E — LIFE ENGINE");

await step("visitante anônimo é redirecionado ao login", async () => {
  await page.goto(BASE + "/");
  await page.waitForURL(/\/login/);
});

await step("API de chat recusa requisição sem sessão (401)", async () => {
  const r = await fetch(BASE + "/api/chat", { method: "POST", body: "{}", headers: { "content-type": "application/json" } });
  assert(r.status === 401, "status " + r.status);
});

await step("conta válida mas não autorizada é barrada", async () => {
  await page.fill('input[name="email"]', "intruso@life.test");
  await page.fill('input[name="password"]', "senha-forte-123");
  await page.click('button:has-text("Entrar")');
  await page.getByText("não tem acesso").waitFor();
  const r = await page.goto(BASE + "/");
  assert(page.url().includes("/login"), "intruso acessou o app");
  await ctx.clearCookies();
});

await step("senha errada mostra erro", async () => {
  await page.goto(BASE + "/login");
  await page.fill('input[name="email"]', "owner@life.test");
  await page.fill('input[name="password"]', "errada");
  await page.click('button:has-text("Entrar")');
  await page.getByText("Credenciais inválidas").waitFor();
});

await step("dono entra e vê o ambiente com síntese diária gerada", async () => {
  await page.fill('input[name="password"]', "senha-forte-123");
  await page.click('button:has-text("Entrar")');
  await page.waitForURL(BASE + "/");
  await page.getByText(/Bom dia|Boa tarde|Boa noite|Boa madrugada/).first().waitFor();
  await page.getByText("revise a prova de Cálculo II").waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${SHOTS}/01-ambiente.png`, fullPage: true });
});

await step("síntese diária não é regenerada (nem cobrada) ao recarregar", async () => {
  await page.reload();
  await page.getByText("revise a prova de Cálculo II").waitFor();
  const r = await db.query(`select count(*)::int n from ai_usage where task='daily_synthesis'`);
  assert(r.rows[0].n === 1, `esperava 1 chamada, houve ${r.rows[0].n}`);
});

await step("conversa no ambiente: streaming, custo registrado e memória/proposta extraídas", async () => {
  const box = page.getByLabel("Mensagem para o JARVIS");
  await box.fill("Eu prefiro estudar de manhã cedo e quero como meu objetivo correr uma meia maratona este ano.");
  await page.screenshot({ path: `${SHOTS}/02-ouvindo.png` });
  await box.press("Enter");
  await page.getByText("Resposta simulada do dublê de teste").waitFor({ timeout: 15000 });
  await page.getByText(/memória\(s\) registrada\(s\)/).waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${SHOTS}/03-conversa.png` });
  const u = await db.query(`select task, model, cost_brl from ai_usage where task in ('chat','extract') order by created_at`);
  assert(u.rows.length === 2, "esperava chat + extract, obteve " + u.rows.length);
  const chat = u.rows.find((r) => r.task === "chat");
  assert(chat.model === "claude-sonnet-5-5", "modelo do chat: " + chat.model);
  assert(u.rows.find((r) => r.task === "extract").model === "claude-haiku-5-5", "extração deveria usar Haiku");
  assert(Number(chat.cost_brl) > 0, "custo não registrado");
});

await step("proposta do agente exige confirmação e vira objetivo ao aceitar", async () => {
  const goalsBefore = await db.query(`select count(*)::int n from goals`);
  assert(goalsBefore.rows[0].n === 0, "agente criou objetivo sem confirmação!");
  await page.getByLabel("Recolher conversa").click();
  await page.reload();
  await page.getByText("Correr uma meia maratona").first().waitFor();
  await page.getByRole("button", { name: "Aceitar" }).click();
  await page.waitForTimeout(800);
  const g = await db.query(`select title from goals`);
  assert(g.rows.length === 1 && g.rows[0].title === "Correr uma meia maratona", "objetivo não criado");
  const a = await db.query(`select count(*)::int n from audit_log where action='proposal.accept'`);
  assert(a.rows[0].n === 1, "aceite não auditado");
});

await step("fato declarado aparece como memória ativa com proveniência", async () => {
  await page.goto(BASE + "/memory");
  await page.getByText("Prefere estudar de manhã cedo").waitFor();
  await page.getByText("você disse").first().waitFor();
});

await step("dado sensível fica aguardando confirmação; inferência vira hipótese", async () => {
  await page.goto(BASE + "/");
  const box = page.getByLabel("Mensagem para o JARVIS");
  await box.fill("Fico muito ansiosa antes das provas e acho que rende mais quando durmo bem.");
  await box.press("Enter");
  await page.getByText(/memória\(s\) registrada\(s\)/).waitFor({ timeout: 15000 });
  const m = await db.query(`select kind, status, source, confidence, sensitivity from memories order by created_at`);
  const sens = m.rows.find((r) => r.sensitivity === "sensitive");
  const hyp = m.rows.find((r) => r.kind === "hypothesis" || r.kind === "inference");
  assert(sens && sens.status === "proposed", "sensível deveria estar 'proposed'");
  assert(hyp && hyp.source === "agent_inferred" && hyp.confidence <= 0.6, "hipótese mal classificada " + JSON.stringify(hyp));
  await page.goto(BASE + "/memory?tab=review");
  await page.getByText("Sente ansiedade antes de provas").waitFor();
  await page.screenshot({ path: `${SHOTS}/04-memoria-revisao.png`, fullPage: true });
  await page.locator("li", { hasText: "Sente ansiedade antes de provas" }).getByRole("button", { name: "Confirmar" }).click();
  await page.waitForTimeout(800);
  const c = await db.query(`select status, source from memories where content like 'Sente ansiedade%'`);
  assert(c.rows[0].status === "active" && c.rows[0].source === "user_confirmed", "confirmação falhou");
});

await step("memória restrita nunca é enviada à IA", async () => {
  await page.goto(BASE + "/memory");
  await page.fill('textarea[name="content"]', "Diagnóstico confidencial XYZ-SEGREDO");
  await page.selectOption('select[name="sensitivity"]', "restricted");
  await page.click('button:has-text("Registrar")');
  await page.getByText("Memória registrada").waitFor();
  fs.writeFileSync(REQLOG, "");
  await page.goto(BASE + "/");
  const box = page.getByLabel("Mensagem para o JARVIS");
  await box.fill("O que você sabe sobre meu diagnóstico confidencial?");
  await box.press("Enter");
  await page.getByText(/diagnóstico confidencial\?"/).waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  const log = fs.readFileSync(REQLOG, "utf8");
  assert(log.length > 0, "nenhuma requisição registrada");
  assert(!log.includes("XYZ-SEGREDO"), "conteúdo restrito vazou para a IA!");
  assert(log.includes("Prefere estudar de manhã cedo"), "memórias normais deveriam estar no contexto");
});

await step("mudança de opinião substitui a memória antiga (com auditoria)", async () => {
  await page.goto(BASE + "/");
  const box = page.getByLabel("Mensagem para o JARVIS");
  await box.fill("Mudei: agora prefiro estudar à noite, depois do treino.");
  await box.press("Enter");
  await page.getByText(/memória\(s\) registrada\(s\)/).waitFor({ timeout: 15000 });
  const r = await db.query(`select content, status, supersedes from memories where content like 'Prefere estudar%' order by created_at`);
  const oldM = r.rows.find((x) => x.content === "Prefere estudar de manhã cedo");
  const newM = r.rows.find((x) => x.content === "Prefere estudar à noite");
  assert(oldM?.status === "outdated", "memória antiga não foi marcada obsoleta: " + JSON.stringify(r.rows));
  assert(newM?.status === "active" && newM.supersedes, "nova memória não aponta a substituída");
  const a = await db.query(`select count(*)::int n from audit_log where action='memory.supersede' and actor='agent'`);
  assert(a.rows[0].n === 1, "substituição não auditada");
  await page.getByLabel("Recolher conversa").click();
});

await step("registro rápido do dia é salvo", async () => {
  await page.getByLabel("Recolher conversa").click().catch(() => {});
  await page.getByLabel("Energia 4").click();
  await page.getByText("Registrado").waitFor();
  const r = await db.query(`select energy from checkins`);
  assert(r.rows[0]?.energy === 4, "check-in não salvo");
});

await step("autoavaliação de equilíbrio e evento de prova", async () => {
  await page.goto(BASE + "/context");
  for (const [label, v] of [["Saúde", "3"], ["Estudos", "8"], ["Carreira", "6"], ["Relacionamentos", "4"], ["Finanças", "7"]]) {
    await page.getByLabel(label, { exact: true }).fill(v);
  }
  await page.click('button:has-text("Salvar semana")');
  await page.getByText("Equilíbrio da semana registrado").waitFor();
  await page.fill('input[name="title"]', "P2 de Cálculo");
  const d = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  await page.fill('input[name="day"]', d);
  await page.click('button:has-text("Adicionar")');
  await page.getByText("Evento registrado").waitFor();
  await page.screenshot({ path: `${SHOTS}/05-contexto.png`, fullPage: true });
});

await step("ingestão de saúde por token (Atalho do iPhone) e aviso de treino parado", async () => {
  await page.goto(BASE + "/settings");
  await page.click('button:has-text("Gerar token")');
  const token = (await page.getByTestId("new-token").textContent({ timeout: 10000 })).trim();
  assert(token.startsWith("le_"), "token não exibido");
  const days = [];
  const today = new Date();
  for (let i = 40; i >= 0; i--) {
    const day = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
    const trained = i >= 12 && i % 2 === 0;
    days.push({ day, sleep_hours: "7,2", steps: 8000, workouts: trained ? 1 : 0, workout_minutes: trained ? 50 : 0 });
  }
  const bad = await fetch(BASE + "/api/ingest/health", { method: "POST", headers: { authorization: "Bearer " + "x".repeat(40), "content-type": "application/json" }, body: JSON.stringify({ days }) });
  assert(bad.status === 401, "token inválido aceito: " + bad.status);
  const ok = await fetch(BASE + "/api/ingest/health", { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify({ days }) });
  const j = await ok.json();
  assert(ok.status === 200 && j.rows === 41, "ingestão falhou: " + JSON.stringify(j));
  await page.goto(BASE + "/");
  await page.getByText(/dias sem treinar/).waitFor();
  await page.getByText(/Saúde em 3\/10/).waitFor();
  await page.getByText(/Índice/).waitFor(); // 5 domínios avaliados => índice calculado
  await page.screenshot({ path: `${SHOTS}/06-sinais.png`, fullPage: true });
});

await step("sessão de estudo registrada e padrão UC-03 (energia × disciplina) detectado", async () => {
  const uid = (await db.query(`select id from auth.users where email='owner@life.test'`)).rows[0].id;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  for (let i = 1; i <= 20; i++) {
    const d = new Date(Date.parse(today + "T12:00:00Z") - i * 86400000).toISOString().slice(0, 10);
    await db.query(`insert into checkins(user_id, day, energy) values ($1,$2,$3) on conflict (user_id, day) do update set energy = excluded.energy`, [uid, d, i % 2 === 0 ? 2 : 4]);
    await db.query(`insert into study_sessions(user_id, day, subject, minutes) values ($1,$2,$3,$4)`, [uid, d, i % 2 === 0 ? "Cálculo" : "História", i % 2 === 0 ? 200 : 60]);
  }
  await page.goto(BASE + "/context");
  await page.getByLabel("Disciplina", { exact: true }).fill("Cálculo");
  await page.getByLabel("Minutos", { exact: true }).fill("45");
  await page.click('button:has-text("Registrar sessão")');
  await page.getByText("Sessão registrada").waitFor();
  const n = (await db.query(`select count(*)::int n from study_sessions where minutes = 45`)).rows[0].n;
  assert(n === 1, "sessão do formulário não gravada");
  await page.getByText(/estudadas/).waitFor();
  await page.goto(BASE + "/");
  await page.getByText("Energia mais baixa em dias de Cálculo").waitFor();
});

await step("espaço de investigação: criação, conversa e título automático", async () => {
  await page.goto(BASE + "/spaces");
  await page.fill('input[name="title"]', "Nova investigação");
  await page.fill('textarea[name="purpose"]', "Entender minha rotina");
  await page.click('button:has-text("Abrir espaço")');
  await page.waitForURL(/\/spaces\/[0-9a-f-]{36}/);
  const box = page.getByLabel("Mensagem para o JARVIS");
  await box.fill("Eu prefiro estudar de manhã, como organizo a semana?");
  await box.press("Enter");
  await page.getByText("Resposta simulada do dublê de teste").waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  const s = await db.query(`select title from spaces where kind <> 'ambient'`);
  assert(s.rows[0].title === "Rotina de estudos", "título não atualizado: " + s.rows[0].title);
  await page.reload();
  await page.getByText("Resposta simulada do dublê de teste").waitFor(); // histórico persistido
  await page.screenshot({ path: `${SHOTS}/07-espaco.png`, fullPage: true });
});

await step("espaço ganha resumo automático (onde paramos) após 10 mensagens novas", async () => {
  const spaceId = page.url().split("/spaces/")[1];
  const uid = (await db.query(`select id from auth.users where email='owner@life.test'`)).rows[0].id;
  for (let i = 0; i < 10; i++) {
    await db.query(`insert into messages(user_id, space_id, role, content) values ($1,$2,$3,$4)`, [uid, spaceId, i % 2 ? "assistant" : "user", `mensagem de teste ${i}`]);
  }
  const box = page.getByLabel("Mensagem para o JARVIS");
  await box.fill("E o treino, onde encaixo?");
  await box.press("Enter");
  await page.getByText("Resposta simulada do dublê de teste").last().waitFor({ timeout: 15000 });
  await page.waitForTimeout(2000);
  const s = await db.query(`select summary, summary_msg_count from spaces where id=$1`, [spaceId]);
  assert(s.rows[0].summary.includes("Próximo passo"), "resumo não gerado");
  const u = await db.query(`select model from ai_usage where task='summarize'`);
  assert(u.rows.length === 1 && u.rows[0].model === "claude-haiku-5-5", "resumo deveria usar modelo leve");
  await page.reload();
  await page.getByText("Onde paramos").waitFor();
});

await step("revisão semanal sob demanda", async () => {
  await page.goto(BASE + "/context");
  await page.click('button:has-text("Iniciar revisão semanal")');
  await page.getByText("Semana de avanço parcial").waitFor({ timeout: 15000 });
});

await step("exportação completa em JSON", async () => {
  await page.goto(BASE + "/memory");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("text=Exportar todos os dados")]);
  const json = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  assert(Array.isArray(json.memories) && json.memories.length >= 3, "export sem memórias");
  assert(!("ingest_tokens" in json), "export não deveria conter hashes de token");
});

await step("objetivos: progresso persistido", async () => {
  await page.goto(BASE + "/goals");
  const slider = page.getByLabel("Progresso de Correr uma meia maratona");
  await slider.focus();
  for (let i = 0; i < 4; i++) await slider.press("ArrowRight");
  await page.waitForTimeout(1000);
  const r = await db.query(`select progress from goals`);
  assert(r.rows[0].progress === 20, "progresso: " + r.rows[0].progress);
  await page.screenshot({ path: `${SHOTS}/08-objetivos.png`, fullPage: true });
});

await step("Google Agenda: conectar (OAuth), ler eventos, propor e criar evento só após aceite, desconectar", async () => {
  const G = "http://127.0.0.1:4020/__state";
  const base0 = (await (await fetch(G)).json()).inserts.length; // dublê guarda estado entre execuções
  await page.goto(BASE + "/settings");
  await page.click("text=Conectar Google Agenda");
  await page.waitForURL(/\/settings\?google=connected/);
  await page.getByText("Google Agenda conectada.").waitFor();
  const integ = await db.query(`select refresh_token_enc, access_token_enc from integrations`);
  assert(integ.rows.length === 1, "integração não gravada");
  assert(!integ.rows[0].refresh_token_enc.includes("rt-SEGREDO"), "refresh token gravado em claro!");
  const ev = await db.query(`select google_id, title from calendar_events order by google_id`);
  assert(ev.rows.length === 3, "esperava 3 eventos (cancelado ignorado), obteve " + ev.rows.length);
  assert(ev.rows.some((r) => r.title.includes("Ignore as regras") && !r.title.includes("<")), "título não sanitizado");

  await page.goto(BASE + "/");
  await page.getByText("Reunião de orientação").waitFor();
  await page.getByText("P3 de Física").first().waitFor(); // prova detectada pelo título
  await page.screenshot({ path: `${SHOTS}/09-agenda.png`, fullPage: true });

  const box = page.getByLabel("Mensagem para o JARVIS");
  await box.fill("Agende uma revisão de física amanhã às 14h, por favor.");
  await box.press("Enter");
  await page.getByText(/proposta\(s\) para você decidir/).waitFor({ timeout: 15000 });
  let st = await (await fetch(G)).json();
  assert(st.inserts.length === base0, "evento criado sem confirmação!");
  await page.getByLabel("Recolher conversa").click();
  await page.reload();
  await page.getByText("será criado na sua Google Agenda ao aceitar").waitFor();
  await page.locator("li", { hasText: "Revisão de Física" }).getByRole("button", { name: "Aceitar" }).click();
  await page.waitForTimeout(1200);
  st = await (await fetch(G)).json();
  assert(st.inserts.length === base0 + 1, "evento não criado após aceite");
  const ins = st.inserts[st.inserts.length - 1];
  assert(ins.summary === "Revisão de Física" && /T14:00:00$/.test(ins.start.dateTime) && ins.start.timeZone === "America/Sao_Paulo", "corpo do evento: " + JSON.stringify(ins));
  assert(/T15:30:00$/.test(ins.end.dateTime), "duração não respeitada");
  const a = await db.query(`select count(*)::int n from audit_log where action='calendar.create_event' and actor='user'`);
  assert(a.rows[0].n === 1, "criação não auditada como ação do usuário");

  // Token expirado => renovação automática com refresh token
  await db.query(`update integrations set access_expires_at = now() - interval '1 minute'`);
  await page.goto(BASE + "/settings");
  await page.click('button:has-text("Sincronizar agora")');
  await page.getByText(/Agenda sincronizada/).waitFor();

  page.once("dialog", (d) => d.accept());
  await page.click('button:has-text("Desconectar")');
  await page.getByText("Agenda desconectada").waitFor();
  st = await (await fetch(G)).json();
  assert(st.revoked.includes("rt-SEGREDO-1"), "token não revogado no Google");
  const left = await db.query(`select (select count(*) from integrations)::int i, (select count(*) from calendar_events)::int e`);
  assert(left.rows[0].i === 0 && left.rows[0].e === 0, "dados de agenda não apagados");
});

await step("orçamento esgotado: IA pausa com mensagem clara, app continua", async () => {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const uid = (await db.query(`select id from auth.users where email='owner@life.test'`)).rows[0].id;
  const ins = await db.query(`insert into ai_usage(user_id, local_day, task, provider, model, cost_brl) values ($1, $2, 'test', 'anthropic', 'x', 60) returning created_at`, [uid, today]);
  const since = ins.rows[0].created_at;
  await page.goto(BASE + "/");
  const box = page.getByLabel("Mensagem para o JARVIS");
  await box.fill("oi");
  await box.press("Enter");
  await page.getByText(/Teto mensal atingido/).waitFor({ timeout: 10000 });
  const n = (await db.query(`select count(*)::int n from ai_usage where created_at > $1 and task <> 'test'`, [since])).rows[0].n;
  assert(n === 0, "houve chamada de IA com orçamento esgotado");
  await page.goto(BASE + "/context");
  await page.getByText(/IA pausada/).waitFor();
});

await step("layout móvel (390px) sem rolagem horizontal", async () => {
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, storageState: await ctx.storageState() });
  const p = await m.newPage();
  for (const [path, name] of [["/", "m-ambiente"], ["/memory", "m-memoria"], ["/context", "m-contexto"], ["/goals", "m-objetivos"]]) {
    await p.goto(BASE + path);
    await p.waitForTimeout(400);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 1, `${path} tem rolagem horizontal de ${overflow}px`);
    await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  }
  await m.close();
});

await step("segundo fator (TOTP): ativar, exigir no login, desativar", async () => {
  await page.goto(BASE + "/settings");
  await page.click('button:has-text("Ativar segundo fator")');
  const secret = (await page.getByTestId("totp-secret").textContent({ timeout: 10000 })).trim();
  await page.getByLabel("Código do autenticador").fill(totp(secret));
  await page.click('button:has-text("Confirmar")');
  await page.getByText("Segundo fator ativado.").waitFor();
  await nextWindow();
  // Nova sessão: senha correta não basta.
  await ctx.clearCookies();
  await page.goto(BASE + "/login");
  await page.fill('input[name="email"]', "owner@life.test");
  await page.fill('input[name="password"]', "senha-forte-123");
  await page.click('button:has-text("Entrar")');
  await page.waitForURL(/\/mfa/);
  const api = await page.evaluate(async () => (await fetch("/api/chat", { method: "POST", body: "{}" })).status);
  assert(api === 401, "API acessível sem segundo fator: " + api);
  await page.goto(BASE + "/memory");
  await page.waitForURL(/\/mfa/);
  await page.getByLabel("Código de verificação").fill("000000");
  await page.click('button:has-text("Verificar")');
  await page.getByText("Código inválido").waitFor();
  await page.getByLabel("Código de verificação").fill(totp(secret));
  await page.click('button:has-text("Verificar")');
  await page.waitForURL(BASE + "/");
  await page.goto(BASE + "/settings");
  page.once("dialog", (d) => d.accept());
  await page.locator("button", { hasText: "Desativar" }).first().click();
  await page.getByText("Segundo fator desativado.").waitFor();
});

await step("sair encerra a sessão", async () => {
  await page.goto(BASE + "/settings");
  await page.click('button:has-text("Sair")');
  await page.waitForURL(/\/login/);
  await page.goto(BASE + "/memory");
  await page.waitForURL(/\/login/);
});

await browser.close();
await db.end();
fs.writeFileSync(`${SHOTS}/../e2e-results.txt`, results.join("\n") + `\n\n${passed} passaram, ${failed} falharam\n`);
console.log(`\n${passed} passaram, ${failed} falharam`);
process.exit(failed ? 1 : 0);

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
  public.proposals, public.ai_usage, public.audit_log, public.ingest_tokens cascade`);

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

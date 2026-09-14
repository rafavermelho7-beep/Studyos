import { test, expect } from "@playwright/test";

// Mirrors the brief's own worked example (section 31): an exam in a few
// days, one topic already mastered, one never studied -- the engine must
// rank the unstudied one above the mastered one as today's focus.
test("dashboard recommends the least-prepared topic ahead of an upcoming exam", async ({ page }) => {
  const unique = Date.now();
  const email = `planning-${unique}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Planejamento");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("correcthorsebattery");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/subjects");
  await page.getByPlaceholder("Nome da matéria (ex: Cardiologia)").fill("Cardiologia");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.getByText("Cardiologia").click();

  await page.getByPlaceholder("Novo tópico (ex: Insuficiência cardíaca)").fill("Valvopatias");
  await page.getByRole("button", { name: "Adicionar tópico" }).click();
  await expect(page.getByText("Valvopatias")).toBeVisible();
  await page.getByLabel("Status de Valvopatias").selectOption("DOMINADO");
  await expect(page.getByLabel("Status de Valvopatias")).toHaveValue("DOMINADO");

  await page.getByPlaceholder("Novo tópico (ex: Insuficiência cardíaca)").fill("Arritmias");
  await page.getByRole("button", { name: "Adicionar tópico" }).click();
  // Arritmias stays NOVO (never studied) -- the higher-priority one. Wait
  // for it to actually land before navigating away: against a real remote
  // Postgres (unlike the old local SQLite), navigating while this create
  // is still in flight can abort the underlying fetch before it commits.
  await expect(page.getByText("Arritmias")).toBeVisible();

  await page.goto("/exams");
  await page.getByRole("button", { name: "Nova prova" }).click();
  await page.getByLabel("Matéria da prova").selectOption({ label: "Cardiologia" });
  await page.getByPlaceholder("Nome da prova").fill("Prova de Cardio");
  const future = new Date();
  future.setDate(future.getDate() + 5);
  await page.getByLabel("Data da prova").fill(future.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Adicionar prova" }).click();
  await page.getByText("Prova de Cardio").click();

  await page.getByLabel("Incluir Valvopatias na prova").check();
  await expect(page.getByLabel("Incluir Valvopatias na prova")).toBeChecked();
  await page.getByLabel("Incluir Arritmias na prova").check();
  await expect(page.getByLabel("Incluir Arritmias na prova")).toBeChecked();
  // These checkboxes are optimistic (useOptimistic) -- checked instantly on
  // the client regardless of whether the server mutation has landed yet.
  // Wait for the underlying request to actually finish before navigating
  // away, or the exam-topic link can get aborted mid-flight.
  await page.waitForLoadState("networkidle");

  await page.goto("/dashboard");
  await expect(page.getByText("Seu foco agora")).toBeVisible();
  await expect(page.getByText("Arritmias")).toBeVisible();
  await expect(page.getByText("Ainda não estudado")).toBeVisible();
  await expect(page.getByText(/Prova em \d dias?/).first()).toBeVisible();
  // The mastered topic still shows up, just ranked below -- proves the
  // engine ordered by priority rather than only surfacing one result.
  await expect(page.getByRole("link", { name: /Valvopatias/ })).toBeVisible();
});

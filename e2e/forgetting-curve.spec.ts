import { test, expect } from "@playwright/test";

test("topic detail page shows FSRS state and forgetting curve after grading", async ({ page }) => {
  const unique = Date.now();
  const email = `curve-${unique}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Curva");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("correcthorsebattery");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/subjects");
  await page.getByPlaceholder("Nome da matéria (ex: Cardiologia)").fill("Cardiologia");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.getByText("Cardiologia").click();
  await page.getByPlaceholder("Novo tópico (ex: Insuficiência cardíaca)").fill("Arritmias");
  await page.getByRole("button", { name: "Adicionar tópico" }).click();
  await page.getByRole("link", { name: "Arritmias" }).click();

  await expect(page).toHaveURL(/\/topics\/.+/);
  const topicUrl = page.url();
  await page.getByRole("button", { name: "Iniciar revisão espaçada" }).click();
  await expect(page.getByText("Novo", { exact: true })).toBeVisible();

  // No curve yet -- the topic has never actually been graded.
  await expect(page.getByText("Curva de esquecimento")).not.toBeVisible();

  await page.goto("/review");
  await page.getByRole("button", { name: "Bom" }).click();
  await expect(page.getByText("Nenhuma revisão pendente agora.")).toBeVisible();

  await page.goto(topicUrl);
  await expect(page.getByText("Curva de esquecimento (estimativa)")).toBeVisible();
  await expect(page.getByText("Bom")).toBeVisible();
});

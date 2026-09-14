import { test, expect } from "@playwright/test";

test("start a topic in spaced review, grade it, and see it leave the queue", async ({ page }) => {
  const unique = Date.now();
  const email = `review-${unique}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Revisão");
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

  await page.goto("/review");
  await expect(page.getByText("Nenhuma revisão pendente agora.")).toBeVisible();
  await expect(page.getByText("Cardiologia · Valvopatias")).toBeVisible();

  await page.getByRole("button", { name: "Iniciar" }).click();
  await expect(page.getByText("Valvopatias")).toBeVisible();
  await expect(page.getByText("Novo", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Bom" }).click();
  await expect(page.getByText("Nenhuma revisão pendente agora.")).toBeVisible();
});

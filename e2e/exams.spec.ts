import { test, expect } from "@playwright/test";

test("create an exam, link a topic, and see preparation stats", async ({ page }) => {
  const unique = Date.now();
  const email = `exams-${unique}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Provas");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("correcthorsebattery");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/subjects");
  await page.getByPlaceholder("Nome da matéria (ex: Cardiologia)").fill("Cardiologia");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.getByText("Cardiologia").click();
  await page
    .getByPlaceholder("Novo tópico (ex: Insuficiência cardíaca)")
    .fill("Arritmias");
  await page.getByRole("button", { name: "Adicionar tópico" }).click();
  await expect(page.getByText("Arritmias")).toBeVisible();

  await page.goto("/exams");
  await page.getByRole("button", { name: "Nova prova" }).click();
  await page.getByLabel("Matéria da prova").selectOption({ label: "Cardiologia" });
  await page.getByPlaceholder("Nome da prova").fill("Prova de Cardio");

  const future = new Date();
  future.setDate(future.getDate() + 5);
  const isoDate = future.toISOString().slice(0, 10);
  await page.getByLabel("Data da prova").fill(isoDate);

  await page.getByRole("button", { name: "Adicionar prova" }).click();
  await expect(page.getByText("Prova de Cardio")).toBeVisible();
  await expect(page.getByText("5 dias")).toBeVisible();

  await page.getByText("Prova de Cardio").click();
  await expect(page).toHaveURL(/\/exams\/.+/);

  await page.getByLabel("Incluir Arritmias na prova").check();
  // Freshly created topics default to NOVO, so preparation starts at 0%.
  await expect(page.getByText("0%")).toBeVisible();
  await expect(page.getByText("🔴 1 não estudados")).toBeVisible();
});

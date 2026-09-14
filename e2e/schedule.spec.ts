import { test, expect } from "@playwright/test";

test("a task with a due date shows up on the schedule in month, week, and day view", async ({ page }) => {
  const unique = Date.now();
  const email = `schedule-${unique}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Cronograma");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("correcthorsebattery");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/tasks");
  await page.getByPlaceholder("Nova tarefa (ex: Resumir arritmias)").fill("Revisar renal");
  await page.getByRole("button", { name: "Detalhes" }).click();
  const today = new Date().toISOString().slice(0, 10);
  await page.getByLabel("Prazo da tarefa").fill(today);
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(page.getByText("Revisar renal")).toBeVisible();

  await page.goto("/schedule");
  await expect(page.getByText("Revisar renal")).toBeVisible();

  await page.getByRole("link", { name: "Semana" }).click();
  await expect(page.getByText("Revisar renal")).toBeVisible();

  await page.getByRole("link", { name: "Dia" }).click();
  await expect(page.getByText("Revisar renal")).toBeVisible();
});

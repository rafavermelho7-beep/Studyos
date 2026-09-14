import { test, expect } from "@playwright/test";

test("create a task, mark it done, filter, and delete it", async ({ page }) => {
  const unique = Date.now();
  const email = `tasks-${unique}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Tarefas");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("correcthorsebattery");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/tasks");
  await page.getByPlaceholder("Nova tarefa (ex: Resumir arritmias)").fill("Resumir arritmias");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(page.getByText("Resumir arritmias")).toBeVisible();

  await page.getByRole("link", { name: "A fazer" }).click();
  await expect(page.getByText("Resumir arritmias")).toBeVisible();

  await page.getByRole("link", { name: "Concluídas" }).click();
  await expect(page.getByText("Nenhuma tarefa aqui.")).toBeVisible();

  await page.getByRole("link", { name: "Todas" }).click();
  await page.getByLabel('Marcar "Resumir arritmias" como concluída').check();
  await expect(page.getByLabel('Marcar "Resumir arritmias" como concluída')).toBeChecked();

  await page.getByRole("link", { name: "Concluídas" }).click();
  await expect(page.getByText("Resumir arritmias")).toBeVisible();

  await page.getByLabel('Excluir tarefa "Resumir arritmias"').click();
  await expect(page.getByText("Nenhuma tarefa aqui.")).toBeVisible();
});

import { test, expect } from "@playwright/test";

test("stats page reflects a real logged study session", async ({ page }) => {
  const unique = Date.now();
  const email = `stats-${unique}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Stats");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("correcthorsebattery");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/stats");
  await expect(page.getByText("Sem sessões de estudo registradas neste período.")).toBeVisible();

  await page.goto("/subjects");
  await page.getByPlaceholder("Nome da matéria (ex: Cardiologia)").fill("Farmacologia");
  await page.getByRole("button", { name: "Adicionar" }).click();

  await page.goto("/sessions");
  await page.getByLabel("Matéria da sessão").selectOption({ label: "Farmacologia" });
  await page.getByRole("button", { name: "Começar sessão" }).click();
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Finalizar" }).click();
  await expect(page.getByText("Sessão concluída")).toBeVisible();

  await page.goto("/stats");
  await expect(page.getByText("Horas estudadas")).toBeVisible();
  await expect(page.getByText("Sessões")).toBeVisible();
  await expect(page.getByText("1", { exact: true })).toBeVisible();
  await expect(page.getByText("Farmacologia").first()).toBeVisible();
});

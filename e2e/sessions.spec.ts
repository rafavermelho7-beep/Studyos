import { test, expect } from "@playwright/test";

test("run a free-mode focus session and see it in recent activity", async ({ page }) => {
  const unique = Date.now();
  const email = `sessions-${unique}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Sessão");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("correcthorsebattery");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/sessions");
  await expect(page.getByText("Nenhuma sessão registrada ainda.")).toBeVisible();

  await page.getByRole("button", { name: "Começar sessão" }).click();
  await expect(page.getByText("Foco", { exact: true })).toBeVisible();

  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Finalizar" }).click();

  await expect(page.getByText("Sessão concluída")).toBeVisible();
  await page.getByRole("button", { name: "Nova sessão" }).click();

  await expect(page.getByText("Estudo livre")).toBeVisible();
});

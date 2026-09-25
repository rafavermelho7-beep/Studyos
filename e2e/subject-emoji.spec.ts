import { test, expect } from "@playwright/test";

test("subjects get a suggested emoji, which can be changed and removed", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Emoji");
  await page.getByLabel("E-mail").fill(`emoji-${Date.now()}@example.com`);
  await page.getByLabel("Senha").fill("correcthorsebattery");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Created with the emoji its name suggests.
  await page.goto("/subjects");
  await page.getByPlaceholder("Nome da matéria (ex: Cardiologia)").fill("Cardiologia");
  await page.getByRole("button", { name: "Adicionar" }).click();
  const card = page.getByRole("link", { name: /Cardiologia/ });
  await expect(card).toContainText("🫀");

  // Change it through the picker's search.
  await card.click();
  await page.getByRole("button", { name: "Trocar emoji (Cardiologia)" }).click();
  await page.getByLabel("Buscar emoji").fill("neuro");
  await page.getByRole("button", { name: "Neurologia" }).click();
  await expect(page.getByRole("button", { name: "Trocar emoji (Neurologia)" })).toContainText("🧠");
  await page.waitForLoadState("networkidle");

  await page.reload();
  await expect(page.getByRole("button", { name: "Trocar emoji (Neurologia)" })).toContainText("🧠");
  await page.goto("/subjects");
  await expect(page.getByRole("link", { name: /Cardiologia/ })).toContainText("🧠");

  // Removing falls back to the color dot.
  await page.getByRole("link", { name: /Cardiologia/ }).click();
  await page.getByRole("button", { name: "Trocar emoji (Neurologia)" }).click();
  await page.getByRole("button", { name: "Remover emoji" }).click();
  await expect(page.getByRole("button", { name: "Escolher emoji" })).toBeVisible();
});

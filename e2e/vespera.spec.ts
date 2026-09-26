import { test, expect } from "@playwright/test";

test("modo véspera: weakest topic first, concepts to reread, time split, checklist", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Véspera");
  await page.getByLabel("E-mail").fill(`vespera-${Date.now()}@example.com`);
  await page.getByLabel("Senha").fill("correcthorsebattery");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/subjects");
  await page.getByPlaceholder("Nome da matéria (ex: Cardiologia)").fill("Pediatria");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.getByRole("link", { name: /Pediatria/ }).click();
  for (const name of ["Puericultura", "Anemias"]) {
    await page.getByPlaceholder("Novo tópico (ex: Insuficiência cardíaca)").fill(name);
    await page.getByRole("button", { name: "Adicionar tópico" }).click();
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  }
  // Puericultura is already mastered; Anemias was never studied.
  await page.getByLabel("Status de Puericultura").selectOption("DOMINADO");
  await page.waitForLoadState("networkidle");

  await page.goto("/errors");
  await page.getByLabel("Matéria").selectOption({ label: "👶 Pediatria" });
  await page.getByLabel("Tópico").selectOption({ label: "Puericultura" });
  await page.getByLabel("Conceito que errei").fill("BCG: dose única ao nascer.");
  await page.getByRole("button", { name: "Salvar conceito" }).click();
  await expect(page.getByText("✓ Conceito salvo")).toBeVisible();

  await page.goto("/exams");
  await page.getByRole("button", { name: "Nova prova" }).click();
  await page.getByLabel("Matéria da prova").selectOption({ label: "Pediatria" });
  await page.getByPlaceholder("Nome da prova").fill("P2 Pediatria");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await page.getByLabel("Data da prova").fill(tomorrow.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Adicionar prova" }).click();
  await page.getByText("P2 Pediatria").click();
  await expect(page).toHaveURL(/\/exams\/[^/]+$/);
  await page.getByLabel("Incluir Puericultura na prova").check();
  await page.getByLabel("Incluir Anemias na prova").check();
  await page.waitForLoadState("networkidle");

  await page.getByRole("link", { name: /Modo véspera/ }).click();
  await expect(page).toHaveURL(/\/vespera$/);
  const cards = page.locator("ol > li");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText("Anemias"); // never studied beats mastered
  await expect(cards.nth(1)).toContainText("1 conceito a fixar");

  // The time box splits across topics.
  await page.getByLabel("Quanto tempo você tem para revisar?").fill("2");
  await expect(cards.nth(0)).toContainText("1h20");
  await expect(cards.nth(1)).toContainText("40 min");

  // Open the second topic: its concept is there to reread.
  await cards.nth(1).getByRole("button", { name: /Puericultura/ }).click();
  await expect(page.getByText("BCG: dose única ao nascer.")).toBeVisible();

  // Checklist survives a reload (kept on this device).
  await page.getByLabel('Marcar "Anemias" como revisado').check();
  await expect(page.getByText("1 de 2 tópicos revisados")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Marcar "Anemias" como revisado')).toBeChecked();
});

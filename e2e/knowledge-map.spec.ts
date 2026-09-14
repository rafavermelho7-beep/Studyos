import { test, expect } from "@playwright/test";

test("knowledge map shows a new topic as not-studied and updates after mastering it", async ({ page }) => {
  const unique = Date.now();
  const email = `map-${unique}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Mapa");
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
  await expect(page.getByText("Arritmias")).toBeVisible();

  await page.goto("/knowledge-map");
  const tile = page.getByRole("link", { name: /Arritmias/ });
  await expect(tile).toBeVisible();
  await expect(tile).toHaveAttribute("title", /Não estudado/);

  await page.goto("/subjects");
  await page.getByText("Cardiologia").click();
  await page.getByLabel("Status de Arritmias").selectOption("DOMINADO");

  await page.goto("/knowledge-map");
  await expect(page.getByRole("link", { name: /Arritmias/ })).toHaveAttribute("title", /Dominado/);
});

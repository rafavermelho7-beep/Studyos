import { test, expect } from "@playwright/test";

// Exercises the real vertical slice end to end against the app's real
// server actions and SQLite database (no mocks): register -> login is
// implied by the redirect -> create a subject -> create a topic -> change
// its status -> log out -> log back in and confirm the data persisted.
test("register, create subject/topic, change status, persists across sessions", async ({
  page,
}) => {
  const unique = Date.now();
  const email = `test-${unique}@example.com`;
  const password = "correcthorsebattery";

  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Teste");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Vamos configurar seus estudos.")).toBeVisible();

  await page.getByRole("link", { name: "Adicionar matéria" }).click();
  await expect(page).toHaveURL(/\/subjects/);

  await page.getByPlaceholder("Nome da matéria (ex: Cardiologia)").fill("Cardiologia");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(page.getByText("Cardiologia")).toBeVisible();

  await page.getByText("Cardiologia").click();
  await expect(page).toHaveURL(/\/subjects\/.+/);

  await page
    .getByPlaceholder("Novo tópico (ex: Insuficiência cardíaca)")
    .fill("Insuficiência cardíaca");
  await page.getByRole("button", { name: "Adicionar tópico" }).click();
  await expect(page.getByText("Insuficiência cardíaca")).toBeVisible();

  const statusSelect = page.getByLabel("Status de Insuficiência cardíaca");
  await statusSelect.selectOption("DOMINADO");
  await expect(statusSelect).toHaveValue("DOMINADO");

  // Log out via the user menu, then log back in and confirm persistence.
  await page.getByLabel("Menu do usuário").click();
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Cardiologia")).toBeVisible();
});

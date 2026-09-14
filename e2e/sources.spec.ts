import { test, expect } from "@playwright/test";

test("add a SanarFlix source to a topic, mark done, log time, see it in the sources hub", async ({
  page,
}) => {
  const unique = Date.now();
  const email = `sources-${unique}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Fontes");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("correcthorsebattery");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/subjects");
  await page.getByPlaceholder("Nome da matéria (ex: Cardiologia)").fill("Cardiologia");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.getByText("Cardiologia").click();
  await page.getByPlaceholder("Novo tópico (ex: Insuficiência cardíaca)").fill("Insuficiência cardíaca");
  await page.getByRole("button", { name: "Adicionar tópico" }).click();
  await page.getByRole("link", { name: "Insuficiência cardíaca" }).click();

  await expect(page).toHaveURL(/\/topics\/.+/);
  await page.getByRole("button", { name: "Adicionar fonte" }).click();
  await page.getByLabel("Tipo de fonte").selectOption("SANARFLIX");
  await page.getByPlaceholder("Título").fill("Aula de Insuficiência Cardíaca");
  await page.getByPlaceholder("URL (opcional)").fill("https://sanarflix.com.br/aula-exemplo");
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByText("Aula de Insuficiência Cardíaca")).toBeVisible();

  await page.getByLabel('Marcar "Aula de Insuficiência Cardíaca" como concluída').check();

  await page.getByRole("button", { name: "Registrar tempo" }).click();
  await page.getByLabel("Minutos estudados").fill("42");
  await page.getByRole("button", { name: "Salvar" }).click();

  await page.goto("/sources");
  await expect(page.getByText("Aula de Insuficiência Cardíaca")).toBeVisible();
  await expect(page.getByText("SanarFlix")).toBeVisible();
  await expect(page.getByText("Concluída")).toBeVisible();

  await page.goto("/stats");
  await expect(page.getByText("42 min")).toBeVisible();
});

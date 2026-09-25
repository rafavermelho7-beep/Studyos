import { test, expect, type Page } from "@playwright/test";

// Settings → Aparência: theme, accent, start screen, monthly goal and the
// dashboard's block order/visibility — each one saved and read back after
// a real reload, not just the optimistic client state.

async function setup(page: Page) {
  const email = `appearance-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Aparência");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("correcthorsebattery");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // The block layout only shows once there's at least one subject.
  await page.goto("/subjects");
  await page.getByPlaceholder("Nome da matéria (ex: Cardiologia)").fill("Cardiologia");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(page.getByText("Cardiologia")).toBeVisible();
  return email;
}

test("monthly goal: honest empty state, then real progress once set", async ({ page }) => {
  await setup(page);

  await page.goto("/dashboard");
  await expect(page.getByText("Defina uma meta de horas pro mês")).toBeVisible();

  await page.getByRole("link", { name: "Personalizar" }).click();
  await expect(page).toHaveURL(/\/settings#aparencia/);
  await page.getByRole("spinbutton", { name: /Meta do mês/ }).fill("20");
  await page.getByRole("button", { name: "Salvar meta" }).click();
  await expect(page.getByRole("button", { name: "Remover" })).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByText("Meta do mês")).toBeVisible();
  await expect(page.getByText("de 20h")).toBeVisible();
  // Nothing studied yet: 0 of 20h, and it says so.
  await expect(page.getByRole("progressbar", { name: "Progresso da meta do mês" })).toHaveAttribute("aria-valuenow", "0");
});

test("theme and accent apply immediately and survive a reload", async ({ page }) => {
  await setup(page);
  await page.goto("/settings");
  const html = page.locator("html");

  await page.getByRole("button", { name: "Escuro" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Cor Verde", exact: true }).click();
  await expect(html).toHaveAttribute("data-accent", "green");
  await page.waitForLoadState("networkidle");

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(html).toHaveAttribute("data-accent", "green");
  // The CSS actually resolves the dark-mode green, not the default indigo.
  const accent = await html.evaluate((el) => getComputedStyle(el).getPropertyValue("--accent").trim());
  expect(accent).toBe("#5fd08a");

  await page.getByRole("button", { name: "Automático" }).click();
  await expect(html).not.toHaveAttribute("data-theme", /.+/);
});

test("start screen and dashboard blocks follow the user's choices", async ({ page }) => {
  const email = await setup(page);
  await page.goto("/settings");

  await page.getByLabel("Tela que abre ao entrar no app").selectOption({ label: "Revisão" });
  await page.getByLabel('Mostrar "Suas matérias" no Início').uncheck();
  await page.getByRole("button", { name: 'Subir "Meta do mês"' }).click();
  await page.waitForLoadState("networkidle");

  await page.goto("/dashboard");
  const blocks = page.locator("section[data-block]");
  await expect(blocks.first()).toHaveAttribute("data-block", "goal");
  await expect(page.locator('section[data-block="subjects"]')).toHaveCount(0);

  // Logging back in lands on the chosen screen.
  await page.getByRole("button", { name: "Menu do usuário" }).click();
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("correcthorsebattery");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/review/);
});

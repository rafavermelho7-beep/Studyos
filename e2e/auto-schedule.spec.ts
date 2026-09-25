import { test, expect } from "@playwright/test";

test("cronograma automático: hours per weekday → daily topic blocks, véspera reserved", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Plano");
  await page.getByLabel("E-mail").fill(`plano-${Date.now()}@example.com`);
  await page.getByLabel("Senha").fill("correcthorsebattery");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Honest empty state before there's any exam.
  await page.goto("/schedule?view=plan");
  await expect(page.getByText("Nenhuma prova nos próximos 60 dias.")).toBeVisible();

  await page.goto("/subjects");
  await page.getByPlaceholder("Nome da matéria (ex: Cardiologia)").fill("Pediatria");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.getByRole("link", { name: /Pediatria/ }).click();
  for (const name of ["Puericultura", "Anemias"]) {
    await page.getByPlaceholder("Novo tópico (ex: Insuficiência cardíaca)").fill(name);
    await page.getByRole("button", { name: "Adicionar tópico" }).click();
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await page.getByLabel("Status de Puericultura").selectOption("DOMINADO");
  await page.waitForLoadState("networkidle");

  await page.goto("/exams");
  await page.getByRole("button", { name: "Nova prova" }).click();
  await page.getByLabel("Matéria da prova").selectOption({ label: "Pediatria" });
  await page.getByPlaceholder("Nome da prova").fill("P3 Pediatria");
  const examDate = new Date();
  examDate.setDate(examDate.getDate() + 5);
  await page.getByLabel("Data da prova").fill(examDate.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Adicionar prova" }).click();
  await page.getByText("P3 Pediatria").click();
  await expect(page).toHaveURL(/\/exams\/[^/]+$/);
  await page.getByLabel("Incluir Puericultura na prova").check();
  await page.getByLabel("Incluir Anemias na prova").check();
  await page.waitForLoadState("networkidle");

  await page.goto("/schedule");
  await page.getByRole("link", { name: "Plano", exact: true }).click();
  await expect(page).toHaveURL(/view=plan/);
  await expect(page.getByText("Preencha as horas acima para gerar o plano.")).toBeVisible();

  for (const day of ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]) {
    await page.getByLabel(`Horas de estudo — ${day}`).fill("1");
  }
  await page.getByRole("button", { name: "Salvar horas" }).click();
  await expect(page.getByText("✓ Plano atualizado")).toBeVisible();

  const days = page.getByRole("list", { name: "Plano de estudos" }).locator("> li");
  await expect(days).toHaveCount(5);
  // Today: the never-studied topic comes first, with a way to start it.
  const today = page.getByTestId("plan-today");
  await expect(today.locator("li").first()).toContainText("Anemias");
  await expect(today.getByRole("link", { name: "Começar" }).first()).toHaveAttribute("href", /topicId=/);
  // The mastered topic still gets a turn somewhere in the plan.
  await expect(days.filter({ hasText: "Puericultura" }).first()).toBeVisible();
  // The last day is the véspera.
  await expect(days.last()).toContainText("Véspera · P3 Pediatria");
  await expect(days.last().getByRole("link", { name: "Modo véspera" })).toBeVisible();

  // The hours stick.
  await page.reload();
  await expect(page.getByLabel("Horas de estudo — Seg")).toHaveValue("1");
});

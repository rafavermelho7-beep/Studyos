import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

// Caderno de Erros end to end: log a missed question (with a photo), see
// it summarized, on its topic page and in "Seu foco agora", then review it.

test("log a missed question and review it later", async ({ page }) => {
  const email = `errors-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Erros");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("correcthorsebattery");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/subjects");
  await page.getByPlaceholder("Nome da matéria (ex: Cardiologia)").fill("Pediatria");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.getByRole("link", { name: /Pediatria/ }).click();
  await page.getByPlaceholder("Novo tópico (ex: Insuficiência cardíaca)").fill("Anemia ferropriva");
  await page.getByRole("button", { name: "Adicionar tópico" }).click();
  await expect(page.getByRole("link", { name: "Anemia ferropriva", exact: true })).toBeVisible();

  // The form starts open while the notebook is empty.
  await page.goto("/errors");
  await page.getByLabel("Matéria").selectOption({ label: "👶 Pediatria" });
  await page.getByLabel("Tópico").selectOption({ label: "Anemia ferropriva" });
  await page.getByLabel("De onde é a questão").fill("MedCof");
  await page.getByLabel("A questão", { exact: true }).fill("Lactente de 9 meses com Hb 8,5 — qual a dose de ferro?");
  const photo = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 800;
    c.height = 500;
    c.getContext("2d")!.fillRect(0, 0, 800, 500);
    return c.toDataURL("image/png");
  });
  await page.getByLabel("Foto da questão").setInputFiles({
    name: "questao.png",
    mimeType: "image/png",
    buffer: Buffer.from(photo.split(",")[1], "base64"),
  });
  await expect(page.getByAltText("Prévia da foto")).toBeVisible();
  await page.getByText("Confundi conceitos").click();
  await page.getByLabel("O que aprendi").fill("Tratamento: 3–5 mg/kg/dia de ferro elementar.");
  await page.getByRole("button", { name: "Salvar erro" }).click();
  await expect(page.getByText("✓ Erro registrado")).toBeVisible();
  // Stays open and cleared, ready for the next question.
  await expect(page.getByLabel("O que aprendi")).toHaveValue("");

  await expect(page.getByText("Tratamento: 3–5 mg/kg/dia de ferro elementar.")).toBeVisible();

  // On a phone, the filter chip rows scroll inside themselves — the page
  // itself must not get wider than the screen.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.getByAltText("Foto da questão")).toBeVisible();
  await expect(page.getByText("Erros registrados")).toBeVisible();
  // Not due yet — first look is tomorrow.
  await expect(page.getByRole("link", { name: /Revisar erros/ })).toHaveCount(0);

  // It shows on the topic page and pushes the topic up in the focus card.
  await page.goto("/subjects");
  await page.getByRole("link", { name: /Pediatria/ }).click();
  await page.getByRole("link", { name: "Anemia ferropriva", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Caderno de erros" })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("Errou 1 questão recentemente")).toBeVisible();

  // Fast-forward: make it due (test fixture only — the app has no time travel).
  const db = new PrismaClient();
  await db.errorEntry.updateMany({ where: { user: { email } }, data: { nextReviewAt: new Date(Date.now() - 60_000) } });
  await db.$disconnect();

  // A second, text-only error so the queue has two cards (one used to get skipped).
  await page.goto("/errors");
  await page.getByRole("button", { name: "Registrar erro" }).click(); // closed once the notebook has entries
  await page.getByLabel("A questão", { exact: true }).fill("Qual o marcador mais precoce de ferropenia?");
  await page.getByText("Não sabia o conteúdo").click();
  await page.getByLabel("O que aprendi").fill("Ferritina cai primeiro.");
  await page.getByRole("button", { name: "Salvar erro" }).click();
  await expect(page.getByText("✓ Erro registrado")).toBeVisible();
  const db2 = new PrismaClient();
  await db2.errorEntry.updateMany({ where: { user: { email } }, data: { nextReviewAt: new Date(Date.now() - 60_000) } });
  await db2.$disconnect();

  await page.reload();
  await page.getByRole("link", { name: "Revisar erros (2)" }).click();
  await expect(page.getByText("1 de 2")).toBeVisible();
  await expect(page.getByText(/Tratamento: 3–5|Ferritina cai primeiro/)).toHaveCount(0); // lesson hidden until revealed
  await page.getByRole("button", { name: "Mostrar a lição" }).click();
  await page.getByRole("button", { name: "Acertaria agora" }).click();
  await expect(page.getByText("2 de 2")).toBeVisible();
  await page.getByRole("button", { name: "Mostrar a lição" }).click();
  await page.getByRole("button", { name: "Ainda erraria" }).click();
  await expect(page.getByText("Revisão concluída")).toBeVisible();
  await expect(page.getByText("1 acertaria agora · 1 para rever amanhã")).toBeVisible();
});

import { test, expect } from "@playwright/test";

test("generate an API key, link a deck, and sync Anki review activity via the connector API", async ({
  page,
  request,
}) => {
  const unique = Date.now();
  const email = `anki-${unique}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Anki");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("correcthorsebattery");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/subjects");
  await page.getByPlaceholder("Nome da matéria (ex: Cardiologia)").fill("Cardiologia");
  await page.getByRole("button", { name: "Adicionar" }).click();

  await page.goto("/settings");
  await page.getByRole("button", { name: "Gerar chave" }).click();
  const keyCode = page.locator("code", { hasText: "sk_live_" });
  await expect(keyCode).toBeVisible();
  const keyText = await keyCode.textContent();
  expect(keyText).toMatch(/^sk_live_/);

  await page.getByPlaceholder("Nome do deck no Anki").fill("Cardio::Arritmias");
  await page.getByLabel("Matéria do vínculo").selectOption({ label: "Cardiologia" });
  await page.getByRole("button", { name: "Vincular" }).click();
  await expect(page.getByText("Cardio::Arritmias")).toBeVisible();

  // A deck-linked subdeck ("Cardio::Arritmias::Bradicardia") must resolve
  // to the parent link -- and unauthenticated/bad-key requests must be
  // rejected.
  const unauthorized = await request.post("/api/anki/sync", {
    data: { reviews: [{ deckName: "Cardio::Arritmias", date: "2026-01-01", cardsReviewed: 5, timeSpentMs: 60000 }] },
  });
  expect(unauthorized.status()).toBe(401);

  const today = new Date().toISOString().slice(0, 10);
  const sync = await request.post("/api/anki/sync", {
    headers: { Authorization: `Bearer ${keyText}` },
    data: {
      reviews: [
        { deckName: "Cardio::Arritmias::Bradicardia", date: today, cardsReviewed: 30, timeSpentMs: 900000 },
      ],
    },
  });
  expect(sync.ok()).toBeTruthy();
  const body = await sync.json();
  expect(body.synced).toBe(1);

  await page.goto("/stats");
  await expect(page.getByText("Horas estudadas")).toBeVisible();
  await expect(page.getByText("15 min")).toBeVisible();
  await expect(page.getByText("Cardiologia").first()).toBeVisible();
});

import { test, expect, type Page } from "@playwright/test";

// Real photos end to end: picked through the file input, shrunk in the
// browser, uploaded via server action, served back only to their owner.

async function register(page: Page, prefix: string) {
  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Fotos");
  await page.getByLabel("E-mail").fill(`${prefix}-${Date.now()}@example.com`);
  await page.getByLabel("Senha").fill("correcthorsebattery");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** A 2400×1600 PNG drawn in the page — big enough that resizing must kick in. */
async function makePhoto(page: Page) {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1600;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 2400, 1600);
    gradient.addColorStop(0, "#e11d48");
    gradient.addColorStop(1, "#2563eb");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2400, 1600);
    return canvas.toDataURL("image/png");
  });
  return { name: "foto.png", mimeType: "image/png", buffer: Buffer.from(dataUrl.split(",")[1], "base64") };
}

test("subject cover: upload, see it everywhere, private to its owner, remove", async ({ page, browser }) => {
  await register(page, "photos-cover");
  await page.goto("/subjects");
  await page.getByPlaceholder("Nome da matéria (ex: Cardiologia)").fill("Cardiologia");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.getByText("Cardiologia").click();
  await expect(page).toHaveURL(/\/subjects\/.+/);

  const photo = await makePhoto(page);
  await page.getByTestId("photo-input-Adicionar capa").setInputFiles(photo);
  const cover = page.getByRole("img", { name: "Capa de Cardiologia" });
  await expect(cover).toBeVisible();

  // Served compressed and resized, from the session-checked route.
  const src = await cover.getAttribute("src");
  expect(src).toMatch(/^\/api\/images\/.+/);
  const res = await page.request.get(src!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/webp");
  expect((await res.body()).length).toBeLessThan(photo.buffer.length);

  // Nobody else can load it — not logged out, not another account.
  const anon = await browser.newContext({ baseURL: page.url() });
  expect((await anon.request.get(src!)).status()).toBe(401);
  const otherPage = await anon.newPage();
  await register(otherPage, "photos-intruder");
  expect((await otherPage.request.get(src!)).status()).toBe(404);
  await anon.close();

  await page.goto("/subjects");
  await expect(page.locator(`img[src="${src}"]`)).toBeVisible();

  await page.getByText("Cardiologia").click();
  await page.getByRole("button", { name: "Remover capa" }).click();
  await expect(cover).toBeHidden();
  await expect(page.getByRole("button", { name: "Adicionar capa" })).toBeVisible();
  expect((await page.request.get(src!)).status()).toBe(404);
});

test("app background: photo, gradient, and removing the photo", async ({ page }) => {
  await register(page, "photos-bg");
  await page.goto("/settings");
  const background = page.getByTestId("app-background");
  await expect(background).toHaveCount(0);

  await page.getByTestId("photo-input-Foto").setInputFiles(await makePhoto(page));
  await expect(background).toHaveAttribute("data-style", "photo");
  await expect(page.getByRole("img", { name: "Foto de fundo atual" })).toBeVisible();

  await page.reload();
  await expect(background).toHaveAttribute("data-style", "photo");

  await page.getByRole("button", { name: "Gradiente" }).click();
  await expect(background).toHaveAttribute("data-style", "gradient");
  // The photo is kept, so switching back doesn't need a new upload.
  await page.getByRole("button", { name: "Foto", exact: true }).click();
  await expect(background).toHaveAttribute("data-style", "photo");

  await page.getByRole("button", { name: "Remover foto" }).click();
  await expect(background).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Foto de fundo atual" })).toBeHidden();
});

import { test, expect, type Page } from "@playwright/test";

// Aulas end to end: create from the subject page, upload through the
// signed-URL flow (the local stand-in for Supabase Storage in dev/e2e),
// open files only as their owner, links, topics, and cleanup on delete.

const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

async function register(page: Page, prefix: string) {
  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Aulas");
  await page.getByLabel("E-mail").fill(`${prefix}-${Date.now()}@example.com`);
  await page.getByLabel("Senha").fill("correcthorsebattery");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("a class with slides, a link and a topic — private to its owner", async ({ page, browser }) => {
  await register(page, "lessons");
  await page.goto("/subjects");
  await page.getByPlaceholder("Nome da matéria (ex: Cardiologia)").fill("Ginecologia");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.getByRole("link", { name: /Ginecologia/ }).click();
  await page.getByPlaceholder("Novo tópico (ex: Insuficiência cardíaca)").fill("Pré-natal");
  await page.getByRole("button", { name: "Adicionar tópico" }).click();
  await expect(page.getByRole("link", { name: "Pré-natal" })).toBeVisible();

  // Creating a class lands on its page, ready for files.
  await page.getByLabel("Título da aula").fill("Aula 5 – Pré-natal de baixo risco");
  await page.getByRole("button", { name: "Nova aula" }).click();
  await expect(page).toHaveURL(/\/lessons\/.+/);
  await expect(page.getByRole("heading", { name: "Aula 5 – Pré-natal de baixo risco" })).toBeVisible();

  // A PDF plus a PowerPoint whose type the phone didn't report.
  await page.getByTestId("lesson-file-input").setInputFiles([
    { name: "slides-aula5.pdf", mimeType: "application/pdf", buffer: PDF },
    { name: "complementar.pptx", mimeType: "", buffer: Buffer.from("PK\u0003\u0004 fake pptx") },
  ]);
  const pdfLink = page.getByRole("link", { name: /slides-aula5\.pdf/ });
  await expect(pdfLink).toBeVisible();
  await expect(page.getByRole("link", { name: /complementar\.pptx/ })).toBeVisible();

  // Opens (via redirect to a signed URL) as a PDF for its owner…
  const href = await pdfLink.getAttribute("href");
  const res = await page.request.get(href!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/pdf");
  expect((await res.body()).toString()).toContain("%PDF");

  // …and for nobody else.
  const other = await browser.newContext({ baseURL: new URL(page.url()).origin });
  expect((await other.request.get(href!, { maxRedirects: 0 })).status()).toBe(401);
  const otherPage = await other.newPage();
  await register(otherPage, "lessons-intruder");
  expect((await otherPage.request.get(href!, { maxRedirects: 0 })).status()).toBe(404);
  await other.close();

  await page.getByLabel("Link", { exact: true }).fill("https://drive.google.com/aula5");
  await page.getByLabel("Nome do link").fill("Gravação da aula");
  await page.getByRole("button", { name: "Adicionar link" }).click();
  await expect(page.getByRole("link", { name: /Gravação da aula/ })).toBeVisible();

  await page.getByRole("button", { name: "Pré-natal" }).click();
  await expect(page.getByRole("button", { name: "Pré-natal" })).toHaveAttribute("aria-pressed", "true");
  await page.waitForLoadState("networkidle");

  // The topic page now lists the class materials.
  await page.goto("/subjects");
  await page.getByRole("link", { name: /Ginecologia/ }).click();
  await page.getByRole("link", { name: "Pré-natal", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Materiais das aulas" })).toBeVisible();
  await expect(page.getByRole("link", { name: /slides-aula5\.pdf/ })).toBeVisible();

  // Listed in Aulas, with the storage used.
  await page.goto("/lessons");
  await expect(page.getByRole("link", { name: /Aula 5 – Pré-natal/ })).toContainText("3");
  await expect(page.getByText("Espaço de arquivos")).toBeVisible();

  // Deleting a file removes it from Storage too.
  await page.getByRole("link", { name: /Aula 5 – Pré-natal/ }).click();
  await page.getByLabel('Excluir arquivo "slides-aula5.pdf"').click();
  await page.getByRole("button", { name: "Fechar aviso" }).click();
  await expect(pdfLink).toBeHidden();
  await page.waitForLoadState("networkidle");
  expect((await page.request.get(href!, { maxRedirects: 0 })).status()).toBe(404);

  await page.getByRole("button", { name: "Excluir aula" }).click();
  await expect(page.getByText("Os 1 arquivo enviado também são apagados.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(page).toHaveURL(/\/subjects\/.+/);
  await expect(page.getByRole("link", { name: /Aula 5/ })).toHaveCount(0);
});

test("rejects file types that aren't class material", async ({ page }) => {
  await register(page, "lessons-type");
  await page.goto("/lessons");
  await expect(page.getByText("Crie uma matéria primeiro")).toBeVisible();
  await page.goto("/subjects");
  await page.getByPlaceholder("Nome da matéria (ex: Cardiologia)").fill("Pediatria");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.goto("/lessons");
  await page.getByLabel("Título da aula").fill("Aula 1");
  await page.getByRole("button", { name: "Nova aula" }).click();
  await expect(page).toHaveURL(/\/lessons\/.+/);

  await page.getByTestId("lesson-file-input").setInputFiles({
    name: "pagina.html",
    mimeType: "text/html",
    buffer: Buffer.from("<script>alert(1)</script>"),
  });
  await expect(page.getByRole("alert").filter({ hasText: "Tipo de arquivo não suportado" })).toBeVisible();
});

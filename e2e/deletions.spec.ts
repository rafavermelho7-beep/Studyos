import { test, expect, type Page } from "@playwright/test";

// Covers every "I made a mistake" path: undoable deletes (toast + Desfazer),
// confirmed cascading deletes (with the impact spelled out), and the
// spaced-review corrections (undo last grade, remove from review).

async function register(page: Page, prefix: string) {
  await page.goto("/register");
  await page.getByLabel("Nome").fill("Estudante Exclusões");
  await page.getByLabel("E-mail").fill(`${prefix}-${Date.now()}@example.com`);
  await page.getByLabel("Senha").fill("correcthorsebattery");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function createSubjectWithTopic(page: Page, subject: string, topic: string) {
  await page.goto("/subjects");
  await page.getByPlaceholder("Nome da matéria (ex: Cardiologia)").fill(subject);
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.getByText(subject).click();
  await expect(page).toHaveURL(/\/subjects\/.+/);
  await page.getByPlaceholder("Novo tópico (ex: Insuficiência cardíaca)").fill(topic);
  await page.getByRole("button", { name: "Adicionar tópico" }).click();
  await expect(page.getByRole("link", { name: topic })).toBeVisible();
}

test("undo brings a deleted task back; closing the toast deletes it for real", async ({ page }) => {
  await register(page, "del-undo");

  await page.goto("/tasks");
  await page.getByPlaceholder(/Nova tarefa/).fill("Revisar ECG");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(page.getByText("Revisar ECG")).toBeVisible();

  await page.getByLabel('Excluir tarefa "Revisar ECG"').click();
  await expect(page.getByText("Revisar ECG")).toBeHidden();
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByText("Revisar ECG")).toBeVisible();

  // Nothing was sent to the server, so it's still there after a reload.
  await page.reload();
  await expect(page.getByText("Revisar ECG")).toBeVisible();

  await page.getByLabel('Excluir tarefa "Revisar ECG"').click();
  await page.getByRole("button", { name: "Fechar aviso" }).click();
  await expect(page.getByText("Nenhuma tarefa aqui.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Revisar ECG")).toBeHidden();
});

test("edit a study session's duration, then delete it", async ({ page }) => {
  await register(page, "del-session");

  await page.goto("/sessions");
  await page.getByRole("button", { name: "Começar sessão" }).click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Finalizar" }).click();
  await page.getByRole("button", { name: "Nova sessão" }).click();
  await expect(page.getByText("Estudo livre")).toBeVisible();

  await page.getByLabel('Editar duração de "Estudo livre"').click();
  await page.getByLabel("Duração em minutos").fill("45");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("45 min")).toBeVisible();

  await page.reload();
  await expect(page.getByText("45 min")).toBeVisible();

  await page.getByLabel('Excluir sessão "Estudo livre"').click();
  await page.getByRole("button", { name: "Fechar aviso" }).click();
  await expect(page.getByText("Nenhuma sessão registrada ainda.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Nenhuma sessão registrada ainda.")).toBeVisible();
});

test("undo a review grade, then remove the topic from review", async ({ page }) => {
  await register(page, "del-review");
  await createSubjectWithTopic(page, "Cardiologia", "Valvopatias");

  await page.goto("/review");
  await page.getByRole("button", { name: "Iniciar" }).click();
  await expect(page.getByText("Novo", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Errei" }).click();
  await expect(page.getByText("Nenhuma revisão pendente agora.")).toBeVisible();
  await expect(page.getByText("Valvopatias: Errei")).toBeVisible();
  await page.getByRole("button", { name: "Desfazer" }).click();
  // Back in the queue as a never-graded card.
  await expect(page.getByText("Novo", { exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Bom" }).click();
  await expect(page.getByText("Nenhuma revisão pendente agora.")).toBeVisible();
  await page.waitForLoadState("networkidle");

  await page.goto("/subjects");
  await page.getByText("Cardiologia").click();
  await page.getByRole("link", { name: "Valvopatias" }).click();
  await expect(page).toHaveURL(/\/topics\/.+/);
  await expect(page.getByRole("heading", { name: "Histórico de revisões" })).toBeVisible();

  await page.getByRole("button", { name: "Remover da revisão" }).click();
  await expect(page.getByText(/Apaga o histórico de 1 avaliação/)).toBeVisible();
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(page.getByRole("button", { name: "Iniciar revisão espaçada" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Histórico de revisões" })).toBeHidden();
});

test("topic and subject deletes ask first and say what goes with them", async ({ page }) => {
  await register(page, "del-cascade");
  await createSubjectWithTopic(page, "Pneumologia", "Asma");

  await page.getByPlaceholder("Novo tópico (ex: Insuficiência cardíaca)").fill("DPOC");
  await page.getByRole("button", { name: "Adicionar tópico" }).click();
  await expect(page.getByRole("link", { name: "DPOC" })).toBeVisible();

  // Cancel keeps it.
  await page.getByLabel('Excluir tópico "DPOC"').click();
  await expect(page.getByText('Excluir "DPOC"?')).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("link", { name: "DPOC" })).toBeVisible();

  await page.getByLabel('Excluir tópico "DPOC"').click();
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(page.getByRole("link", { name: "DPOC" })).toBeHidden();

  // From the topic's own page: back to the subject afterwards.
  await page.getByRole("link", { name: "Asma" }).click();
  await expect(page).toHaveURL(/\/topics\/.+/);
  await page.getByRole("button", { name: "Excluir tópico" }).click();
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(page).toHaveURL(/\/subjects\/.+/);
  await expect(page.getByText("Nenhum tópico ainda.")).toBeVisible();

  await page.getByPlaceholder("Novo tópico (ex: Insuficiência cardíaca)").fill("Pneumonia");
  await page.getByRole("button", { name: "Adicionar tópico" }).click();
  await expect(page.getByRole("link", { name: "Pneumonia" })).toBeVisible();
  await page.reload();

  await page.getByRole("button", { name: "Excluir matéria" }).click();
  await expect(page.getByText("Isso apaga 1 tópico.")).toBeVisible();
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(page).toHaveURL(/\/subjects$/);
  await expect(page.getByText("Pneumologia")).toBeHidden();
});

test("delete an exam straight from the list", async ({ page }) => {
  await register(page, "del-exam");
  await createSubjectWithTopic(page, "Nefrologia", "IRA");

  await page.goto("/exams");
  await page.getByRole("button", { name: "Nova prova" }).click();
  await page.getByLabel("Matéria da prova").selectOption({ label: "Nefrologia" });
  await page.getByPlaceholder("Nome da prova").fill("P1 Nefro");
  const future = new Date();
  future.setDate(future.getDate() + 10);
  await page.getByLabel("Data da prova").fill(future.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Adicionar prova" }).click();
  await expect(page.getByText("P1 Nefro")).toBeVisible();

  await page.getByLabel('Excluir prova "P1 Nefro"').click();
  await expect(page).toHaveURL(/\/exams$/);
  await page.getByRole("button", { name: "Fechar aviso" }).click();
  await expect(page.getByText("Nenhuma prova cadastrada ainda.")).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("abre a tela de login e alterna os modos de autenticação", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible();
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Esqueci minha senha" }).click();
  await expect(page.getByRole("heading", { name: "Recuperar senha" })).toBeVisible();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Já tenho conta" }).click();
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

test("mantém a tela pública funcional em rota hash direta", async ({ page }) => {
  await page.goto("/#/pasta/teste-inexistente");

  await expect(page.getByText("Sistema de Cifras")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

test("renderiza a autenticação em largura de celular", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const panel = page.locator(".auth-panel");
  await expect(panel).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});

test("limpa conteúdo antigo pelo botão e permite desfazer", async ({ page }) => {
  await page.goto("/tests/harness.html");
  const editor=page.locator(".cm-content");
  await editor.click();
  await page.keyboard.insertText('  ">A ">Bm ">E/G#');
  await page.getByRole("button",{name:"Corrigir colagem"}).click();
  await expect(editor).toContainText("A Bm E/G#");
  await expect(editor).not.toContainText('">');
  await page.getByRole("button",{name:"Desfazer",exact:true}).click();
  await expect(editor).toContainText('">');
});

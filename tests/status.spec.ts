import { test, expect } from "@playwright/test";

test("cifras antigas aparecem pendentes e os filtros separam as revisadas", async ({ page }) => {
  await page.goto("/tests/harness.html?library");
  await expect(page.getByText("Pendente de revisão", { exact: true })).toBeVisible();
  await expect(page.getByText("Pronta para tocar", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Marcar como pronta: Música sintética", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pendentes (1)", exact: true }).click();
  await expect(page.getByText("Música sintética", { exact: true })).toBeVisible();
  await expect(page.getByText("Música revisada", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Prontas (1)", exact: true }).click();
  await expect(page.getByText("Música revisada", { exact: true })).toBeVisible();
  await expect(page.getByText("Música sintética", { exact: true })).toHaveCount(0);
  await page.getByRole("searchbox").fill("inexistente");
  await expect(page.getByText("Nenhum resultado encontrado")).toBeVisible();
});

test("editor de cifra antiga permite escolher pronta e detecta alteração não salva", async ({ page }) => {
  await page.goto("/tests/harness.html");
  const status = page.getByLabel("Status da cifra");
  await expect(status).toHaveValue("pending");
  await status.selectOption("ready");
  await expect(page.getByText("Alterações não salvas", { exact: true })).toBeVisible();
});

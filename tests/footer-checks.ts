import { expect, test, type Page } from "@playwright/test";

export async function checkFooter(page: Page) {
  return page.locator('.presentation-shell').evaluate(shell => {
    const stage = shell.querySelector('.presentation-stage')!;
    const footer = shell.querySelector('.presentation-controls')!;
    const stageRect = stage.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    return {
      separated: stageRect.bottom <= footerRect.top + 1,
      inside: footerRect.bottom <= innerHeight + 1,
      widthFits: shell.scrollWidth <= shell.clientWidth + 1,
      height: footerRect.height,
      stageHeight: stageRect.height,
    };
  });
}

export async function openPresentation(page: Page) {
  await page.goto('/tests/harness.html?title=Uma%20can%C3%A7%C3%A3o%20para%20tocar');
  await expect(page.locator('.cm-content')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('test-song', {
    detail: Array.from({length:70}, (_, i) => `Am          G\nVerso ${i + 1} para cantar\n`).join('\n') + '\nÚltima linha da canção',
  })));
  await page.getByRole('button', {name:'Apresentar fixture'}).click();
  await expect(page.locator('.presentation-stage')).toBeVisible();
}

export async function lastLineAboveFooter(page: Page) {
  await page.locator('.presentation-stage').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect.poll(async () => {
    const last = await page.locator('.presentation-block').last().boundingBox();
    const stage = await page.locator('.presentation-stage').boundingBox();
    const footer = await page.locator('.presentation-controls').boundingBox();
    return !!last && !!stage && !!footer && last.y >= stage.y && last.y + last.height <= footer.y - 8;
  }).toBe(true);
}

export function mobileFooterChecks() {
  test('rodapé compacto reserva espaço mesmo com ajustes e rotação', async ({page}, info) => {
    await openPresentation(page);
    await expect.poll(async () => (await checkFooter(page)).separated).toBe(true);
    const compact = await checkFooter(page);
    expect(compact.height).toBeLessThanOrEqual(56);
    expect(compact.widthFits && compact.inside).toBe(true);
    await lastLineAboveFooter(page);
    await page.screenshot({path:info.outputPath('compact-footer.png')});
    await page.getByRole('button', {name:'Ajustes da apresentação'}).tap();
    await expect(page.getByRole('button', {name:'Aumentar fonte', exact:true})).toBeVisible();
    await expect.poll(async () => (await checkFooter(page)).stageHeight).toBeLessThan(compact.stageHeight);
    await lastLineAboveFooter(page);
    await page.getByRole('button', {name:'Ajustes da apresentação'}).tap();
    await expect.poll(async () => (await checkFooter(page)).height).toBeLessThanOrEqual(56);
    const size = page.viewportSize()!;
    await page.setViewportSize({width:size.height, height:size.width});
    await expect.poll(async () => (await checkFooter(page)).separated).toBe(true);
    await lastLineAboveFooter(page);
    await page.getByRole('button', {name:'Sair da tela cheia'}).tap();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  });
}

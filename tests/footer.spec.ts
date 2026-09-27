import { expect, test } from "@playwright/test";
import { checkFooter, lastLineAboveFooter, openPresentation } from "./footer-checks";

for (const [width, height] of [[1920,1080], [1366,768], [320,640], [390,844], [844,390]]) {
  test(`rodapé nunca cobre a última linha em ${width}x${height}`, async ({page}, info) => {
    await page.setViewportSize({width,height});
    await openPresentation(page);
    const compact = await checkFooter(page);
    expect(compact.height).toBeLessThanOrEqual(56);
    expect(compact.separated && compact.inside && compact.widthFits).toBe(true);
    await lastLineAboveFooter(page);
    await page.screenshot({path:info.outputPath('compact-footer.png')});
    await page.getByRole('button', {name:'Ajustes da apresentação'}).click();
    await expect(page.getByRole('button', {name:'Aumentar fonte', exact:true})).toBeVisible();
    await expect.poll(async () => (await checkFooter(page)).stageHeight).toBeLessThan(compact.stageHeight);
    await lastLineAboveFooter(page);
    await page.getByRole('button', {name:'Aumentar fonte', exact:true}).click();
    await lastLineAboveFooter(page);
    await page.getByRole('button', {name:'Ajustes da apresentação'}).click();
    await lastLineAboveFooter(page);
  });
}

test('mobile mantém cabeçalho compacto e opções secundárias acessíveis', async ({page}, info) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/tests/harness.html?title=Alucina%C3%A7%C3%A3o');
  await page.getByRole('button', {name:'Visualizar fixture'}).click();
  expect((await page.locator('.app-header').boundingBox())!.height).toBeLessThanOrEqual(48);
  expect((await page.locator('.song-header').boundingBox())!.height).toBeLessThan(245);
  await expect(page.getByRole('button', {name:'Mover',exact:true})).toBeHidden();
  await page.getByRole('button', {name:'Mais opções da cifra'}).click();
  await expect(page.getByRole('button', {name:'Mover',exact:true})).toBeVisible();
  await expect(page.getByRole('button', {name:'Imprimir / Salvar em PDF'})).toBeVisible();
  await page.getByRole('button', {name:'Mais opções da cifra'}).click();
  await page.screenshot({path:info.outputPath('compact-song.png')});
  await page.goto('/tests/harness.html?library');
  expect((await page.locator('.app-header').boundingBox())!.height).toBeLessThanOrEqual(48);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({path:info.outputPath('compact-library.png')});
});

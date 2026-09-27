import { expect, test } from "@playwright/test";
import { readingChecks } from "./reading-checks";
readingChecks();

for (const width of [320, 375, 414, 820, 900, 1180, 1626]) {
  test(`cabeçalho e controles preservam espaço em ${width}px`, async ({page}, info) => {
    await page.setViewportSize({width, height:900});
    await page.goto('/tests/harness.html?title=Alucina%C3%A7%C3%A3o');
    await page.getByRole('button', {name:'Visualizar fixture'}).click();
    const title = page.locator('.song-header h1');
    expect(await title.evaluate(el => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight))).toBeLessThan(1.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const controls = page.locator('.floating-scroll');
    const bounds = await controls.boundingBox();
    expect(bounds!.height).toBeLessThan(85);
    await expect(page.getByRole('button', {name:'Marcar como pronta: Alucinação'})).toBeVisible();
    await page.screenshot({path:info.outputPath('header.png'),fullPage:true});
  });
}

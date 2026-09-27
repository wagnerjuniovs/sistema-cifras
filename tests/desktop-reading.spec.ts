import { expect, test } from "@playwright/test";

for (const [width, height] of [[900,700], [1366,768], [1536,760], [1920,1080]]) {
  test(`desktop prioriza letra e mantém controles proporcionais em ${width}px`, async ({page}, info) => {
    await page.setViewportSize({width,height});
    await page.goto('/tests/harness.html?readingLayout&title=Cada%20Volta%20%C3%A9%20um%20Recome%C3%A7o');
    await expect(page.locator('.cm-content')).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('test-song', {
      detail: Array.from({length:40}, (_,i) => `Am          G\nVerso ${i + 1} para cantar\n`).join('\n'),
    })));
    await page.getByRole('button', {name:'Visualizar fixture'}).click();
    await expect(page.locator('.song-meta')).toHaveCount(0);
    await expect(page.locator('.song-header .eyebrow')).toHaveCount(0);
    const lyrics = await page.locator('.song-text').boundingBox();
    expect(lyrics!.y).toBeLessThan(260);
    expect(lyrics!.y).toBeLessThan(height * 0.38);
    const controls = page.locator('.floating-scroll .autoscroll-controls');
    const bounds = await controls.boundingBox();
    expect(bounds!.height).toBeLessThanOrEqual(48);
    expect(bounds!.width).toBeLessThanOrEqual(462);
    const buttonHeights = await controls.locator('button').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().height));
    expect(Math.max(...buttonHeights) - Math.min(...buttonHeights)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({path:info.outputPath('desktop-reading.png')});
    await page.emulateMedia({media:'print'});
    await expect(page.locator('.song-text')).toBeVisible();
    await expect(controls).toBeHidden();
  });
}

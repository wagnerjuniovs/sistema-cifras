import { expect, test } from "@playwright/test";

export function readingChecks() {
  test("título legível e rolagem contínua respeitando toque e pausa", async ({ page }, info) => {
    await page.goto('/tests/harness.html?title=Alucina%C3%A7%C3%A3o');
    await expect(page.locator('.cm-content')).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('test-song', {
      detail: Array.from({length: 100}, (_, i) => `Am        G\nVerso ${i + 1}\n`).join('\n'),
    })));
    await page.getByRole('button', {name:'Visualizar fixture'}).click();
    const heading = page.locator('.song-header h1');
    await expect(heading).toHaveText('Alucinação');
    expect(await heading.evaluate(el => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight))).toBeLessThan(1.5);
    const header = await heading.boundingBox();
    const actions = await page.locator('.song-actions').boundingBox();
    expect(actions!.y).toBeGreaterThan(header!.y + header!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({path:info.outputPath('reading.png'), fullPage:false});

    await page.getByRole('button', {name:'Iniciar rolagem automática'}).click();
    await expect.poll(() => page.evaluate(() => document.scrollingElement!.scrollTop)).toBeGreaterThan(10);
    const samples = await page.evaluate(() => new Promise<number[]>(resolve => {
      const values: number[] = [];
      const collect = () => {
        values.push(document.scrollingElement!.scrollTop);
        if (values.length < 45) requestAnimationFrame(collect); else resolve(values);
      };
      requestAnimationFrame(collect);
    }));
    expect(samples.at(-1)!).toBeGreaterThan(samples[0]);
    expect(samples.slice(1).every((value, i) => value >= samples[i] && value - samples[i] < 5)).toBe(true);
    const touched = await page.evaluate(() => {
      document.dispatchEvent(new Event('touchstart'));
      document.scrollingElement!.scrollTop = 600;
      document.dispatchEvent(new Event('scroll'));
      return document.scrollingElement!.scrollTop;
    });
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(touched);
    await page.evaluate(() => document.dispatchEvent(new Event('touchend')));
    await expect.poll(() => page.evaluate(() => document.scrollingElement!.scrollTop)).toBeGreaterThan(touched + 5);
    await page.getByRole('button', {name:'Pausar rolagem automática'}).click();
    const paused = await page.evaluate(() => document.scrollingElement!.scrollTop);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(paused);
  });
}

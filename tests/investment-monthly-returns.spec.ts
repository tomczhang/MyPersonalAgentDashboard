import { test, expect, type Page } from '@playwright/test';
import example from '../data/examples/investment.json' with { type: 'json' };

const card = (page: Page) => page.locator('section').filter({ has: page.getByRole('heading', { name: '月度收益', exact: true }) }).first();

test.beforeEach(async ({ page }) => {
  // Screenshots and checks always use public fictional fixtures, never local slots.
  await page.route('**/api/data/*', route => route.fulfill({ json: { origin: 'example' } }));
});

for (const width of [1440, 390]) {
  test(`${width}px matrix stays inside the page in light/dark and ignores filters`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto('/#investment');
    await expect(card(page)).toBeVisible();
    const cells = card(page).locator('td');
    await expect(cells).toHaveCount(24);
    await expect(card(page).locator('[data-tone="missing"]')).toHaveCount(2);
    for (const blank of await card(page).locator('[data-tone="missing"]').all()) await expect(blank).toHaveText('');
    const before = await cells.allTextContents();
    if (width === 1440) {
      await page.getByRole('radio', { name: '虚构证券副账户', exact: true }).click();
      await page.getByRole('radio', { name: '仅框架内', exact: true }).click();
      await page.getByRole('button', { name: /收益时间范围/ }).click();
      await page.getByRole('option', { name: '近1月', exact: true }).click();
      expect(await cells.allTextContents()).toEqual(before);
    }
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') {
        await page.getByRole('button', { name: '切换深浅主题' }).filter({ visible: true }).click();
        await expect(page.locator('html')).toHaveClass(/dark/);
      }
      await card(page).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/monthly-returns-${width}-${theme}.png` });
      await card(page).screenshot({ path: `test-results/monthly-returns-${width}-card-${theme}.png` });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      const region = card(page).getByRole('region');
      if (width === 390) {
        expect(await region.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
        await region.focus();
        await page.keyboard.press('ArrowRight');
        await expect.poll(() => region.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
        await region.evaluate(node => { node.scrollLeft = node.scrollWidth; });
        await card(page).screenshot({ path: `test-results/monthly-returns-${width}-end-${theme}.png` });
        await region.evaluate(node => { node.scrollLeft = 0; });
      }
    }
    expect(errors).toEqual([]);
  });
}

test('all signed bands have readable text in both themes, and empty slots hide the card', async ({ page }) => {
  const slot: Omit<typeof example, 'monthlyReturns'> & { monthlyReturns?: typeof example.monthlyReturns } = structuredClone(example);
  slot.monthlyReturns = [{ year: 2026, months: [1, 2, 3, 4, -1, -2, -3, -4, 0, null, null, null] }];
  await page.route('**/api/data/investment', route => {
    const fixture = JSON.parse(JSON.stringify(slot).replaceAll('示例数据', '虚构浏览器测试'));
    return route.fulfill({ json: { origin: 'local', data: { ...fixture, meta: { ...fixture.meta, status: 'draft' } } } });
  });
  await page.goto('/#investment');
  for (const dark of [false, true]) {
    await page.locator('html').evaluate((node, enabled) => node.classList.toggle('dark', enabled), dark);
    await expect(card(page)).toBeVisible();
    const contrasts = await card(page).locator('td:not([data-tone="missing"])').evaluateAll(nodes => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      const luminance = (rgb: Uint8ClampedArray) => Array.from(rgb).slice(0, 3).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, index) => sum + v * [0.2126, 0.7152, 0.0722][index], 0);
      return nodes.map(node => {
        const style = getComputedStyle(node);
        ctx.fillStyle = getComputedStyle(node.closest('section')!).backgroundColor;
        ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = style.backgroundColor;
        ctx.fillRect(0, 0, 1, 1);
        const background = luminance(ctx.getImageData(0, 0, 1, 1).data);
        ctx.fillStyle = style.color;
        ctx.fillRect(0, 0, 1, 1);
        const foreground = luminance(ctx.getImageData(0, 0, 1, 1).data);
        return (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05);
      });
    });
    for (const contrast of contrasts) expect(contrast).toBeGreaterThanOrEqual(4.5);
  }
  for (const data of [undefined, []]) {
    slot.monthlyReturns = data;
    await page.reload();
    await expect(page.getByRole('region', { name: '收入与收益率', exact: true })).toBeVisible();
    await expect(card(page)).toHaveCount(0);
  }
});

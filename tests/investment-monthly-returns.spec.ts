import { test, expect, type Page } from '@playwright/test';
import example from '../data/examples/investment.json' with { type: 'json' };
import type { Investment } from '../src/data/investment-view';

const card = (page: Page) => page.locator('section').filter({ has: page.getByRole('heading', { name: '收益热力图', exact: true }) }).first();

for (const width of [1440, 390]) {
  test(`${width}px daily and monthly tooltips show signed amounts outside clipping containers`, async ({ page }) => {
    // Geometry checks need a settled view; entry/exit motion has separate coverage below.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#investment');
    const tooltip = page.getByRole('tooltip');
    for (const dark of [false, true]) {
      await page.locator('html').evaluate((node, enabled) => node.classList.toggle('dark', enabled), dark);
      await card(page).getByRole('radio', { name: '日度', exact: true }).click();
      const daily = card(page).getByRole('table', { name: /日度收益率/ });
      for (const [date, amount] of [
        ['2026-10-01', '+USD 1,800.50'], ['2026-10-02', '−USD 1,355.40'],
        ['2026-10-06', '+USD 0.00'], ['2026-10-22', '暂无盈亏金额'], ['2026-10-04', '暂无盈亏金额'],
      ]) {
        await daily.locator(`td[aria-label^="${date}"]`).hover();
        await expect(tooltip).toContainText(date);
        await expect(tooltip).toContainText(amount);
        expect(await tooltip.evaluate(node => node.closest('section'))).toBeNull();
        const box = await tooltip.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(900);
        await page.mouse.move(0, 0);
        await expect(tooltip).toHaveCount(0);
      }
      const focusCell = daily.locator('td[aria-label^="2026-10-01"]');
      await page.keyboard.press('Tab');
      await focusCell.focus();
      await expect(tooltip).toContainText('+USD 1,800.50');
      await page.keyboard.press('Escape');
      await expect(tooltip).toHaveCount(0);
      await page.keyboard.press('Tab');
      await expect(tooltip).toContainText('−USD 1,355.40');
      await card(page).getByRole('radio', { name: '月度', exact: true }).click();
      await expect(tooltip).toHaveCount(0);
      const monthly = card(page).getByRole('table', { name: '月度收益率', exact: true });
      for (const [index, month, amount] of [[0, '1月', '+USD 3,500.25'], [2, '3月', '−USD 3,605.95'], [3, '4月', '+USD 0.00'], [11, '12月', '+USD 3,786.13']] as const) {
        await monthly.locator('tbody tr').first().locator('td').nth(index).hover();
        await expect(tooltip).toContainText(`2025年${month}`);
        await expect(tooltip).toContainText(amount);
        const box = await tooltip.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
        expect(await tooltip.evaluate(node => node.closest('[data-testid="returns-viewport"]'))).toBeNull();
        await page.mouse.move(0, 0);
        await expect(tooltip).toHaveCount(0);
      }
      await monthly.locator('tbody tr').last().locator('td').last().hover();
      await expect(tooltip).toContainText('2026年12月');
      await expect(tooltip).toContainText('暂无盈亏金额');
      await page.screenshot({ path: `test-results/return-tooltip-${width}-${dark ? 'dark' : 'light'}.png` });
      await page.mouse.move(0, 0);
      await expect(tooltip).toHaveCount(0);
    }
  });
}

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
    await expect(card(page).getByRole('radio', { name: '日度', exact: true })).toBeChecked();
    await expect(card(page).getByRole('table', { name: '2026-10 日度收益率' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await card(page).screenshot({ path: `test-results/daily-returns-${width}-light.png` });
    await card(page).getByRole('radio', { name: '月度', exact: true }).click();
    await expect(card(page).getByRole('table', { name: /日度收益率/ })).toHaveCount(0);
    const cells = card(page).locator('td');
    await expect(cells).toHaveCount(24);
    await expect(card(page).locator('[data-tone="missing"]')).toHaveCount(2);
    for (const blank of await card(page).locator('[data-tone="missing"]').all()) await expect(blank).toHaveText('');
    const before = await cells.allTextContents();
    if (width === 1440) {
      await page.getByRole('radio', { name: '虚构证券副账户', exact: true }).click();
      await page.getByRole('radio', { name: '仅框架内', exact: true }).click();
      // Bring the complete chart into view before opening its non-modal popover.
      // Auto-scrolling an offscreen option otherwise dismisses it during the click.
      await page.getByRole('region', { name: '基准对比', exact: true }).scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: /收益时间范围/ }).click();
      await page.getByRole('option', { name: '近1月', exact: true }).click();
      expect(await cells.allTextContents()).toEqual(before);
    }
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') {
        await page.getByRole('button', { name: '切换深浅主题' }).filter({ visible: true }).click();
        await expect(page.locator('html')).toHaveClass(/dark/);
        await card(page).getByRole('radio', { name: '日度', exact: true }).click();
        await expect(card(page).getByRole('table', { name: /日度收益率/ })).toBeVisible();
        await card(page).screenshot({ path: `test-results/daily-returns-${width}-dark.png` });
        await card(page).getByRole('radio', { name: '月度', exact: true }).click();
        await expect(card(page).getByRole('table', { name: /日度收益率/ })).toHaveCount(0);
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
  const slot: Omit<typeof example, 'monthlyReturns' | 'dailyReturns'> & Pick<Investment, 'monthlyReturns' | 'dailyReturns'> = structuredClone(example);
  delete slot.dailyReturns;
  slot.monthlyReturns = [{ year: 2026, months: [1, 2, 3, 4, -1, -2, -3, -4, 0, null, null, null] }];
  await page.route('**/api/data/investment', route => {
    const fixture = JSON.parse(JSON.stringify(slot).replaceAll('示例数据', '虚构浏览器测试'));
    return route.fulfill({ json: { origin: 'local', data: { ...fixture, meta: { ...fixture.meta, status: 'draft' } } } });
  });
  await page.goto('/#investment');
  await expect(card(page).getByRole('status')).toHaveText('暂无日度收益数据');
  await card(page).getByRole('radio', { name: '月度', exact: true }).click();
  await expect(card(page).getByRole('status')).toHaveCount(0);
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
    await expect(page.getByRole('heading', { name: '股票 Dashboard', exact: true })).toBeVisible();
    await expect(card(page)).toHaveCount(0);
  }
  slot.dailyReturns = example.dailyReturns;
  await page.reload();
  await expect(card(page).getByRole('table', { name: /日度收益率/ })).toBeVisible();
  await card(page).getByRole('radio', { name: '月度', exact: true }).click();
  await expect(card(page).getByRole('status')).toHaveText('暂无月度收益数据');
});

test('month choice persists, keyboard switching works, and rapid switching settles on the latest view', async ({ page }) => {
  await page.goto('/#investment');
  await card(page).getByRole('button', { name: /日度收益月份/ }).click();
  await page.getByRole('option', { name: '2026年09月', exact: true }).click();
  await expect(card(page).getByRole('table', { name: '2026-09 日度收益率' })).toBeVisible();
  await expect(card(page).getByRole('cell', { name: '2026-09-30，0.0%', exact: true })).toBeVisible();
  await card(page).getByRole('radio', { name: '月度', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(card(page).getByRole('table', { name: '月度收益率', exact: true })).toBeVisible();
  await card(page).getByRole('radio', { name: '日度', exact: true }).click();
  await card(page).getByRole('radio', { name: '月度', exact: true }).click();
  await card(page).getByRole('radio', { name: '日度', exact: true }).click();
  await expect(card(page).getByRole('table')).toHaveCount(1);
  await expect(card(page).getByRole('table', { name: '2026-09 日度收益率' })).toBeVisible();
  await expect.poll(async () => card(page).getByTestId('returns-viewport').evaluate(node =>
    Math.abs(node.clientHeight - node.querySelector('table')!.offsetHeight))).toBeLessThanOrEqual(1);
});

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`view height transitions correctly with motion preference ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/#investment');
    await expect(card(page).getByRole('table', { name: /日度收益率/ })).toBeVisible();
    await card(page).scrollIntoViewIfNeeded();
    const samples = await card(page).evaluate(async node => {
      const viewport = node.querySelector('[data-testid="returns-viewport"]')!;
      const initialHeight = viewport.getBoundingClientRect().height;
      (Array.from(node.querySelectorAll('button')).find(button => button.textContent === '月度') as HTMLButtonElement).click();
      const heights: number[] = [];
      const start = performance.now();
      while (performance.now() - start < 700) {
        await new Promise(requestAnimationFrame);
        heights.push(viewport.getBoundingClientRect().height);
      }
      return { initialHeight, heights };
    });
    const finalHeight = samples.heights.at(-1)!;
    expect(samples.initialHeight - finalHeight).toBeGreaterThan(100);
    if (reducedMotion === 'no-preference') {
      expect(samples.heights.some(height => height < samples.initialHeight - 5 && height > finalHeight + 5)).toBe(true);
    } else {
      expect(samples.heights.slice(2).every(height => Math.abs(height - finalHeight) < 1)).toBe(true);
      const view = card(page).getByTestId('returns-viewport').locator(':scope > div');
      await expect(view).toHaveCSS('opacity', '1');
      await expect(view).toHaveCSS('filter', 'blur(0px)');
    }
    await expect(card(page).getByRole('table', { name: '月度收益率', exact: true })).toBeVisible();
  });
}

import { test, expect, type Page } from '@playwright/test';
import example from '../data/examples/investment.json' with { type: 'json' };
import type { Investment } from '../src/data/investment-view';

const card = (page: Page) => page.getByRole('region', { name: '投资组合集中度', exact: true });
test.beforeEach(async ({ page }) => {
  await page.route('**/api/data/*', route => route.fulfill({ json: { origin: 'example' } }));
});

for (const width of [1440, 390]) {
  test(`${width}px shows proportional bubbles, Chinese legends, all tooltip measures and real interval changes`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#investment');
    await expect(card(page)).toBeVisible();
    await expect(card(page)).toContainText('37.5%');
    await expect(card(page)).toContainText('最大单一持仓占比');
    await expect(card(page)).toContainText('股票');
    await expect(card(page)).toContainText('基金');
    const dots = card(page).locator('[data-scatter-point]');
    await expect(dots).toHaveCount(4);
    const areas = await dots.evaluateAll(nodes => nodes.map(node => ({ area: Math.PI * Number(node.getAttribute('r')) ** 2, market: Number(node.getAttribute('data-market-value')) })));
    for (const point of areas) expect(point.area / areas[0].area).toBeCloseTo(point.market / areas[0].market, 6);
    for (const dark of [false, true]) {
      await page.locator('html').evaluate((node, value) => node.classList.toggle('dark', value), dark);
      await card(page).scrollIntoViewIfNeeded();
      const point = dots.first();
      await point.hover();
      const tooltip = page.getByRole('tooltip');
      await expect(tooltip).toContainText('虚构创新资产');
      await expect(tooltip).toContainText('38.4%');
      await expect(tooltip).toContainText('+14.8%');
      await expect(tooltip).toContainText('USD 110,000.00');
      const box = await tooltip.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      await page.screenshot({ path: `test-results/concentration-${width}-${dark ? 'dark' : 'light'}-tooltip.png` });
      await page.mouse.move(0, 0);
      await expect(tooltip).toHaveCount(0);
      await card(page).screenshot({ path: `test-results/concentration-${width}-${dark ? 'dark' : 'light'}.png` });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }
    await card(page).getByRole('button', { name: /集中度时间范围/ }).click();
    await page.getByRole('option', { name: '近1月', exact: true }).click();
    await expect(dots.first()).toHaveAttribute('aria-label', /波动率 32.7%.*标的收益率 \+3.6%/);
    await dots.first().hover();
    await expect(page.getByRole('tooltip')).toContainText('+3.6%');
    await page.mouse.move(0, 0);
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await card(page).getByRole('button', { name: /集中度时间范围/ }).focus();
    await page.keyboard.press('Tab');
    await expect(dots.first()).toBeFocused();
    await expect(page.getByRole('tooltip')).toContainText('USD 110,000.00');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('account and framework filters update holdings, and missing periods never fall back to demo points', async ({ page }) => {
  await page.goto('/#investment');
  await page.getByRole('radio', { name: '虚构证券副账户', exact: true }).click();
  await expect(card(page).locator('[data-scatter-point]')).toHaveCount(2);
  await expect(card(page)).toContainText('68.75%');
  await page.getByRole('radio', { name: '仅框架内', exact: true }).click();
  await expect(card(page).locator('[data-scatter-point]')).toHaveCount(1);
  await expect(card(page)).toContainText('100%');
  const slot = structuredClone(example) as unknown as Investment;
  slot.positions!.forEach(row => { delete row.riskReturn; });
  await page.route('**/api/data/investment', route => route.fulfill({ json: { origin: 'local', data: {
    ...JSON.parse(JSON.stringify(slot).replaceAll('示例数据', '虚构测试')),
    meta: { ...slot.meta, source: '虚构测试', status: 'draft', confidence: 'low' },
  } } }));
  await page.reload();
  await expect(card(page).locator('[data-scatter-point]')).toHaveCount(0);
  await expect(card(page)).toContainText('所选时间范围暂无完整的波动率与收益率数据');
  await expect(card(page)).toContainText('37.5%');
  await card(page).getByRole('button', { name: /集中度时间范围/ }).click();
  await page.getByRole('option', { name: '近1年', exact: true }).click();
  await expect(card(page).locator('[data-scatter-point]')).toHaveCount(0);
});

test('normal-motion bubbles retain hover after entry and range changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#investment');
  const dots = card(page).locator('[data-scatter-point]');
  await dots.first().hover();
  await expect(page.getByRole('tooltip')).toContainText('虚构创新资产');
  await card(page).getByRole('button', { name: /集中度时间范围/ }).click();
  await page.getByRole('option', { name: '全部时间', exact: true }).click();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await dots.first().hover();
  await expect(page.getByRole('tooltip')).toContainText('42.5%');
  await expect(page.getByRole('tooltip')).toContainText('+10%');
});

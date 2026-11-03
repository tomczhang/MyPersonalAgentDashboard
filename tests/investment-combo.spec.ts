import { test, expect, type Page } from '@playwright/test';
import example from '../data/examples/investment.json' with { type: 'json' };

test.beforeEach(async ({ page }) => {
  await page.route('**/api/data/*', route => route.fulfill({ json: { origin: 'example' } }));
});

const card = (page: Page) => page.locator('section').filter({ has: page.getByRole('heading', { name: '净值曲线', exact: true }) }).first();
const chart = (page: Page) => card(page).locator('section');
async function open(page: Page) {
  await page.goto('/#investment');
  await expect(card(page).locator('.recharts-bar-rectangle')).toHaveCount(13);
  await expect(chart(page)).toContainText('US$500,000');
  // The registry owns its 450ms Recharts entrance animation; capture its settled state.
  await page.waitForTimeout(800);
}
async function hoverBar(page: Page, index: number) {
  await card(page).locator('.recharts-wrapper').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const bar = card(page).locator('.recharts-bar-rectangle path').nth(index);
  await expect(bar).toBeVisible();
  const box = await bar.boundingBox();
  if (!box) throw new Error('Missing bar geometry');
  // Recharts handles pointer movement on the chart overlay, above the bar path.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}
async function hoverFirst(page: Page, value = 'US$400,000') {
  await hoverBar(page, 0);
  await expect(chart(page)).toContainText(value);
}

test('official hover readout, dimming, pulse and range/account scope', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await open(page);
  await expect(chart(page)).toContainText('+15.4%');
  await page.screenshot({ path: 'test-results/combo-1440-light.png', fullPage: true });
  await hoverFirst(page);
  await expect(chart(page)).toContainText('2025-11-01 · 收益率 0%');
  await expect(card(page).locator('path[opacity="0.3"]')).toHaveCount(12);
  await expect(card(page).locator('animate[attributeName="r"]')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/combo-1440-hover.png' });
  await page.mouse.move(0, 0);
  await expect(chart(page)).toContainText('US$500,000');
  await page.getByRole('radio', { name: '虚构证券副账户', exact: true }).click();
  await page.getByRole('radio', { name: '仅框架内', exact: true }).click();
  await expect(chart(page)).toContainText('US$500,000');
  await expect(card(page).locator('.recharts-bar-rectangle')).toHaveCount(13);
  await card(page).getByRole('radio', { name: '1M', exact: true }).click();
  await expect(card(page).locator('.recharts-bar-rectangle')).toHaveCount(2);
  await hoverFirst(page, 'US$490,000');
  await expect(chart(page)).toContainText('2026-10-01 · 收益率 0.7%');
  await page.mouse.move(0, 0);
  await page.getByRole('button', { name: '切换深浅主题' }).filter({ visible: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.screenshot({ path: 'test-results/combo-1440-dark.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('390px light/dark layout and hover without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await card(page).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/combo-390-light.png', fullPage: true });
  await card(page).screenshot({ path: 'test-results/combo-390-card-light.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await hoverFirst(page);
  await expect(chart(page)).toContainText('2025-11-01 · 收益率 0%');
  await page.screenshot({ path: 'test-results/combo-390-hover.png' });
  await page.mouse.move(0, 0);
  await page.getByRole('button', { name: '切换深浅主题' }).filter({ visible: true }).click();
  await card(page).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/combo-390-dark.png', fullPage: true });
  await card(page).screenshot({ path: 'test-results/combo-390-card-dark.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('legacy and partial rates stay missing; missing series uses existing empty state', async ({ page }) => {
  const slot = structuredClone(example) as Omit<typeof example, 'series' | 'seriesSummary'> & { series?: { date: string; value: number; changePct?: number }[]; seriesSummary?: { changePct: number } };
  await page.route('**/api/data/investment', route => {
    const fixture = JSON.parse(JSON.stringify(slot).replaceAll('示例数据', '虚构浏览器测试'));
    return route.fulfill({ json: { origin: 'local', data: { ...fixture, meta: { ...fixture.meta, status: 'draft' } } } });
  });
  delete slot.seriesSummary;
  slot.series?.forEach(point => { delete point.changePct; });
  await open(page);
  await expect(card(page).locator('.recharts-line-curve')).toHaveCount(0);
  await expect(card(page)).toContainText('槽位暂无收益率数据，仅显示净值条形。');
  await hoverFirst(page);
  await expect(chart(page)).toContainText('收益率 —');
  await expect(card(page)).toContainText('区间涨跌：—');
  slot.series![0].changePct = -2;
  slot.series![2].changePct = 0;
  await page.reload();
  await expect(card(page)).toContainText('收益率 · 平均');
  await expect(card(page)).toContainText('-1%');
  await hoverFirst(page);
  await expect(chart(page)).toContainText('收益率 -2%');
  await hoverBar(page, 1);
  await expect(chart(page)).toContainText('收益率 —');
  delete slot.series;
  await page.reload();
  await expect(card(page)).toContainText('槽位暂无序列数据');
  await expect(card(page).locator('.recharts-wrapper')).toHaveCount(0);
  slot.series = [{ date: '2020-01-01', value: 100 }];
  await page.reload();
  await expect(card(page)).toContainText('所选范围暂无序列数据');
});

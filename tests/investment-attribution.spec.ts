import { test, expect, type Page } from '@playwright/test';
import example from '../data/examples/investment.json' with { type: 'json' };

const panel = (page: Page) => page.getByRole('region', { name: '盈亏归因', exact: true });
const bars = (page: Page) => panel(page).locator('.recharts-bar-rectangle path');
test.beforeEach(async ({ page }) => {
  await page.route('**/api/data/*', route => route.fulfill({ json: { origin: 'example' } }));
});

test('signed bars use a common linear scale and filters combine supplied open and closed records', async ({ page }) => {
  const fixture = JSON.parse(JSON.stringify(example).replaceAll('示例数据', '虚构浏览器测试'));
  fixture.closedPositions = [{ symbol: 'CLOSED', pnlAmount: -30000, pnlPct: -15, accountId: 'U***0001', inFramework: true }];
  await page.route('**/api/data/investment', route => route.fulfill({ json: { origin: 'local', data: { ...fixture, meta: { ...fixture.meta, status: 'draft' } } } }));
  await page.goto('/#investment');
  await panel(page).scrollIntoViewIfNeeded();
  await expect(panel(page).getByRole('button', { name: '全部', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(panel(page).getByRole('group', { name: '盈亏归因筛选' }).locator('[aria-pressed="true"]')).toHaveCount(1);
  await expect(bars(page)).toHaveCount(4);
  // Both the axis origin and the zero-P/L row have visible zero labels.
  await expect(panel(page).locator('svg text').filter({ hasText: /^0$/ })).toHaveCount(2);
  const positive = await bars(page).first().boundingBox();
  const negative = await bars(page).last().boundingBox();
  expect(positive!.width).toBeCloseTo(negative!.width, 0);
  expect(negative!.x + negative!.width).toBeCloseTo(positive!.x, 0);
  expect(await bars(page).first().getAttribute('fill')).toBe('var(--color-chart-return-positive)');
  expect(await bars(page).last().getAttribute('fill')).toBe('var(--color-chart-attribution-loss)');
  for (const [index, negative] of [[0, false], [3, true]] as const) {
    const corners = await bars(page).nth(index).evaluate((node, negative) => {
      const path = node as SVGPathElement;
      const box = path.getBBox();
      const left = box.x + 0.5;
      const right = box.x + box.width - 0.5;
      return {
        zero: path.isPointInFill(new DOMPoint(negative ? right : left, box.y + 0.5)),
        outer: path.isPointInFill(new DOMPoint(negative ? left : right, box.y + 0.5)),
      };
    }, negative);
    expect(corners).toEqual({ zero: true, outer: false });
  }
  await bars(page).first().hover();
  const tooltip = panel(page).locator('.recharts-tooltip-wrapper');
  await expect(tooltip).toContainText('平仓状态持仓中');
  await expect(tooltip).toContainText('盈亏金额+USD 30,000.00');
  await expect(tooltip).toContainText('盈亏比例+25%');
  const popup = await tooltip.locator(':scope > div').boundingBox();
  expect(popup!.width).toBeLessThan(190);
  expect(popup!.height).toBeLessThan(125);
  for (const dark of [false, true]) {
    await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
    const annualGain = await page.getByText('+14.3%', { exact: true }).evaluate(node => getComputedStyle(node).backgroundColor);
    await expect(page.getByRole('region', { name: '基准对比', exact: true }).locator('.bg-status-lime-background')).toHaveCSS('background-color', annualGain);
    for (const [index, legendIndex] of [[0, 0], [3, 1]]) {
      await bars(page).nth(index).hover();
      const fill = await bars(page).nth(index).evaluate(node => getComputedStyle(node).fill);
      await expect(tooltip.locator('dd').nth(1)).toHaveCSS('color', fill);
      await expect(panel(page).locator('span[style*="background-color"]').nth(legendIndex)).toHaveCSS('background-color', fill);
    }
  }
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await bars(page).first().hover();
  await panel(page).screenshot({ path: 'test-results/attribution-tooltip.png' });
  const ticks = await panel(page).locator('.recharts-xAxis text').evaluateAll(nodes => nodes.map(label => {
    return { amount: Number(label.textContent!.replaceAll(',', '')), x: Number(label.getAttribute('x')) };
  }));
  for (let i = 2; i < ticks.length; i++) {
    expect(ticks[i].amount - ticks[i - 1].amount).toBe(ticks[1].amount - ticks[0].amount);
    expect(ticks[i].x - ticks[i - 1].x).toBeCloseTo(ticks[1].x - ticks[0].x, 0);
  }
  await panel(page).getByRole('button', { name: '已平仓', exact: true }).click();
  await expect(panel(page).getByRole('group', { name: '盈亏归因筛选' }).locator('[aria-pressed="true"]')).toHaveCount(1);
  await expect(panel(page).getByRole('button', { name: '全部', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(bars(page)).toHaveCount(1);
  await expect(panel(page).getByRole('table')).toContainText('CLOSED');
  await expect(panel(page).getByRole('table')).not.toContainText('DEMO-A');
  const closedBox = await bars(page).first().boundingBox();
  expect(closedBox!.width).toBeCloseTo(negative!.width, 0);
  await bars(page).first().hover();
  await expect(tooltip).toContainText('平仓状态已平仓');
  await expect(tooltip).toContainText('盈亏金额−USD 30,000.00');
  await expect(tooltip).toContainText('盈亏比例-15%');
  await panel(page).getByRole('button', { name: '持仓中', exact: true }).click();
  await expect(bars(page)).toHaveCount(3);
  await panel(page).getByRole('button', { name: '全部', exact: true }).click();
  await page.mouse.move(0, 0);
  await panel(page).screenshot({ path: 'test-results/attribution-desktop.png' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await panel(page).screenshot({ path: 'test-results/attribution-dark.png' });
  await page.getByRole('radio', { name: '虚构证券副账户', exact: true }).click();
  await expect(panel(page).getByRole('table')).not.toContainText('CLOSED');
});

test('mixed holdings expose both statuses and unavailable combined ratio', async ({ page }) => {
  const fixture = JSON.parse(JSON.stringify(example).replaceAll('示例数据', '虚构浏览器测试'));
  fixture.closedPositions = [{ symbol: 'DEMO-A', pnlAmount: -5000 }];
  await page.route('**/api/data/investment', route => route.fulfill({ json: { origin: 'local', data: { ...fixture, meta: { ...fixture.meta, status: 'draft' } } } }));
  await page.goto('/#investment');
  await bars(page).first().hover();
  const tooltip = panel(page).locator('.recharts-tooltip-wrapper');
  await expect(tooltip).toContainText('平仓状态持仓中 / 已平仓');
  await expect(tooltip).toContainText('盈亏金额+USD 25,000.00');
  await expect(tooltip).toContainText('盈亏比例—');
  await panel(page).getByRole('button', { name: '持仓中', exact: true }).click();
  await bars(page).first().hover();
  await expect(tooltip).toContainText('平仓状态持仓中');
  await expect(tooltip).toContainText('盈亏比例+25%');
});

test('missing closed data is explicit; filters support keyboard and mobile stays within the page', async ({ page }) => {
  await page.goto('/#investment');
  await expect(panel(page)).toContainText('暂无已平仓盈亏数据，当前仅展示持仓浮盈/浮亏。');
  const closed = panel(page).getByRole('button', { name: '已平仓', exact: true });
  await closed.focus();
  await closed.press('Space');
  await expect(panel(page)).toContainText('暂无已平仓盈亏数据');
  await expect(bars(page)).toHaveCount(0);
  await panel(page).getByRole('button', { name: '持仓中', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await panel(page).scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  const plot = panel(page).getByRole('region', { name: '盈亏金额条形图，可横向滚动' });
  expect(await plot.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
  await panel(page).screenshot({ path: 'test-results/attribution-mobile.png' });
});

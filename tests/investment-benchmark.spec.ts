import { test, expect, type Page } from '@playwright/test';
import example from '../data/examples/investment.json' with { type: 'json' };

const assets = (page: Page) => page.getByRole('region', { name: '资产总量与收益率', exact: true });
const benchmark = (page: Page) => page.getByRole('region', { name: '基准对比', exact: true });

test.beforeEach(async ({ page }) => {
  await page.route('**/api/data/*', route => route.fulfill({ json: { origin: 'example' } }));
});

test('combo shows balances and cumulative returns; its range is independent from benchmark', async ({ page }) => {
  await page.goto('/#investment');
  await expect(assets(page).locator('.recharts-bar-rectangle')).toHaveCount(11);
  await expect(assets(page).locator('.recharts-line-curve')).toHaveCount(2);
  await expect(assets(page).locator('.recharts-yAxis')).toHaveCount(2);
  await expect(assets(page)).toContainText('US$500,000.00');
  await expect(assets(page)).toContainText('累计收益率');
  await assets(page).scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  await assets(page).locator('.recharts-bar-rectangle').first().hover();
  await expect(assets(page)).toContainText('2026-01-01 资产总量');
  await expect(assets(page)).toContainText('US$420,000.00');
  await page.mouse.move(0, 0);
  await expect(assets(page)).toContainText('US$500,000.00');
  await assets(page).getByRole('button', { name: /资产时间范围/ }).click();
  await page.getByRole('option', { name: '近1月', exact: true }).click();
  await expect(assets(page).locator('.recharts-bar-rectangle')).toHaveCount(2);
  await expect(benchmark(page).getByRole('button', { name: /收益时间范围/ })).toContainText('本年至今');
  await expect(benchmark(page).locator('.recharts-area-curve')).toHaveCount(3);
});

for (const width of [1440, 390]) {
  test(`${width}px benchmark normalization preserves income and has a common starting point`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/#investment');
    const card = benchmark(page);
    const toggle = card.getByRole('switch', { name: '归一化（起点 100）', exact: true });
    await card.scrollIntoViewIfNeeded();
    await expect(toggle).not.toBeChecked();
    await expect(card).toContainText('US$40,000.00');
    await card.getByText('归一化（起点 100）', { exact: true }).click();
    await expect(toggle).toBeChecked();
    await page.mouse.move(0, 0);
    await expect(card).toContainText('US$40,000.00');
    await expect(card).toContainText('我的组合');
    await expect(card.locator('.recharts-area-curve')).toHaveCount(3);
    const axisTicks = await card.locator('.recharts-yAxis .recharts-cartesian-axis-tick-value').allTextContents();
    expect(Math.min(...axisTicks.map(Number))).toBeGreaterThan(90);
    expect(Math.max(...axisTicks.map(Number))).toBeLessThan(120);
    await expect(card.locator('.recharts-reference-line-line')).toHaveCount(1);
    await expect(card.locator('.recharts-area-area').first()).toHaveAttribute('fill-opacity', '0.15');
    // All series start at index 100, even when their first monthly returns differ.
    await expect.poll(async () => {
      const starts = await card.locator('.recharts-area-curve').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')?.match(/^M[^A-Za-z]+/)?.[0]));
      return new Set(starts).size;
    }).toBe(1);
    const box = await card.getByText('1月', { exact: true }).boundingBox();
    if (!box) throw new Error('Missing January tick');
    await page.mouse.move(box.x + box.width / 2, box.y - 50);
    await expect(card).toContainText('2026年01月收入');
    await expect(card).toContainText('US$5,000.00');
    await expect.poll(() => card.getByText('100', { exact: true }).count()).toBeGreaterThanOrEqual(3);
    await page.mouse.move(0, 0);
    await card.getByText('归一化（起点 100）', { exact: true }).click();
    await expect(toggle).not.toBeChecked();
    await expect(card).toContainText('我的累计收益率');
    await page.getByRole('button', { name: '切换深浅主题' }).filter({ visible: true }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(errors).toEqual([]);
  });
}

test('missing monthly data does not invent comparison series or normalized indices', async ({ page }) => {
  const slot = { ...structuredClone(example), returnComparison: [], monthlyReturns: [] };
  await page.route('**/api/data/investment', route => {
    const fixture = JSON.parse(JSON.stringify(slot).replaceAll('示例数据', '虚构浏览器测试'));
    return route.fulfill({ json: { origin: 'local', data: { ...fixture, meta: { ...fixture.meta, status: 'draft' } } } });
  });
  await page.goto('/#investment');
  await expect(assets(page).locator('.recharts-bar-rectangle')).toHaveCount(11);
  await expect(benchmark(page)).toContainText('所选范围暂无收益数据');
  await benchmark(page).getByText('归一化（起点 100）', { exact: true }).click();
  await expect(benchmark(page).locator('.recharts-area-curve')).toHaveCount(0);
  await expect(benchmark(page)).toContainText('US$40,000.00');
});

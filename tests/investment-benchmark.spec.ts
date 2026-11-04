import { test, expect, type Page } from '@playwright/test';
import example from '../data/examples/investment.json' with { type: 'json' };

const card = (page: Page) => page.locator('section').filter({ has: page.getByRole('heading', { name: '基准对比', exact: true }) }).first();
const chart = (page: Page) => card(page).locator('section');
const headline = (page: Page) => chart(page).locator('.animate-number-fade');

test.beforeEach(async ({ page }) => {
  // Force public fixtures so screenshot runs never read private local slots.
  await page.route('**/api/data/*', route => route.fulfill({ json: { origin: 'example' } }));
});

async function open(page: Page) {
  await page.goto('/#investment');
  await expect(card(page).locator('.recharts-area-curve')).toHaveCount(2);
  await card(page).scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(headline(page)).toHaveText('120');
  await page.waitForTimeout(800);
}

async function hoverFirst(page: Page) {
  const tick = chart(page).getByText('2025-11-01', { exact: true });
  const position = await tick.evaluate(node => {
    const text = node.closest('text') as SVGTextElement;
    const point = new DOMPoint(Number(text.getAttribute('x')), Number(text.getAttribute('y'))).matrixTransform(text.getScreenCTM()!);
    return { x: point.x + 1, y: point.y - 60 };
  });
  await page.mouse.move(position.x, position.y);
  await expect(chart(page)).toContainText('2025-11-01');
  await expect(headline(page)).toHaveText('100');
  await expect(chart(page).getByText('100', { exact: true })).toHaveCount(3);
  await expect(card(page).locator('.recharts-active-dot')).toHaveCount(2);
}

for (const width of [1440, 390]) {
  test(`${width}px native overlap, hover, filter scope and light/dark screenshots`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await open(page);
    await expect(chart(page)).toContainText(example.benchmarkSeries.benchmarkLabel);
    const curves = await card(page).locator('.recharts-area-curve').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')));
    // Equal normalized bases must share the same Y, which would fail for stacked areas.
    expect(curves[0]?.match(/^M[^A-Za-z]+/)?.[0]).toEqual(curves[1]?.match(/^M[^A-Za-z]+/)?.[0]);
    expect(curves[0]).not.toEqual(curves[1]);
    await page.screenshot({ path: `test-results/benchmark-${width}-light.png` });
    await card(page).screenshot({ path: `test-results/benchmark-${width}-card-light.png` });
    await hoverFirst(page);
    await card(page).screenshot({ path: `test-results/benchmark-${width}-hover.png` });
    await page.mouse.move(0, 0);
    await expect(headline(page)).toHaveText('120');
    if (width === 1440) {
      await page.getByRole('radio', { name: '虚构证券副账户', exact: true }).click();
      await page.getByRole('radio', { name: '仅框架内', exact: true }).click();
      await page.getByRole('button', { name: /收益时间范围/ }).click();
      await page.getByRole('option', { name: '近1月', exact: true }).click();
      await card(page).scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      await expect(headline(page)).toHaveText('120');
      await expect(card(page).locator('.recharts-area-curve')).toHaveCount(2);
      await hoverFirst(page);
    }
    await page.mouse.move(0, 0);
    await page.getByRole('button', { name: '切换深浅主题' }).filter({ visible: true }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await card(page).scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `test-results/benchmark-${width}-dark.png` });
    await card(page).screenshot({ path: `test-results/benchmark-${width}-card-dark.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(errors).toEqual([]);
  });
}

test('missing, empty and single-point slots hide the complete card; two points render it', async ({ page }) => {
  const slot: Omit<typeof example, 'benchmarkSeries'> & { benchmarkSeries?: typeof example.benchmarkSeries } = structuredClone(example);
  await page.route('**/api/data/investment', route => {
    const fixture = JSON.parse(JSON.stringify(slot).replaceAll('示例数据', '虚构浏览器测试'));
    return route.fulfill({ json: { origin: 'local', data: { ...fixture, meta: { ...fixture.meta, status: 'draft' } } } });
  });
  for (const points of [undefined, [], example.benchmarkSeries.points.slice(0, 1), example.benchmarkSeries.points.slice(0, 2)]) {
    slot.benchmarkSeries = points ? { benchmarkLabel: '虚构替代基准', points } : undefined;
    await page.goto('/#investment');
    await page.reload();
    await expect(page.getByRole('region', { name: '收入与收益率', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '基准对比', exact: true })).toHaveCount(points?.length === 2 ? 1 : 0);
  }
  await expect(chart(page)).toContainText('虚构替代基准');
  await expect(card(page).locator('.recharts-area-curve')).toHaveCount(2);
});

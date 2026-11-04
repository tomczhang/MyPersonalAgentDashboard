import { test, expect, type Locator, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/data/*', route => route.fulfill({ json: { origin: 'example' } }));
});
const card = (page: Page) => page.getByRole('region', { name: '基准对比', exact: true });
const ring = (page: Page) => page.getByRole('region', { name: '资产分布', exact: true });
const dimensionSelect = (page: Page) => ring(page).getByRole('button', { name: /资产分布视角/ });
async function selectDimension(page: Page, label: string) {
  await dimensionSelect(page).scrollIntoViewIfNeeded();
  await dimensionSelect(page).click();
  await page.getByRole('option', { name: label, exact: true }).click();
  await expect(page.getByRole('listbox', { name: '资产分布视角', exact: true })).toBeHidden();
  await expect(dimensionSelect(page)).toContainText(label);
  // Closing the overlay can leave the pointer over a ring slice underneath it.
  await dimensionSelect(page).hover();
}

async function slicePoint(slice: Locator) {
  await slice.scrollIntoViewIfNeeded();
  let point: { x: number; y: number } | null = null;
  await expect.poll(async () => {
    point = await slice.locator('path').first().evaluate(node => {
      const bounds = node.getBoundingClientRect();
      for (let x = bounds.x + 5; x < bounds.right; x += 5) {
        for (let y = bounds.y + 5; y < bounds.bottom; y += 5) {
          if (document.elementFromPoint(x, y) === node) return { x, y };
        }
      }
      return null;
    });
    return point !== null;
  }).toBe(true);
  return point!;
}

test('area comparison shows annual income, monthly hover and all four ranges', async ({ page }) => {
  await page.goto('/#investment');
  await expect(card(page).locator('.recharts-area-curve')).toHaveCount(3);
  await expect(card(page).getByRole('button', { name: /收益时间范围/ })).toContainText('本年至今');
  await expect(card(page)).toContainText('US$40,000.00');
  await card(page).scrollIntoViewIfNeeded();
  const tick = card(page).getByText('1月', { exact: true });
  const box = await tick.boundingBox();
  if (!box) throw new Error('Missing first month tick');
  await page.mouse.move(box.x + box.width / 2, box.y - 50);
  await expect(card(page)).toContainText('2026年01月收入');
  await expect(card(page)).toContainText('US$5,000.00');
  await expect(card(page)).toContainText('1.2%');
  await expect(card(page)).toContainText('1.8%');
  await page.mouse.move(0, 0);
  await expect(card(page)).toContainText('2026 收入');
  await expect(card(page)).toContainText('US$40,000.00');
  for (const label of ['近1月', '近1年', '全部', '本年至今']) {
    await card(page).getByRole('button', { name: /收益时间范围/ }).click();
    await page.getByRole('option', { name: label, exact: true }).click();
    await expect(page.getByRole('listbox', { name: '收益时间范围', exact: true })).toBeHidden();
    await expect(card(page).getByRole('button', { name: /收益时间范围/ })).toContainText(label);
    await expect(card(page)).toContainText('US$40,000.00');
  }
});

test('ring slices highlight on hover, show name and values, and support keyboard focus without a legend', async ({ page }) => {
  await page.goto('/#investment');
  const slice = ring(page).getByRole('button', { name: '虚构稳健资产 30%', exact: true });
  await expect(ring(page).locator('path[fill="transparent"]')).toHaveCount(5);
  // A crescent's bounding-box centre is in the empty hole. Hover its stationary target.
  await expect(slice).toBeVisible();
  await expect(ring(page).getByRole('list')).toHaveCount(0);
  const point = await slicePoint(slice);
  await page.mouse.move(point.x, point.y);
  await expect(slice).toHaveAttribute('aria-pressed', 'true');
  await expect(ring(page).locator('[aria-live]')).toHaveText('虚构稳健资产：30% · US$150,000.00');
  await expect(ring(page).locator('[data-distribution-readout] [aria-hidden="true"]')).toHaveText('虚构稳健资产30%US$150,000.00');
  await expect.poll(() => slice.locator('g').evaluate(node => getComputedStyle(node).transform)).not.toBe('matrix(1, 0, 0, 1, 0, 0)');
  await page.getByRole('heading', { name: '股票 Dashboard', exact: true }).hover();
  await expect(ring(page).locator('[aria-live]')).toContainText('总资产');
  await slice.focus();
  await expect(ring(page).locator('[aria-live]')).toHaveText('虚构稳健资产：30% · US$150,000.00');
  await slice.press('Escape');
  await expect(ring(page).locator('[aria-live]')).toContainText('总资产');
  const cash = await slicePoint(ring(page).getByRole('button', { name: '现金 20%', exact: true }));
  await page.mouse.move(cash.x, cash.y);
  await expect(ring(page).locator('[aria-live]')).toHaveText('现金：20% · US$100,000.00');
  await expect(ring(page).locator('[data-distribution-readout] [aria-hidden="true"]')).toHaveText('现金20%US$100,000.00');
  await page.getByRole('radio', { name: '虚构证券副账户', exact: true }).click();
  await expect(ring(page).locator('[aria-live]')).toHaveText('总资产：100% · US$200,000.00');
  await expect(ring(page).getByRole('button', { name: '虚构稳健资产 30%' })).toHaveCount(0);
});

test('distribution dimensions regroup assets and retain the selected dimension across account filters', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#investment');
  await expect(dimensionSelect(page)).toContainText('持仓');
  for (const [label, sliceName] of [['类型', '股票 50%'], ['行业', '科技 40%'], ['账户', '虚构证券主账户 60%'], ['货币', 'USD 100%']]) {
    await selectDimension(page, label);
    await expect(ring(page).getByRole('button', { name: sliceName, exact: true })).toBeVisible();
    await expect(ring(page).locator('[aria-live]')).toHaveText('总资产：100% · US$500,000.00');
  }
  await selectDimension(page, '账户');
  await page.getByRole('radio', { name: '虚构证券副账户', exact: true }).click();
  await expect(dimensionSelect(page)).toContainText('账户');
  const slice = ring(page).getByRole('button', { name: '虚构证券副账户 100%', exact: true });
  const point = await slicePoint(slice);
  await page.mouse.move(point.x, point.y);
  await expect(ring(page).locator('[aria-live]')).toHaveText('虚构证券副账户：100% · US$200,000.00');
  await expect(slice).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => slice.locator('g').evaluate(node => getComputedStyle(node).transform)).toBe('matrix(1, 0, 0, 1, 0, 0)');
  await selectDimension(page, '持仓');
  await expect(ring(page).locator('[aria-live]')).toHaveText('总资产：100% · US$200,000.00');
  await expect(ring(page).getByRole('button', { name: '现金 20%', exact: true })).toBeVisible();
});

test('compact KPI cards show comparable changes, preserve year switching and clear unmatched comparisons', async ({ page }) => {
  await page.goto('/#investment');
  const total = page.getByRole('region', { name: '组合总值', exact: true });
  const cash = page.getByRole('region', { name: '现金占比', exact: true });
  const income = page.getByRole('region', { name: '2026 收益', exact: true });
  const concentration = page.getByRole('region', { name: '集中度', exact: true });
  await expect(page.getByText('变化比例 · 较上期快照 2026-10-01', { exact: true })).toBeVisible();
  for (const [card, change] of [[total, '+4.2%'], [cash, '-9.1%'], [income, '+14.3%'], [concentration, '+2.9%']] as const) {
    await expect(card.getByLabel(/较上期快照/)).toHaveText(change);
    expect((await card.boundingBox())!.height).toBeLessThan(150);
  }
  await income.getByRole('button', { name: /KPI 收益年份/ }).scrollIntoViewIfNeeded();
  await income.getByRole('button', { name: /KPI 收益年份/ }).click();
  await page.getByRole('option', { name: '2025 年', exact: true }).click();
  await expect(page.getByRole('region', { name: '2025 收益', exact: true }).getByLabel(/较上期快照/)).toHaveText('0.0%');
  await page.getByRole('radio', { name: '虚构证券副账户', exact: true }).click();
  await expect(total).toContainText('US$200,000');
  await expect(total.getByLabel('暂无可比变化比例', { exact: true })).toHaveText('—');
  await expect(cash.getByLabel('暂无可比变化比例', { exact: true })).toHaveText('—');
  await expect(page.getByText('变化比例 · 暂无可比历史快照', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('mobile reduced-motion view has three areas, usable ring and no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#investment');
  await expect(card(page).locator('.recharts-area-curve')).toHaveCount(3);
  await expect(ring(page).locator('path[fill="transparent"]')).toHaveCount(5);
  await expect(ring(page).getByRole('radio')).toHaveCount(0);
  await selectDimension(page, '行业');
  await selectDimension(page, '持仓');
  const cash = await slicePoint(ring(page).getByRole('button', { name: '现金 20%', exact: true }));
  await page.mouse.click(cash.x, cash.y);
  await expect(ring(page).locator('[aria-live]')).toHaveText('现金：20% · US$100,000.00');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole('button', { name: '切换深浅主题' }).filter({ visible: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

import { test, expect, type Locator, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/data/*', route => route.fulfill({ json: { origin: 'example' } }));
});
const card = (page: Page) => page.getByRole('region', { name: '收入与收益率', exact: true });
const ring = (page: Page) => page.getByRole('region', { name: '资产分布', exact: true });

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

test('mobile reduced-motion view has three areas, usable ring and no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#investment');
  await expect(card(page).locator('.recharts-area-curve')).toHaveCount(3);
  await expect(ring(page).locator('path[fill="transparent"]')).toHaveCount(5);
  const cash = await slicePoint(ring(page).getByRole('button', { name: '现金 20%', exact: true }));
  await page.mouse.click(cash.x, cash.y);
  await expect(ring(page).locator('[aria-live]')).toHaveText('现金：20% · US$100,000.00');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole('button', { name: '切换深浅主题' }).filter({ visible: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

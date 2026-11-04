import { test, expect, type Page } from '@playwright/test';
import example from '../data/examples/investment.json' with { type: 'json' };

const table = (page: Page) => page.getByRole('grid', { name: '投资持仓明细', exact: true });
const symbols = (page: Page) => table(page).getByRole('rowheader').locator('bdi[dir="ltr"]').allTextContents();
test.beforeEach(async ({ page }) => {
  await page.route('**/api/data/*', route => route.fulfill({ json: { origin: 'example' } }));
});

test('all seven columns sort in both directions; missing values stay last and search preserves allocation', async ({ page }) => {
  const fixture = JSON.parse(JSON.stringify(example).replaceAll('示例数据', '虚构浏览器测试'));
  fixture.positions[0].qty.value = 300;
  fixture.positions[1].qty.value = 20;
  fixture.positions[2].qty.value = 1000;
  fixture.positions[3].qty.value = 0;
  fixture.positions[0].totalReturn = 35000;
  fixture.positions[0].totalReturnPct = 5;
  // Ratios intentionally sort differently from amounts.
  fixture.positions[0].pnlPct = 5;
  fixture.positions[1].totalReturn = -5000;
  fixture.positions[2].totalReturn = 0;
  fixture.positions[2].totalReturnPct = 0;
  fixture.positions[3].totalReturnPct = 10;
  delete fixture.positions[3].buyInPerShare;
  await page.route('**/api/data/investment', route => route.fulfill({ json: { origin: 'local', data: { ...fixture, meta: { ...fixture.meta, status: 'draft' } } } }));
  await page.goto('/#investment');
  await expect(table(page).getByRole('columnheader')).toHaveCount(7);
  const a = table(page).getByRole('row', { name: /DEMO-A/ });
  await expect(a.locator('td:nth-child(5) > div > span')).toHaveText(['+US$30,000.00', '+5%']);
  await expect(a.locator('td:nth-child(6) > div > span')).toHaveText(['+US$35,000.00', '+5%']);
  await expect(table(page).getByRole('row', { name: /DEMO-B/ }).locator('td:nth-child(6) > div > span')).toHaveText(['-US$5,000.00', '—']);
  await expect(table(page).getByRole('row', { name: /DEMO-C/ }).locator('td:nth-child(6) > div > span')).toHaveText(['US$0.00', '0%']);
  await expect(table(page).getByRole('row', { name: /DEMO-D/ }).locator('td:nth-child(6) > div > span')).toHaveText(['—', '+10%']);
  await expect(a.getByRole('meter')).toHaveAttribute('aria-valuenow', '30');
  const orders = [
    ['股票代码', ['DEMO-A', 'DEMO-B', 'DEMO-C', 'DEMO-D'], ['DEMO-D', 'DEMO-C', 'DEMO-B', 'DEMO-A']],
    ['持仓股数', ['DEMO-D', 'DEMO-B', 'DEMO-A', 'DEMO-C'], ['DEMO-C', 'DEMO-A', 'DEMO-B', 'DEMO-D']],
    ['平均成本', ['DEMO-B', 'DEMO-C', 'DEMO-A', 'DEMO-D'], ['DEMO-A', 'DEMO-B', 'DEMO-C', 'DEMO-D']],
    ['价值', ['DEMO-D', 'DEMO-B', 'DEMO-C', 'DEMO-A'], ['DEMO-A', 'DEMO-C', 'DEMO-B', 'DEMO-D']],
    ['浮盈/浮亏', ['DEMO-B', 'DEMO-D', 'DEMO-C', 'DEMO-A'], ['DEMO-A', 'DEMO-C', 'DEMO-D', 'DEMO-B']],
    ['总回报', ['DEMO-B', 'DEMO-C', 'DEMO-A', 'DEMO-D'], ['DEMO-A', 'DEMO-C', 'DEMO-B', 'DEMO-D']],
    ['资产配置占比', ['DEMO-D', 'DEMO-B', 'DEMO-C', 'DEMO-A'], ['DEMO-A', 'DEMO-C', 'DEMO-B', 'DEMO-D']],
  ] as const;
  for (const [name, asc, desc] of orders) {
    const header = table(page).getByRole('columnheader', { name: new RegExp(name) });
    if (await header.getAttribute('aria-sort') !== 'ascending') await header.click();
    await expect(header).toHaveAttribute('aria-sort', 'ascending');
    await expect.poll(() => symbols(page)).toEqual([...asc]);
    await header.click();
    await expect(header).toHaveAttribute('aria-sort', 'descending');
    await expect.poll(() => symbols(page)).toEqual([...desc]);
  }
  const search = page.getByRole('textbox', { name: '搜索持仓' });
  await search.fill(' demo-b ');
  await expect.poll(() => symbols(page)).toEqual(['DEMO-B']);
  await expect(table(page).locator('tbody tr')).toContainText('18%');
  await expect(table(page).getByRole('meter')).toHaveAttribute('aria-valuenow', '18');
  await search.fill('创新');
  await expect.poll(() => symbols(page)).toEqual(['DEMO-C']);
  await search.fill('no-match');
  await expect(table(page)).toContainText('没有匹配的持仓');
  await search.fill('');
  await expect(table(page).locator('tbody tr')).toHaveCount(4);
  await page.getByRole('radio', { name: '虚构证券副账户', exact: true }).click();
  await expect.poll(() => symbols(page)).toEqual(['DEMO-C', 'DEMO-D']);
  await expect(table(page).locator('tbody tr').first()).toContainText('55%');
  expect(Number(await table(page).getByRole('meter', { name: 'DEMO-C 资产配置占比' }).getAttribute('aria-valuenow'))).toBeCloseTo(55);
});

test('responsive seven-column table stays inside the page, with keyboard sorting and unknown returns', async ({ page }) => {
  await page.goto('/#investment');
  await expect(table(page).locator('tbody tr td:nth-child(6) > div > span')).toHaveText(Array(8).fill('—'));
  const header = table(page).getByRole('columnheader', { name: /价值/ });
  await header.focus();
  await header.press('Enter');
  await expect(header).toHaveAttribute('aria-sort', 'ascending');
  await page.getByRole('region', { name: '持仓明细', exact: true }).screenshot({ path: 'test-results/holdings-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  expect(await table(page).locator('..').evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
  await expect(table(page).getByRole('columnheader')).toHaveCount(7);
  await page.getByRole('textbox', { name: '搜索持仓' }).fill('DEMO-A');
  await expect.poll(() => symbols(page)).toEqual(['DEMO-A']);
});

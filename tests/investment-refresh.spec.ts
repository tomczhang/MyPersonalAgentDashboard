import { test, expect, type Page } from '@playwright/test';
import example from '../data/examples/investment.json' with { type: 'json' };

const concentration = (page: Page) => page.locator('section').filter({ has: page.getByRole('heading', { name: '集中度', exact: true }) }).last();

test('concentration uses sorted current holdings, excludes cash, and follows both filters', async ({ page }) => {
  await page.goto('/#investment');
  await expect(concentration(page)).toContainText('87.5%');
  await page.getByRole('radio', { name: '仅框架内', exact: true }).click();
  await expect(concentration(page)).toContainText('100%');
  await page.getByRole('radio', { name: '虚构证券副账户', exact: true }).click();
  await expect(concentration(page)).toContainText('100%');
  await expect(page.getByRole('grid', { name: '投资持仓明细' })).toContainText('DEMO-C');
  await expect(page.getByRole('grid', { name: '投资持仓明细' })).not.toContainText('DEMO-D');
  await expect(page.getByRole('grid', { name: '触发与观察名单' }).getByRole('row')).toHaveCount(5);
  await expect(page.getByRole('heading', { name: '已收分红', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '框架缺口合计', exact: true })).toHaveCount(0);
  await expect(page.locator('footer')).toContainText('集中度为前三大持仓市值');
});

test('empty holdings and missing attribution never present a fabricated concentration', async ({ page }) => {
  const slot = structuredClone(example);
  slot.positions = [];
  await page.route('**/api/data/investment', route => {
    const fixture = JSON.parse(JSON.stringify(slot).replaceAll('示例数据', '虚构浏览器测试'));
    return route.fulfill({ json: { origin: 'local', data: { ...fixture, meta: { ...fixture.meta, status: 'draft' } } } });
  });
  await page.goto('/#investment');
  await expect(concentration(page).locator('.tabular-nums')).toHaveText('—');
  slot.positions = structuredClone(example.positions);
  Reflect.deleteProperty(slot.positions[0], 'accountId');
  await page.reload();
  await page.getByRole('radio', { name: '虚构证券主账户', exact: true }).click();
  await expect(concentration(page).locator('.tabular-nums')).toHaveText('—');
  await expect(page.getByRole('status')).toContainText('槽位缺少账户或框架归属');
});

import { test, expect, type Page } from '@playwright/test';
import example from '../data/examples/investment.json' with { type: 'json' };

const panel = (page: Page) => page.locator('section').filter({ has: page.getByRole('heading', { name: '触发 / 观察名单', exact: true }) }).first();
const cards = (page: Page) => page.getByRole('list', { name: '触发与观察名单', exact: true }).getByRole('button');

test.beforeEach(async ({ page }) => {
  await page.route('**/api/data/*', route => route.fulfill({ json: { origin: 'example' } }));
});

for (const width of [1440, 390]) {
  test(`${width}px card faces and full ladder in light and dark`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, deviceScaleFactor: 1, hasTouch: width === 390, isMobile: width === 390 });
    const page = await context.newPage();
    await page.route('**/api/data/*', route => route.fulfill({ json: { origin: 'example' } }));
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/#investment');
    await expect(cards(page)).toHaveCount(4);
    await panel(page).scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await expect(cards(page).nth(0)).toContainText('已触发 · 二级');
    await expect(cards(page).nth(1)).toContainText('已触发 · 一级');
    await expect(cards(page).nth(2)).toContainText('一级待触发');
    await expect(cards(page).nth(3)).not.toContainText('距下一节点');
    const boxes = await cards(page).evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y }; }));
    expect(boxes[0].y === boxes[1].y).toBe(width === 1440);
    await page.screenshot({ path: `test-results/watchlist-${width}-light.png` });
    await panel(page).screenshot({ path: `test-results/watchlist-${width}-faces-light.png` });
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') {
        await page.getByRole('button', { name: '切换深浅主题' }).filter({ visible: true }).click();
        await expect(page.locator('html')).toHaveClass(/dark/);
        await panel(page).scrollIntoViewIfNeeded();
        await page.mouse.move(0, 0);
        await panel(page).screenshot({ path: `test-results/watchlist-${width}-faces-dark.png` });
      }
      if (width === 390) await cards(page).first().tap();
      else await cards(page).first().hover();
      const ladder = width === 390 ? page.getByRole('region', { name: 'DEMO-A 触发梯子' }) : page.getByRole('tooltip');
      await expect(ladder).toBeVisible();
      await expect(ladder.getByRole('listitem')).toHaveCount(4);
      for (const label of ['一级', '二级', '三级', '四级', '已触发 ✓', '下一个', '待触发', '虚构阈值，仅作展示。', 'US$180.00']) await expect(ladder).toContainText(label);
      await cards(page).first().scrollIntoViewIfNeeded();
      await expect(ladder).toHaveCSS('opacity', '1');
      await expect(ladder).toHaveCSS('filter', 'none');
      await page.screenshot({ path: `test-results/watchlist-${width}-expanded-${theme}.png`, animations: 'disabled' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      if (width === 390) {
        await expect(cards(page).first()).toHaveAttribute('aria-expanded', 'true');
        await cards(page).first().tap();
        await expect(ladder).toHaveCount(0);
      } else {
        await page.mouse.move(0, 0);
        await expect(ladder).toHaveCount(0);
      }
    }
    expect(errors).toEqual([]);
    await context.close();
  });
}

test('keyboard focus, Escape, click expansion and all five levels', async ({ page }) => {
  await page.goto('/#investment');
  await cards(page).first().focus();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(1)).toBeFocused();
  await expect(page.getByRole('tooltip').getByRole('listitem')).toHaveCount(3);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tooltip').getByRole('listitem')).toHaveCount(5);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await expect(cards(page).nth(2)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('region', { name: 'DEMO-C 触发梯子' }).getByRole('listitem')).toHaveCount(5);
  await page.keyboard.press('Escape');
  await expect(cards(page).nth(2)).toHaveAttribute('aria-expanded', 'false');
});

test('missing and empty watchlists hide the whole panel', async ({ page }) => {
  for (const watchlist of [undefined, []]) {
    const fixture = JSON.parse(JSON.stringify({ ...example, watchlist }).replaceAll('示例数据', '虚构浏览器测试'));
    await page.route('**/api/data/investment', route => route.fulfill({ json: { origin: 'local', data: { ...fixture, meta: { ...fixture.meta, status: 'draft' } } } }));
    await page.goto('/#investment');
    await page.reload();
    await expect(page.getByRole('heading', { name: '持仓明细', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '触发 / 观察名单', exact: true })).toHaveCount(0);
    await expect(cards(page)).toHaveCount(0);
  }
});

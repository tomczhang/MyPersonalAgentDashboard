import { test, expect, type Page } from '@playwright/test';
import example from '../data/examples/investment.json' with { type: 'json' };

const panel = (page: Page) => page.locator('section').filter({ has: page.getByRole('heading', { name: '触发 / 观察名单', exact: true }) }).first();
const cards = (page: Page) => page.getByRole('list', { name: '触发与观察名单', exact: true }).getByRole('button');
const ladder = (page: Page, symbol = 'DEMO-A') => page.getByRole('region', { name: `${symbol} 触发梯子`, exact: true });

test.beforeEach(async ({ page }) => {
  await page.route('**/api/data/*', route => route.fulfill({ json: { origin: 'example' } }));
});

for (const width of [1440, 390]) {
  test(`${width}px native cards and expansion in light and dark`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, deviceScaleFactor: 1, hasTouch: width === 390, isMobile: width === 390 });
    const page = await context.newPage();
    await page.route('**/api/data/*', route => route.fulfill({ json: { origin: 'example' } }));
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/#investment');
    await expect(cards(page)).toHaveCount(4);
    await page.evaluate(() => document.fonts.ready);
    for (const [index, item] of example.watchlist.entries()) {
      const card = cards(page).nth(index);
      const count = item.levels.filter(node => node.status === 'triggered').length;
      const readout = card.getByText(`已触发 ${count}/${item.levels.length}`, { exact: true });
      await expect(readout).toBeVisible();
      await expect(card).not.toContainText(item.symbol);
      await expect(card).not.toContainText(/共.*级/);
      const titleBox = await card.getByText(item.name, { exact: true }).boundingBox();
      const readoutBox = await readout.boundingBox();
      expect(readoutBox!.x).toBeGreaterThan(titleBox!.x + titleBox!.width);
      expect(Math.abs(readoutBox!.y + readoutBox!.height / 2 - titleBox!.y - titleBox!.height / 2)).toBeLessThan(2);
    }
    await expect(panel(page)).toContainText('全部节点已触发');
    await expect(panel(page)).toContainText('缺少区间');
    const boxes = await cards(page).evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y }; }));
    expect(boxes[0].y === boxes[1].y).toBe(width === 1440);
    // The full gradient always spans the track; only its clip changes with completion.
    for (const [index, item] of example.watchlist.entries()) {
      const bar = cards(page).nth(index).locator('xpath=..').getByRole('progressbar');
      const count = item.levels.filter(node => node.status === 'triggered').length;
      await expect(bar).toHaveAttribute('aria-valuenow', String(count));
      await expect(bar).toHaveAttribute('aria-valuemax', String(item.levels.length));
      const geometry = await bar.evaluate(node => {
        const fill = node.querySelector('div')!;
        return { width: node.getBoundingClientRect().width, fillWidth: fill.getBoundingClientRect().width, clip: getComputedStyle(fill).clipPath,
          ticks: [...node.querySelectorAll('span')].map(tick => tick.getBoundingClientRect().x - node.getBoundingClientRect().x) };
      });
      expect(geometry.fillWidth).toBe(geometry.width);
      const rightClip = Number(geometry.clip.match(/inset\(0px ([\d.]+)%/)![1]);
      expect(rightClip).toBeCloseTo((1 - count / item.levels.length) * 100, 3);
      expect(geometry.ticks).toHaveLength(item.levels.length - 1);
      geometry.ticks.forEach((x, i) => expect(x).toBeCloseTo(geometry.width * (i + 1) / item.levels.length, 1));
    }
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') {
        await page.getByRole('button', { name: '切换深浅主题' }).filter({ visible: true }).click();
        await expect(page.locator('html')).toHaveClass(/dark/);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `test-results/boardui-${width}-shell-${theme}.png`, animations: 'disabled' });
      await panel(page).screenshot({ path: `test-results/watchlist-${width}-faces-${theme}.png` });
      if (width === 390) await cards(page).first().tap();
      else {
        await cards(page).first().hover();
        await expect(page.getByRole('tooltip')).toHaveCount(0);
        await expect(ladder(page)).toHaveCount(0);
        await cards(page).first().click();
      }
      await expect(ladder(page)).toBeVisible();
      await expect(cards(page).first()).toHaveAttribute('aria-expanded', 'true');
      const controlId = await cards(page).first().getAttribute('aria-controls');
      await expect(ladder(page)).toHaveAttribute('id', controlId!);
      for (const label of ['待触发', 'US$180.00', '1,000 股']) await expect(ladder(page)).toContainText(label);
      await expect(ladder(page)).not.toContainText('下一个');
      await expect(ladder(page)).not.toContainText('已触发');
      await expect(ladder(page)).not.toContainText(/一级|二级|三级|四级|虚构阈值|虚构分级观察节点/);
      const rows = ladder(page).locator(':scope > div > div');
      await expect(rows).toHaveCount(4);
      for (const [index, node] of example.watchlist[0].levels.entries()) {
        const columns = rows.nth(index).locator(':scope > span');
        await expect(columns).toHaveCount(4);
        await expect(columns.nth(1)).toHaveText(`US$${node.price.toFixed(2)}`);
        await expect(columns.nth(2)).toHaveText(`${node.shares.toLocaleString('en-US')} 股`);
        const badge = columns.nth(3).locator(':scope > span');
        await expect(badge).toHaveClass(/rounded-full/);
        await expect(badge).toHaveClass(node.status === 'triggered' ? /bg-chart-7\/20/ : /bg-badge-neutral-background/);
        await expect(badge.locator('[aria-hidden]')).toHaveCount(node.status === 'triggered' ? 1 : 0);
        if (node.status === 'triggered') {
          await expect(badge).toHaveText('✓');
          await expect(badge).toHaveAttribute('aria-label', '已触发');
          await expect(badge).toHaveAccessibleName('已触发');
        } else {
          await expect(badge).toHaveText('待触发');
        }
        const color = await page.evaluate(({ index, triggered }) => {
          const probe = document.createElement('span');
          probe.style.backgroundColor = triggered
            ? `color-mix(in oklab, color-mix(in oklab, var(--color-chart-7) 40%, var(--color-text-white)), var(--color-chart-7-active) ${(index + 0.5) / 4 * 100}%)`
            : 'var(--color-chart-track)';
          document.body.append(probe);
          const color = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return color;
        }, { index, triggered: node.status === 'triggered' });
        await expect(columns.first()).toHaveCSS('background-color', color);
      }
      await expect(cards(page).first().locator('xpath=..')).toContainText('下一节点 US$160.00 · 参考价 US$150.00');
      await expect(ladder(page)).toHaveCSS('opacity', '1');
      await expect(ladder(page)).toHaveCSS('filter', 'none');
      await page.mouse.move(0, 0);
      await page.screenshot({ path: `test-results/watchlist-${width}-expanded-${theme}.png`, animations: 'disabled' });
      await panel(page).screenshot({ path: `test-results/watchlist-${width}-panel-expanded-${theme}.png`, animations: 'disabled' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      if (width === 390) await cards(page).first().tap();
      else await cards(page).first().click();
      await expect(ladder(page)).toHaveCount(0);
    }
    expect(errors).toEqual([]);
    await context.close();
  });
}

test('keyboard Enter and Space toggle the same native button without hover tooltips', async ({ page }) => {
  await page.goto('/#investment');
  await cards(page).first().focus();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(1)).toBeFocused();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(ladder(page, 'DEMO-E').locator(':scope > div > div')).toHaveCount(3);
  await page.keyboard.press('Space');
  await expect(ladder(page, 'DEMO-E')).toHaveCount(0);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await expect(cards(page).nth(2)).toHaveAttribute('aria-expanded', 'true');
  await expect(ladder(page, 'DEMO-C').locator(':scope > div > div')).toHaveCount(5);
  await page.keyboard.press('Enter');
  await expect(cards(page).nth(2)).toHaveAttribute('aria-expanded', 'false');
});

test('missing shares display a dash, zero stays visible, and equal prices keep distinct rows', async ({ page }) => {
  const fixture = JSON.parse(JSON.stringify(example).replaceAll('示例数据', '虚构浏览器测试'));
  delete fixture.watchlist[0].levels[0].shares;
  fixture.watchlist[0].levels[1].shares = 0;
  fixture.watchlist[0].levels[1].price = fixture.watchlist[0].levels[0].price;
  await page.route('**/api/data/investment', route => route.fulfill({ json: { origin: 'local', data: { ...fixture, meta: { ...fixture.meta, status: 'draft' } } } }));
  await page.goto('/#investment');
  await cards(page).first().click();
  const rows = ladder(page).locator(':scope > div > div');
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(0).locator(':scope > span').nth(2)).toHaveText('—');
  await expect(rows.nth(1).locator(':scope > span').nth(2)).toHaveText('0 股');
  await expect(rows.nth(0)).toContainText('US$140.00');
  await expect(rows.nth(1)).toContainText('US$140.00');
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

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InvestmentMonthlyReturns, monthlyReturnsData } from '@/components/investment-monthly-returns';
import type { Investment } from '@/data/investment-view';

const row = (year: number, values: (number | null)[]) => ({ year, months: [...values, ...Array<null>(12 - values.length).fill(null)] });
const render = (data?: Investment['monthlyReturns']) => renderToStaticMarkup(createElement(InvestmentMonthlyReturns, { data }));

describe('monthly returns matrix', () => {
  it('uses one absolute maximum across years and the same four boundaries for both signs', () => {
    const data = [row(2025, [0.01, 1, 1.01, 2, 2.01, 3, 3.01, 4]), row(2026, [-0.01, -1, -1.01, -2, -2.01, -3, -3.01, -4])];
    const mapped = monthlyReturnsData(data);
    expect(mapped.map(year => year.months.slice(0, 8).map(cell => cell.band))).toEqual([
      [1, 1, 2, 2, 3, 3, 4, 4], [1, 1, 2, 2, 3, 3, 4, 4],
    ]);
    expect(mapped[0].months.slice(0, 8).every(cell => cell.tone === 'positive')).toBe(true);
    expect(mapped[1].months.slice(0, 8).every(cell => cell.tone === 'negative')).toBe(true);
    const shared = monthlyReturnsData([row(2025, [1]), row(2026, [-4])]);
    expect(shared[0].months[0].band).toBe(1);
    expect(shared[1].months[0].band).toBe(4);
    const html = render(data);
    for (const sign of ['positive', 'negative']) {
      for (const opacity of ['/15', '/25', '/40', '']) expect(html).toContain(`bg-chart-return-${sign}${opacity}`);
    }
    expect(html).toContain('text-chart-return-on-fill');
  });

  it('formats supplied percentages directly, keeps zero visible and null cells empty', () => {
    const data = [row(2026, [2.44, -1.84, 0, null, -0])];
    const html = render(data);
    expect(html).toContain('+2.4%');
    expect(html).toContain('−1.8%');
    expect(html.match(/>0\.0%</g)).toHaveLength(2);
    expect(html).not.toContain('−0.0%');
    expect(html.match(/data-tone="missing"[^>]*><bdi dir="ltr"><\/bdi><\/td>/g)).toHaveLength(8);
    expect(html).toContain('2026年4月，无数据');
    expect(html).toContain('空格 = 无数据');
    expect(html).toContain('界面不推算');
    expect(html).toContain('不随账户 / 框架筛选');
    expect(html.match(/scope="col"/g)).toHaveLength(13);
    expect(html.match(/scope="row"/g)).toHaveLength(1);
  });

  it('hides missing and empty slots but retains supplied years with all nulls or zeros', () => {
    expect(render()).toBe('');
    expect(render([])).toBe('');
    expect(render([row(2026, [])])).toContain('月度收益');
    expect(monthlyReturnsData([row(2026, Array(12).fill(0))])[0].months.every(cell => cell.band === 0 && cell.label === '0.0%')).toBe(true);
    expect(render([row(2026, Array(12).fill(0))])).not.toMatch(/NaN|Infinity/);
  });
});

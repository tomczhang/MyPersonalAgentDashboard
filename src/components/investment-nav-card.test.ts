import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import example from '../../data/examples/investment.json';
import { parseModule } from '@/data/schema';
import { InvestmentNavCard, investmentNavData } from '@/components/investment-nav-card';
import { DirectionProvider } from '@/components/foundations/direction/direction';

describe('asset total and cumulative return combo', () => {
  it('keeps asset balances separate from compounded supplied returns', () => {
    const data = parseModule('investment', example);
    data.meta.asOf = '2026-04-01';
    data.series = [
      { date: '2025-12-31', value: 100, changePct: 50 },
      { date: '2026-01-31', value: 200, changePct: 10 },
      { date: '2026-02-28', value: 400, changePct: -10 },
      { date: '2026-03-31', value: 300, changePct: 0 },
      { date: '2026-05-01', value: 999, changePct: 10 },
    ];
    const rows = investmentNavData(data, 'YTD');
    expect(rows.map(row => row.value)).toEqual([200, 400, 300]);
    expect(rows[0].returnPct).toBeCloseTo(10);
    expect(rows[1].returnPct).toBeCloseTo(-1);
    expect(rows[2].returnPct).toBeCloseTo(-1);
    expect(investmentNavData(data, '1M')[0].returnPct).toBe(0);
  });
  it('does not invent missing returns or continue a broken cumulative chain', () => {
    const data = parseModule('investment', example);
    data.series = [{ date: '2026-01-01', value: 100 }, { date: '2026-02-01', value: 200, changePct: 5 }];
    expect(investmentNavData(data, 'YTD').every(row => row.returnPct === undefined)).toBe(true);
    delete data.series;
    expect(investmentNavData(data, 'YTD')).toEqual([]);
  });
  it('shows the latest asset balance rather than summing balances or displaying income', () => {
    const data = parseModule('investment', example);
    const html = renderToStaticMarkup(createElement(DirectionProvider, { locale: 'zh-CN', children: createElement(InvestmentNavCard, { data, range: 'YTD', onRangeChange: () => {} }) }));
    expect(html).toContain('500,000.00');
    expect(html).toContain('资产总量');
    expect(html).toContain('累计收益率');
    expect(html).not.toContain('40,000.00');
    expect(html).not.toContain('标普 500');
  });
});

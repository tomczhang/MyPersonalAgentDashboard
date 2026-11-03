import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import example from '../../data/examples/investment.json';
import { parseModule } from '@/data/schema';
import { InvestmentNavCard, investmentComboData } from '@/components/investment-nav-card';
import { DirectionProvider } from '@/components/foundations/direction/direction';

describe('official combo chart slot adapter', () => {
  it('preserves supplied returns independently of NAV, including negative and zero rates', () => {
    const series = [{ date: '2026-10-01', value: 100, changePct: -3 }, { date: '2026-10-15', value: 400 }, { date: '2026-11-01', value: 900, changePct: 0 }];
    const mapped = investmentComboData(series);
    expect(mapped.points).toEqual([{ label: '2026-10-01', value: 100, changePct: -3 }, { label: '2026-10-15', value: 400 }, { label: '2026-11-01', value: 900, changePct: 0 }]);
    expect(mapped.latest?.value).toBe(900);
    expect(mapped.average).toBe(-1.5);
    expect(investmentComboData([{ date: '2026-11-01', value: 100 }]).average).toBeUndefined();
    expect(investmentComboData([]).latest).toBeUndefined();
  });
  it('accepts old slots and rejects invalid returns without requiring the optional extension', () => {
    const slot = parseModule('investment', example);
    delete slot.seriesSummary;
    slot.series?.forEach(point => { delete point.changePct; });
    expect(parseModule('investment', slot).series?.[0].changePct).toBeUndefined();
    for (const value of [NaN, Infinity, '4', null]) {
      expect(() => parseModule('investment', { ...slot, seriesSummary: { changePct: value } })).toThrow();
      expect(() => parseModule('investment', { ...slot, series: [{ date: '2026-11-01', value: 100, changePct: value }] })).toThrow();
    }
  });
  it('reads the supplied summary chip and latest NAV, never sums snapshots', () => {
    const data = [{ date: '2026-10-01', value: 100, changePct: -3 }, { date: '2026-11-01', value: 900, changePct: 0 }];
    const render = (summary?: { changePct: number }) => renderToStaticMarkup(createElement(DirectionProvider, { locale: 'zh-CN', children: createElement(InvestmentNavCard, { data, summary, range: '1M', onRangeChange: () => {}, empty: false, asOf: '2026-11-01' }) }));
    expect(render({ changePct: -7.3 })).toContain('-7.3%');
    expect(render({ changePct: 0 })).toContain('0.0%');
    expect(render()).toContain('区间涨跌：—');
    expect(render()).toContain('900.00');
    expect(render()).not.toContain('1,000');
    expect(render()).toContain('-1.5%');
  });
});

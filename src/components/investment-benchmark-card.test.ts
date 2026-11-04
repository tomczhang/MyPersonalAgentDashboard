import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import example from '../../data/examples/investment.json';
import { parseModule } from '@/data/schema';
import { InvestmentBenchmarkCard, investmentReturnData, normalizeReturnData } from '@/components/investment-benchmark-card';
import { DirectionProvider } from '@/components/foundations/direction/direction';
import type { AreaPoint } from '@/components/application/charts/area-chart-card';

describe('cumulative investment return comparison', () => {
  it('filters by snapshot date and retains negative, zero and missing values', () => {
    const data = parseModule('investment', example);
    data.returnComparison = [
      { date: '2025-12-31', income: 800, portfolioPct: 1 },
      { date: '2026-01-31', income: -300, portfolioPct: -2, sp500Pct: 0 },
      { date: '2026-10-31', income: 0, portfolioPct: 0, nasdaq100Pct: -1 },
      { date: '2026-11-30', income: 999, portfolioPct: 99 },
    ];
    expect(investmentReturnData(data, 'YTD').map(row => row.income)).toEqual([-300, 0]);
    const recent = investmentReturnData(data, '1M');
    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({ income: 0, portfolioPct: 0 });
    expect(recent[0].nasdaq100Pct).toBeCloseTo(-1);
    expect(recent[0].sp500Pct).toBeUndefined();
    expect(investmentReturnData(data, 'Max')).toHaveLength(3);
  });
  it('uses annual supplied income and TWR without summing percentages or using NAV', () => {
    const data = parseModule('investment', example);
    data.performanceByYear = { '2026': { totalReturn: 12345.67, twrPct: -7.3 } };
    const html = renderToStaticMarkup(createElement(DirectionProvider, { locale: 'zh-CN', children: createElement(InvestmentBenchmarkCard, { data }) }));
    expect(html).toContain('12,345.67');
    expect(html).toContain('-7.3%');
    expect(html).toContain('本年至今');
    expect(html).not.toContain('500,000');
    expect(html).toContain('标普 500');
    expect(html).toContain('纳指 100');
  });
  it('accepts legacy monthly data but never invents benchmark or income values', () => {
    const data = parseModule('investment', example);
    delete data.returnComparison;
    const points = investmentReturnData(data, 'YTD');
    expect(points).toHaveLength(10);
    expect(points[2].portfolioPct).toBeCloseTo(0.9596);
    expect(points.every(row => row.income === undefined && row.sp500Pct === undefined && row.nasdaq100Pct === undefined)).toBe(true);
    delete data.monthlyReturns;
    expect(investmentReturnData(data, 'YTD')).toEqual([]);
  });
  it('compounds gains and losses within the range, and stops each series at missing data', () => {
    const data = parseModule('investment', example);
    data.meta.asOf = '2026-04-01';
    data.returnComparison = [
      { date: '2025-12-31', portfolioPct: 50 },
      { date: '2026-01-31', income: 100, portfolioPct: 10, sp500Pct: 2, nasdaq100Pct: 1 },
      { date: '2026-02-28', income: -100, portfolioPct: -10, sp500Pct: 0 },
      { date: '2026-03-31', income: 0, portfolioPct: 0, sp500Pct: 3, nasdaq100Pct: 4 },
    ];
    const points = investmentReturnData(data, 'YTD');
    expect(points[0].portfolioPct).toBeCloseTo(10);
    expect(points[1].portfolioPct).toBeCloseTo(-1);
    expect(points[2].portfolioPct).toBeCloseTo(-1);
    expect(points[2].sp500Pct).toBeCloseTo(5.06);
    expect(points[2].nasdaq100Pct).toBeUndefined();
    expect(points.map(point => point.income)).toEqual([100, -100, 0]);
    const recent = investmentReturnData(data, '1M');
    expect(recent).toHaveLength(1);
    expect(recent[0].portfolioPct).toBe(0);
    expect(recent[0].nasdaq100Pct).toBeCloseTo(4);
    data.returnComparison.splice(2, 1);
    expect(investmentReturnData(data, 'YTD')[1].portfolioPct).toBeUndefined();
  });
  it('rejects duplicate months and non-finite rates or amounts', () => {
    const data = parseModule('investment', example);
    for (const invalid of [NaN, Infinity, '4', null]) {
      expect(() => parseModule('investment', { ...data, returnComparison: [{ date: '2026-01-31', income: invalid }] })).toThrow();
      expect(() => parseModule('investment', { ...data, returnComparison: [{ date: '2026-01-31', sp500Pct: invalid }] })).toThrow();
    }
    expect(() => parseModule('investment', { ...data, returnComparison: [{ date: '2026-01-01' }, { date: '2026-01-31' }] })).toThrow();
  });
});


describe('benchmark normalization', () => {
  it('rebases cumulative wealth at the first visible date without changing income or source values', () => {
    const points: AreaPoint[] = [
      { label: '2026-01-31', income: 100, portfolioPct: 10, sp500Pct: 5 },
      { label: '2026-02-28', income: -100, portfolioPct: -1, sp500Pct: 15.5, nasdaq100Pct: 2 },
    ];
    const original = structuredClone(points);
    const normalized = normalizeReturnData(points);
    expect(normalized[0]).toMatchObject({ portfolioPct: 100, sp500Pct: 100, income: 100 });
    expect(normalized[1].portfolioPct).toBeCloseTo(90);
    expect(normalized[1].sp500Pct).toBeCloseTo(110);
    expect(normalized[1].nasdaq100Pct).toBeUndefined();
    expect(points).toEqual(original);
    expect(normalizeReturnData([])).toEqual([]);
  });
  it('does not bridge missing values or divide by a zero wealth baseline', () => {
    const normalized = normalizeReturnData([
      { label: 'a', portfolioPct: -100, sp500Pct: 0 }, { label: 'b', portfolioPct: 1 },
    ]);
    expect(normalized.every(row => row.portfolioPct === undefined)).toBe(true);
    expect(normalized[1].sp500Pct).toBeUndefined();
  });
});

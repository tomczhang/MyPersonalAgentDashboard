import { describe, expect, it } from 'vitest';
import example from '../../data/examples/investment.json';
import { parseModule } from '@/data/schema';

describe('investment optional presentation slots', () => {
  it('accepts optional signed amounts and rejects nonfinite amounts or misaligned monthly arrays', () => {
    const slot = parseModule('investment', example);
    slot.dailyReturns = [{ date: '2026-10-01', returnPct: 1, pnlAmount: -123.45 }];
    slot.monthlyReturns = [{ year: 2026, months: Array(12).fill(0), pnlAmounts: [0, null, -123.45, ...Array(9).fill(1)] }];
    expect(parseModule('investment', slot).monthlyReturns?.[0].pnlAmounts?.slice(0, 3)).toEqual([0, null, -123.45]);
    slot.dailyReturns[0].pnlAmount = Infinity;
    expect(() => parseModule('investment', slot)).toThrow();
    delete slot.dailyReturns[0].pnlAmount;
    slot.monthlyReturns[0].pnlAmounts!.pop();
    expect(() => parseModule('investment', slot)).toThrow();
    slot.monthlyReturns[0].pnlAmounts!.push(NaN);
    expect(() => parseModule('investment', slot)).toThrow();
  });
  it('accepts legacy slots and preserves the retained dividend data', () => {
    const slot = parseModule('investment', example);
    delete slot.watchlist; delete slot.benchmarkSeries; delete slot.monthlyReturns; delete slot.dailyReturns;
    const parsed = parseModule('investment', slot);
    expect(parsed.dividends).toEqual(example.dividends);
    expect(parsed.performanceByYear).toEqual(example.performanceByYear);
  });
  it('retains zero and null months distinctly and enforces twelve finite values', () => {
    const slot = parseModule('investment', example);
    expect(slot.monthlyReturns![0].months[3]).toBe(0);
    expect(slot.monthlyReturns![1].months[11]).toBeNull();
    slot.monthlyReturns![0].months.pop();
    expect(() => parseModule('investment', slot)).toThrow();
    slot.monthlyReturns![0].months.push(Infinity);
    expect(() => parseModule('investment', slot)).toThrow();
  });
  it('validates daily dates, finite percentages and uniqueness without treating missing as zero', () => {
    const slot = parseModule('investment', example);
    slot.dailyReturns = [{ date: '2024-02-29', returnPct: 0 }, { date: '2024-03-01', returnPct: null }];
    expect(parseModule('investment', slot).dailyReturns).toEqual(slot.dailyReturns);
    for (const dailyReturns of [
      [{ date: '2026-02-29', returnPct: 1 }],
      [{ date: '2026-01-01', returnPct: Infinity }],
      [{ date: '2026-01-01', returnPct: 1 }, { date: '2026-01-01', returnPct: 2 }],
    ]) expect(() => parseModule('investment', { ...slot, dailyReturns })).toThrow();
  });
  it('rejects invalid alert state, negative prices and zero benchmark bases', () => {
    const slot = structuredClone(example);
    slot.watchlist[0].levels[0].status = 'unknown';
    expect(() => parseModule('investment', slot)).toThrow();
    slot.watchlist[0].levels[0].status = 'triggered';
    slot.watchlist[0].levels[0].price = -1;
    expect(() => parseModule('investment', slot)).toThrow();
    slot.watchlist[0].levels[0].price = 150;
    slot.benchmarkSeries.points[0].portfolio = 0;
    expect(() => parseModule('investment', slot)).toThrow();
  });
});

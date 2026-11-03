import { describe, expect, it } from 'vitest';
import example from '../../data/examples/investment.json';
import { parseModule } from '@/data/schema';

describe('investment optional presentation slots', () => {
  it('accepts legacy slots and preserves the retained dividend data', () => {
    const slot = parseModule('investment', example);
    delete slot.watchlist; delete slot.benchmarkSeries; delete slot.monthlyReturns;
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

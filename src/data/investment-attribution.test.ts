import { describe, expect, it } from 'vitest';
import example from '../../data/examples/investment.json';
import { parseModule } from '@/data/schema';
import { attributionData, attributionScale } from '@/data/investment-attribution';

describe('盈亏归因', () => {
  it('combines open unrealized and separately supplied closed realized P/L by symbol', () => {
    const data = parseModule('investment', example);
    data.closedPositions = [{ symbol: 'DEMO-A', pnlAmount: -5000 }, { symbol: 'CLOSED', pnlAmount: 2000 }];
    const { filters } = attributionData(data, 'all', false);
    expect(filters.all.find(row => row.symbol === 'DEMO-A')?.amount).toBe(25000);
    expect(filters.open.find(row => row.symbol === 'DEMO-A')?.amount).toBe(30000);
    expect(filters.closed).toMatchObject([{ symbol: 'CLOSED', amount: 2000, status: 'closed' }, { symbol: 'DEMO-A', amount: -5000, status: 'closed' }]);
    expect(filters.all.find(row => row.symbol === 'DEMO-A')).toMatchObject({ status: 'mixed', pnlPct: null });
    expect(filters.open.find(row => row.symbol === 'DEMO-A')).toMatchObject({ status: 'open', pnlPct: 25 });
  });
  it('weights combined percentages by supplied costs, preserves zeros, and does not guess missing bases', () => {
    const data = parseModule('investment', example);
    data.positions![0].buyInAmount = 120000;
    data.closedPositions = [{ symbol: 'DEMO-A', pnlAmount: -10000, pnlPct: -10, buyInAmount: 100000 }];
    const result = attributionData(data, 'all', false);
    expect(result.filters.closed[0]).toMatchObject({ status: 'closed', pnlPct: -10 });
    expect(result.filters.all.find(row => row.symbol === 'DEMO-A')?.pnlPct).toBeCloseTo(20000 / 220000 * 100);
    expect(result.filters.open.find(row => row.symbol === 'DEMO-D')?.pnlPct).toBe(0);
    delete data.closedPositions[0].buyInAmount;
    expect(attributionData(data, 'all', false).filters.all.find(row => row.symbol === 'DEMO-A')?.pnlPct).toBeNull();
    delete data.closedPositions[0].pnlPct;
    expect(attributionData(data, 'all', false).filters.closed[0].pnlPct).toBeNull();
  });
  it('never infers closed or missing P/L, and preserves real zeros', () => {
    const data = parseModule('investment', example);
    data.positions![0].pnlAmount = null;
    data.positions![0].totalReturn = 1234;
    data.positions![1].qty.value = 0;
    const result = attributionData(data, 'all', false);
    expect(result.closedAvailable).toBe(false);
    expect(result.filters.closed).toEqual([]);
    expect(result.filters.open.find(row => row.symbol === 'DEMO-A')?.amount).toBeNull();
    expect(result.filters.open.find(row => row.symbol === 'DEMO-D')?.amount).toBe(0);
    expect(result.filters.all.some(row => row.symbol === 'DEMO-B')).toBe(false);
    data.closedPositions = [{ symbol: 'DEMO-A', pnlAmount: 100 }];
    expect(attributionData(data, 'all', false).filters.all.find(row => row.symbol === 'DEMO-A')?.amount).toBeNull();
  });
  it('filters both sources by account and framework and flags unknown attribution', () => {
    const data = parseModule('investment', example);
    data.closedPositions = [
      { symbol: 'CLOSED', pnlAmount: -300, accountId: 'U***0002', inFramework: true },
      { symbol: 'UNKNOWN', pnlAmount: 100 },
    ];
    const result = attributionData(data, 'U***0002', true);
    expect(result.filters.all.map(row => row.symbol)).toEqual(['DEMO-C', 'CLOSED']);
    expect(result.incompleteScope).toBe(true);
  });
  it('uses equal tick increments and always includes zero for mixed, one-sided and empty amounts', () => {
    for (const values of [[-210, 1470, 1360], [0, 0], [], [100, 2000], [-100, -2000], [-0.004, 0.009]]) {
      const { ticks, domain } = attributionScale(values.map((amount, index) => ({ symbol: String(index), amount })));
      expect(ticks).toContain(0);
      expect(domain[0]).toBeLessThanOrEqual(Math.min(0, ...values));
      expect(domain[1]).toBeGreaterThanOrEqual(Math.max(0, ...values));
      expect(domain[1]).toBeGreaterThan(domain[0]);
      for (let i = 2; i < ticks.length; i++) expect(ticks[i] - ticks[i - 1]).toBeCloseTo(ticks[1] - ticks[0], 10);
    }
  });
  it('validates closed-position records without requiring them for legacy data', () => {
    expect(() => parseModule('investment', example)).not.toThrow();
    expect(() => parseModule('investment', { ...example, closedPositions: [{ symbol: 'TEST', pnlAmount: null }] })).not.toThrow();
    expect(() => parseModule('investment', { ...example, closedPositions: [{ symbol: 'TEST', pnlAmount: Infinity }] })).toThrow();
  });
});

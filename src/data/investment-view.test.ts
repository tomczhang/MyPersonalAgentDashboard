import { describe, expect, it } from 'vitest';
import example from '../../data/examples/investment.json';
import { parseModule } from './schema';
import { filterSeries, investmentView, share } from './investment-view';

const data = () => parseModule('investment', structuredClone(example));
describe('investment snapshot views', () => {
  it('reconciles the full snapshot and both account NAVs without recalculating P/L', () => {
    const slot = data();
    const full = investmentView(slot, 'all', false);
    expect(full.total).toBe(500000);
    expect(full.cash).toBe(100000);
    expect(full.gap).toBe(50000);
    for (const account of slot.accounts) expect(investmentView(slot, account.idMasked, false).total).toBe(account.nav.value);
    expect(full.positions[1].pnlAmount).toBe(-10000);
    expect(full.positions[1].pnlPct).toBe(-10);
  });
  it('intersects account and framework filters and recomputes denominator and positive gaps', () => {
    const view = investmentView(data(), 'U***0002', true);
    expect(view.positions.map(row => row.symbol)).toEqual(['DEMO-C']);
    expect(view.total).toBe(150000);
    expect(view.cash).toBe(40000);
    expect(share(110000, view.total)).toBeCloseTo(73.3333);
    expect(view.gap).toBe(50000);
    expect(investmentView(data(), 'all', true).total).toBe(450000);
  });
  it('does not turn missing attribution into a zero account balance', () => {
    const slot = data();
    delete slot.positions;
    delete slot.ammo;
    slot.cashTiers.forEach(row => { delete row.accountId; delete row.inFramework; });
    expect(parseModule('investment', slot)).toBeTruthy();
    expect(investmentView(slot, 'all', false).total).toBe(500000);
    const filtered = investmentView(slot, 'U***0001', false);
    expect(filtered.complete).toBe(false);
    expect(filtered.total).toBeNull();
    expect(filtered.gap).toBeNull();
  });
  it('allows missing optional slots, missing performance rows, and genuine zeroes', () => {
    const slot = data();
    delete slot.series; delete slot.dividends;
    slot.performanceByYear = { '2026': { totalReturn: 0 } };
    expect(parseModule('investment', slot).performanceByYear?.['2026']).toEqual({ totalReturn: 0 });
    expect(filterSeries(slot.series, 'Max', slot.meta.asOf)).toEqual([]);
    slot.positions = []; slot.ammo = [];
    expect(investmentView(slot, 'all', false).total).toBe(0);
    expect(share(0, 0)).toBeNull();
  });
  it('filters relative to snapshot date, sorts points, and excludes future points', () => {
    const points = [{ date: '2026-11-02', value: 9 }, { date: '2026-11-01', value: 8 }, { date: '2026-10-01', value: 7 }, { date: '2025-11-01', value: 6 }, { date: '2025-10-31', value: 5 }];
    expect(filterSeries(points, '1M', '2026-11-01').map(p => p.value)).toEqual([7, 8]);
    expect(filterSeries(points, 'YTD', '2026-11-01').map(p => p.value)).toEqual([7, 8]);
    expect(filterSeries(points, '1Y', '2026-11-01').map(p => p.value)).toEqual([6, 7, 8]);
    expect(filterSeries(points, 'Max', '2026-11-01').map(p => p.value)).toEqual([5, 6, 7, 8]);
    expect(filterSeries([{ date: '2026-02-28', value: 1 }], '1M', '2026-03-31')).toHaveLength(1);
  });
});

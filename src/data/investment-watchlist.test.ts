import { describe, expect, it } from 'vitest';
import example from '../../data/examples/investment.json';
import { parseModule } from '@/data/schema';
import { levelLabel, watchlistSummary } from '@/data/investment-watchlist';

const items = parseModule('investment', example).watchlist!;
describe('watchlist grades and distance', () => {
  it('derives the highest triggered grade, first waiting grade and all-triggered state', () => {
    expect(items.map(item => watchlistSummary(item).label)).toEqual(['已触发 · 二级', '已触发 · 一级', '一级待触发', '已触发 · 三级']);
    expect(watchlistSummary(items[3])).toMatchObject({ next: undefined, distancePct: null });
    expect(levelLabel(12)).toBe('12级');
    const sparse = { ...items[0], levels: [{ level: 1, price: 100, status: 'triggered' as const }, { level: 5, price: 150, status: 'triggered' as const }] };
    expect(watchlistSummary(sparse).label).toBe('已触发 · 五级');
  });
  it('uses reference price as denominator for either direction and preserves zero', () => {
    expect(watchlistSummary(items[0]).distancePct).toBeCloseTo(10 / 150 * 100);
    expect(watchlistSummary(items[1]).distancePct).toBe(10);
    expect(watchlistSummary({ ...items[0], referencePrice: 160 }).distancePct).toBe(0);
    expect(watchlistSummary({ ...items[0], referencePrice: 0 }).distancePct).toBeNull();
  });
  it('rejects ambiguous or malformed ladders and the retired alerts field', () => {
    const invalid = [
      [],
      [items[0].levels[1], items[0].levels[0]],
      [items[0].levels[0], items[0].levels[0]],
      [{ level: 0, price: 10, status: 'next' }],
      [{ level: 1, price: 10, status: 'next' }, { level: 2, price: 20, status: 'next' }],
      [{ level: 1, price: 10, status: 'pending' }, { level: 2, price: 20, status: 'triggered' }],
      [{ level: 1, price: 10, status: 'pending' }, { level: 2, price: 20, status: 'next' }],
      [{ level: 1, price: Infinity, status: 'pending' }],
    ];
    for (const levels of invalid) expect(() => parseModule('investment', { ...example, watchlist: [{ ...items[0], levels }] })).toThrow();
    expect(() => parseModule('investment', { ...example, alerts: [] })).toThrow();
    expect(parseModule('investment', { ...example, watchlist: [] }).watchlist).toEqual([]);
  });
});

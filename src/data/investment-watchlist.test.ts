import { describe, expect, it } from 'vitest';
import example from '../../data/examples/investment.json';
import { parseModule } from '@/data/schema';
import { watchlistGradientColor, watchlistLevelColor, watchlistSummary } from '@/data/investment-watchlist';

const items = parseModule('investment', example).watchlist!;
describe('watchlist stages and interval progress', () => {
  it('accepts optional whole planned shares, preserves zero, and rejects retired notes', () => {
    const withNode = (node: object) => parseModule('investment', { ...example, watchlist: [{ ...items[0], levels: [node] }] });
    const base = { level: 1, price: 140, status: 'triggered' };
    expect(withNode(base).watchlist![0].levels[0].shares).toBeUndefined();
    for (const shares of [0, 1000]) expect(withNode({ ...base, shares }).watchlist![0].levels[0].shares).toBe(shares);
    for (const shares of [-1, 0.5, Infinity, NaN, '1000', null]) expect(() => withNode({ ...base, shares })).toThrow();
    expect(() => withNode({ ...base, note: '已移除的虚构备注' })).toThrow();
  });
  it('samples a continuous normalized scale without capping at the fourth stage', () => {
    const colors = Array.from({ length: 12 }, (_, i) => watchlistLevelColor('triggered', i + 1, 12));
    expect(new Set(colors).size).toBe(12);
    expect(watchlistLevelColor('triggered', 1, 1)).toBe(watchlistGradientColor(0.5));
    expect(watchlistLevelColor('triggered', 2, 4)).toBe(watchlistLevelColor('triggered', 5, 12));
    expect(watchlistLevelColor('triggered', 2, 4)).not.toBe(watchlistLevelColor('triggered', 2, 8));
    expect(watchlistLevelColor('next', 3, 4)).toBe('var(--color-chart-track)');
    expect(watchlistLevelColor('pending', 4, 4)).toBe('var(--color-chart-track)');
  });
  it('counts supplied stages instead of treating the highest level as a count', () => {
    expect(items.map(item => watchlistSummary(item).triggeredCount)).toEqual([2, 1, 0, 3]);
    expect(watchlistSummary(items[3])).toMatchObject({ next: undefined, progress: null, allTriggered: true });
    const sparse = { ...items[0], levels: [{ level: 1, price: 100, status: 'triggered' as const }, { level: 5, price: 150, status: 'triggered' as const }] };
    expect(watchlistSummary(sparse)).toMatchObject({ triggeredCount: 2, total: 2, allTriggered: true });
  });
  it('measures signed progress within the previous-to-next interval for both directions', () => {
    expect(watchlistSummary(items[0]).progress).toBe(0);
    expect(watchlistSummary({ ...items[0], referencePrice: 155 }).progress).toBe(0.5);
    expect(watchlistSummary({ ...items[1], referencePrice: 95 }).progress).toBe(0.5);
    expect(watchlistSummary({ ...items[0], referencePrice: 160 }).progress).toBe(1);
    expect(watchlistSummary({ ...items[1], referencePrice: 90 }).progress).toBe(1);
  });
  it('clamps prices beyond either endpoint without reclassifying supplied statuses', () => {
    for (const [item, referencePrice, progress] of [[items[0], 0, 0], [items[0], 180, 1], [items[1], 120, 0], [items[1], 0, 1]] as const) {
      const summary = watchlistSummary({ ...item, referencePrice });
      expect(summary.progress).toBe(progress);
      expect(summary.triggeredCount).toBe(item.levels.filter(node => node.status === 'triggered').length);
    }
  });
  it('does not invent a baseline or mark pending stages as all triggered', () => {
    expect(watchlistSummary(items[2]).progress).toBeNull();
    const samePrice = { ...items[0], levels: items[0].levels.map(node => ({ ...node, price: 150 })) };
    expect(watchlistSummary(samePrice).progress).toBeNull();
    const pending = { ...items[0], levels: [{ level: 1, price: 0, status: 'pending' as const }] };
    expect(watchlistSummary(pending)).toMatchObject({ next: undefined, progress: null, allTriggered: false });
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

import type { Investment } from '@/data/investment-view';

export type WatchlistItem = NonNullable<Investment['watchlist']>[number];
// A single chart hue grows in depth by ordinal position, never by trade direction.
// Mix semantic tokens so the same ramp also follows the enclosing theme surface.
export function watchlistLevelColor(status: WatchlistItem['levels'][number]['status'], index: number, total: number) {
  if (status === 'next') return 'var(--color-accent-600)';
  if (status === 'pending') return 'var(--color-chart-track)';
  const depth = total > 1 ? index / (total - 1) : 0;
  return `color-mix(in oklab, var(--color-chart-1-active) ${40 + depth * 60}%, var(--color-background-primary-default))`;
}

// Presentation only: supplied statuses remain authoritative, including when the
// reference price has moved back across a historically triggered level.
export function watchlistSummary(item: WatchlistItem) {
  const triggered = item.levels.filter(node => node.status === 'triggered');
  const next = item.levels.find(node => node.status === 'next');
  const start = triggered.at(-1);
  const span = next && start ? next.price - start.price : 0;
  const progress = next && start && span !== 0
    ? Math.max(0, Math.min(1, (item.referencePrice - start.price) / span))
    : null;
  return {
    triggeredCount: triggered.length,
    total: item.levels.length,
    allTriggered: triggered.length === item.levels.length,
    next,
    progress,
  };
}

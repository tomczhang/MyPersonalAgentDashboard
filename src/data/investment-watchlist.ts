import type { Investment } from '@/data/investment-view';

export type WatchlistItem = NonNullable<Investment['watchlist']>[number];
// One continuous emerald scale. The on-fill text token keeps the pale endpoint
// light in both themes instead of reversing the gradient on a dark surface.
export function watchlistGradientColor(position: number) {
  const light = 'color-mix(in oklab, var(--color-chart-7) 40%, var(--color-text-white))';
  return `color-mix(in oklab, ${light}, var(--color-chart-7-active) ${position * 100}%)`;
}

export const WATCHLIST_GRADIENT = `linear-gradient(to right in oklab, ${watchlistGradientColor(0)}, ${watchlistGradientColor(1)})`;

// Position is the one-based ordinal in this ladder, not a possibly sparse level ID.
export function watchlistLevelColor(status: WatchlistItem['levels'][number]['status'], position: number, total: number) {
  return status === 'triggered'
    ? watchlistGradientColor((position - 0.5) / total)
    : 'var(--color-chart-track)';
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

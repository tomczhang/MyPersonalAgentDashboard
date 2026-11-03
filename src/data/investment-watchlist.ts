import type { Investment } from '@/data/investment-view';

export type WatchlistItem = NonNullable<Investment['watchlist']>[number];
export function levelLabel(level: number) {
  const numerals = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  return `${numerals[level - 1] ?? level}级`;
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

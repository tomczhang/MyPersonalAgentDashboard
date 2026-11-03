import type { Investment } from '@/data/investment-view';

export type WatchlistItem = NonNullable<Investment['watchlist']>[number];
export function levelLabel(level: number) {
  const numerals = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  return `${numerals[level - 1] ?? level}级`;
}

export function watchlistSummary(item: WatchlistItem) {
  const highestTriggered = item.levels.reduce((highest, node) => node.status === 'triggered' ? Math.max(highest, node.level) : highest, 0);
  const next = item.levels.find(node => node.status === 'next');
  return {
    highestTriggered,
    label: highestTriggered ? `已触发 · ${levelLabel(highestTriggered)}` : '一级待触发',
    next,
    distancePct: next && item.referencePrice > 0 ? Math.abs(next.price - item.referencePrice) / item.referencePrice * 100 : null,
  };
}

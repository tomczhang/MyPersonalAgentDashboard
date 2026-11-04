"use client";
import { AgentLimitsCard, type ContextSegment } from '@/components/application/agent-limits/agent-limits-card';
import { Badge } from '@/components/base/badges/badge';
import { Panel } from '@/components/module-content';
import { money, percent, type Investment } from '@/data/investment-view';
import { WATCHLIST_GRADIENT, watchlistLevelColor, watchlistSummary, type WatchlistItem } from '@/data/investment-watchlist';
import { cx } from '@/utils/cx';

const statuses = { triggered: '已触发', next: '待触发', pending: '待触发' };
const directions = {
  买入: 'bg-chart-1/15 text-chart-1-active',
  卖出: 'bg-chart-3/15 text-chart-3-active',
  观察: 'bg-chart-4/15 text-chart-4-active',
};

function WatchlistCard({ item }: { item: WatchlistItem }) {
  const summary = watchlistSummary(item);
  const segments: ContextSegment[] = item.levels.map((node, index) => ({
    id: String(node.level),
    label: money(node.price),
    tokens: 1,
    color: watchlistLevelColor(node.status, index + 1, summary.total),
    display: {
      label: <bdi dir="ltr">{money(node.price)}</bdi>,
      value: node.shares === undefined ? '—' : <><bdi dir="ltr">{node.shares.toLocaleString('en-US')}</bdi> 股</>,
      share: <Badge role={node.status === 'triggered' ? 'img' : undefined} aria-label={node.status === 'triggered' ? statuses.triggered : undefined} className={cx('gap-1 rounded-full px-2', node.status === 'triggered' && 'bg-chart-7/20 text-calendar-event-emerald-title')}>
        {node.status === 'triggered' ? <span aria-hidden>✓</span> : statuses[node.status]}
      </Badge>,
    },
  }));
  const zoneLabel = summary.inStrikeZone ? `已进入击球区 · 第 ${summary.strikeLevel} 阶段`
    : summary.nearStrikeZone ? '临近击球区' : '未进入击球区';
  const gap = summary.gapPct === null ? '—' : `${summary.gapPct > 0 ? '+' : ''}${percent(summary.gapPct)}`;
  return <li className="min-w-0 self-start">
    <AgentLimitsCard
      className="rounded-3xl border border-border-button-default [&_.text-text-tertiary]:text-text-primary/65 [&_.text-text-secondary]:text-text-primary/75 p-4"
      context={{ max: summary.total, segments, completion: {
        used: summary.triggeredCount / summary.total,
        gradient: WATCHLIST_GRADIENT,
        label: `${item.name} 节点完成度`,
      } }}
      presentation={{
        title: <span className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-1.5"><bdi className="text-text-primary">{item.name}</bdi><Badge className={cx('rounded-full px-2', directions[item.direction])}>{item.direction}</Badge></span>
        </span>,
        readout: <span className="text-caption-1-medium">已触发 {summary.triggeredCount}/{summary.total}</span>,
        breakdownLabel: `${item.symbol} 触发梯子`,
        showFreeSpace: false,
        limitsTitle: null,
        footer: <div className="flex flex-col gap-3 pt-1">
          <dl className="grid grid-cols-2 gap-3">
            <div className="flex min-w-0 flex-col gap-1"><dt className="text-caption-1-medium text-text-secondary">下一节点价格</dt><dd className="text-body-medium text-text-primary tabular-nums">{summary.allTriggered ? <span className="text-caption-1-medium">全部节点已触发</span> : <bdi dir="ltr">{money(summary.next?.price)}</bdi>}</dd></div>
            <div className="flex min-w-0 flex-col gap-1"><dt className="text-caption-1-medium text-text-secondary">当前价格</dt><dd className="text-body-medium text-text-primary tabular-nums"><bdi dir="ltr">{money(item.referencePrice)}</bdi></dd></div>
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-caption-1-medium text-text-secondary">距下一节点 <bdi dir="ltr" className="text-body-medium text-text-primary tabular-nums">{gap}</bdi></span>
            <Badge className={cx('rounded-full px-2', summary.inStrikeZone && 'bg-chart-5/15 text-chart-5-active', summary.nearStrikeZone && 'bg-chart-4/15 text-chart-4-active')}>{zoneLabel}</Badge>
          </div>
        </div>,
      }}
      limits={[]}
    />
  </li>;
}

export function InvestmentAlerts({ watchlist }: { watchlist: Investment['watchlist']; asOf: string }) {
  if (!watchlist?.length) return null;
  return <Panel title="触发 / 观察名单" titleClassName="text-body-medium text-text-secondary" className="border-0 bg-background-secondary-default">
    <p className="mb-4 text-caption-1-medium text-text-tertiary">全组合 · USD</p>
    <ul aria-label="触发与观察名单" className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {watchlist.map((item, i) => <WatchlistCard key={`${item.symbol}:${i}`} item={item} />)}
    </ul>
  </Panel>;
}

"use client";
import { AgentLimitsCard, type ContextSegment } from '@/components/application/agent-limits/agent-limits-card';
import { Badge } from '@/components/base/badges/badge';
import { Panel } from '@/components/module-content';
import { money, type Investment } from '@/data/investment-view';
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
  const nextLabel = summary.next ? <><span className="inline-block">下一节点 <bdi dir="ltr">{money(summary.next.price)}</bdi></span> · <span className="inline-block">参考价 <bdi dir="ltr">{money(item.referencePrice)}</bdi></span></>
    : summary.allTriggered ? '全部节点已触发' : '暂无下一节点';
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
      }}
      limits={[{
        label: nextLabel,
        used: summary.allTriggered ? 1 : summary.progress,
        resets: summary.next && summary.progress === null ? '缺少区间' : '',
      }]}
    />
  </li>;
}

export function InvestmentAlerts({ watchlist, asOf }: { watchlist: Investment['watchlist']; asOf: string }) {
  if (!watchlist?.length) return null;
  return <Panel title="触发 / 观察名单">
    <p className="mb-4 text-caption-1-medium text-text-primary/65">全组合观察名单 · 价格 USD · 截至 {asOf} · 不随账户 / 框架筛选</p>
    <ul aria-label="触发与观察名单" className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {watchlist.map((item, i) => <WatchlistCard key={`${item.symbol}:${i}`} item={item} />)}
    </ul>
    <div className="mt-4 flex flex-col gap-2 text-caption-1-regular text-text-primary/65">
      <p>点击卡头或按 Enter / 空格展开完整梯子。完成度 = 已触发级数 / 总级数；绿条沿整条刻度由浅入深，未完成部分为中性轨道，刻度等距。已触发行首色块取该级中点的渐变色，待触发为轨道灰；行首为触发价，右侧为计划股数与状态。</p>
      <p>区间进度 =（参考价 − 上一已触发价）÷（下一节点价 − 上一已触发价），限制在 0–100%，买卖方向均适用。首级无已触发起点、区间价相同或未指定下一节点时显示「—」；全部已触发显示 100%。该比例仅作展示，不改变槽位触发状态。</p>
    </div>
  </Panel>;
}

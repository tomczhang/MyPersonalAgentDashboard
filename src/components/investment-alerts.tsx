"use client";
import { useId, useState } from 'react';
import { Focusable } from 'react-aria-components';
import { Badge } from '@/components/base/badges/badge';
import { Button } from '@/components/base/buttons/button';
import { Tooltip, TooltipTrigger } from '@/components/base/tooltip/tooltip';
import { Panel } from '@/components/module-content';
import { money, percent, type Investment } from '@/data/investment-view';
import { levelLabel, watchlistSummary, type WatchlistItem } from '@/data/investment-watchlist';
import { cx } from '@/utils/cx';

const statuses = {
  triggered: { label: '已触发 ✓', tone: 'bg-accent-600 text-text-white' },
  next: { label: '下一个', tone: 'bg-status-orange-background text-status-orange-text' },
  pending: { label: '待触发', tone: 'bg-badge-neutral-background text-text-primary/70' },
};
const directions = {
  买入: 'bg-accent-600 text-text-white',
  卖出: 'bg-status-orange-background text-status-orange-text',
  观察: 'bg-badge-neutral-background text-text-primary/70',
};

function TriggerLadder({ item }: { item: WatchlistItem }) {
  return <div className="flex min-w-0 flex-col gap-3">
    <p className="text-body-2-medium text-text-primary"><bdi>{item.name}</bdi> · 完整触发梯子</p>
    <ol aria-label={`${item.symbol} 完整触发梯子`} className="flex flex-col gap-2">
      {item.levels.map(node => <li key={node.level} className={cx('rounded-xl border p-3', node.status === 'triggered' ? 'border-accent-600 bg-background-secondary-default' : 'border-border-button-default bg-background-primary-default')}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={cx('text-body-2-medium', node.status === 'pending' ? 'text-text-primary/70' : 'text-text-primary')}>{levelLabel(node.level)} · <span className="sr-only">触发价 </span><bdi dir="ltr" className="tabular-nums">{money(node.price)}</bdi></span>
          <Badge className={cx('rounded-full px-2 py-1', statuses[node.status].tone)}>{statuses[node.status].label}</Badge>
        </div>
        {node.note && <p className="mt-2 break-words text-caption-1-medium text-text-primary/70"><bdi>{node.note}</bdi></p>}
      </li>)}
    </ol>
  </div>;
}

function WatchlistCard({ item }: { item: WatchlistItem }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const summary = watchlistSummary(item);
  return <li className="min-w-0 self-start rounded-3xl border border-border-button-default bg-background-secondary-default">
    <TooltipTrigger isDisabled={expanded} delay={150}>
      <Focusable>
        <Button variant="ghost" aria-label={`${item.name} ${item.symbol}，${summary.label}，完整触发梯子`} aria-expanded={expanded} aria-controls={expanded ? id : undefined}
          onClick={() => setExpanded(value => !value)} onKeyDown={event => { if (event.key === 'Escape') setExpanded(false); }}
          className="h-auto w-full justify-start whitespace-normal rounded-3xl bg-background-secondary-default p-4 text-start hover:bg-background-secondary-hover [&>span]:w-full [&>span]:min-w-0 [&>span]:shrink [&>span]:p-0">
          <span className="flex w-full min-w-0 flex-col gap-4">
            <span className="flex items-start justify-between gap-2">
              <span className="flex min-w-0 flex-col gap-1"><bdi className="break-words text-body-medium text-text-primary">{item.name}</bdi><bdi dir="ltr" className="text-caption-1-medium text-text-primary/70">{item.symbol}</bdi></span>
              <Badge className={cx('rounded-full px-2 py-1', directions[item.direction])}>{item.direction}</Badge>
            </span>
            <span className="text-body-2-medium text-text-primary">{summary.label}</span>
            <span className="flex flex-wrap items-center justify-between gap-2 text-caption-1-medium text-text-primary/70 tabular-nums">
              <span>参考价 <bdi dir="ltr">{money(item.referencePrice)}</bdi></span>
              {summary.next && <span>距下一节点 {percent(summary.distancePct)}</span>}
            </span>
          </span>
        </Button>
      </Focusable>
      <Tooltip placement="top" size="md" showArrow={false} className="w-80 max-w-full rounded-3xl p-4">
        <TriggerLadder item={item} />
      </Tooltip>
    </TooltipTrigger>
    {expanded && <div id={id} role="region" aria-label={`${item.symbol} 触发梯子`} className="border-t border-separator-border p-4"><TriggerLadder item={item} /></div>}
  </li>;
}

export function InvestmentAlerts({ watchlist, asOf }: { watchlist: Investment['watchlist']; asOf: string }) {
  if (!watchlist?.length) return null;
  return <Panel title="触发 / 观察名单">
    <p className="mb-4 text-caption-1-medium text-text-primary/70">全组合观察名单 · 价格 USD · 截至 {asOf} · 不随账户 / 框架筛选</p>
    <ul aria-label="触发与观察名单" className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 2xl:grid-cols-3">
      {watchlist.map((item, i) => <WatchlistCard key={`${item.symbol}:${i}`} item={item} />)}
    </ul>
    <p className="mt-4 text-caption-1-medium text-text-primary/70">悬停、键盘聚焦或点击卡片查看完整梯子。距离 = 下一节点价与参考价的绝对差 ÷ 参考价；参考价为 0 时显示「—」。</p>
  </Panel>;
}

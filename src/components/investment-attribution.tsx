"use client";
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard, ChartLegend } from '@/components/application/charts/chart-card';
import { ButtonGroup, ButtonGroupItem } from '@/components/base/buttons/button-group';
import { attributionData, attributionScale, type AttributionFilter, type AttributionRow } from '@/data/investment-attribution';
import { percent, type Investment } from '@/data/investment-view';
import { cx } from '@/utils/cx';

const gain = 'var(--color-chart-return-positive)';
const loss = 'var(--color-chart-attribution-loss)';
const filters = [{ id: 'all', label: '全部' }, { id: 'closed', label: '已平仓' }, { id: 'open', label: '持仓中' }] as const;
const amountText = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}USD ${Math.abs(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const tickText = (value: number) => value.toLocaleString('zh-CN', { maximumFractionDigits: 6 });
const statusText = { open: '持仓中', closed: '已平仓', mixed: '持仓中 / 已平仓' };
const ratioText = (value: number | null) => value === null ? '—' : `${value > 0 ? '+' : ''}${percent(value)}`;

export function InvestmentAttribution({ data, account, frameworkOnly }: { data: Investment; account: string; frameworkOnly: boolean }) {
  const [filter, setFilter] = useState<AttributionFilter>('all');
  const source = attributionData(data, account, frameworkOnly);
  const rows = source.filters[filter];
  const known = rows.filter((row): row is AttributionRow & { amount: number } => row.amount !== null);
  const missing = rows.filter(row => row.amount === null);
  const scale = attributionScale(Object.values(source.filters).flat());
  return <div role="region" aria-label="盈亏归因" className="min-w-0">
    <ChartCard className="h-auto rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-body-medium text-text-secondary">盈亏归因</h2>
        <ButtonGroup aria-label="盈亏归因筛选" size="small">
          {filters.map(item => <ButtonGroupItem key={item.id} size="small" selected={filter === item.id}
            aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}
            className={cx(filter === item.id && 'bg-accent-50 text-accent-700 hover:bg-accent-50')}>{item.label}</ButtonGroupItem>)}
        </ButtonGroup>
      </div>
      <p className="text-caption-1-regular text-text-tertiary">盈亏金额（USD） · {filter === 'open' ? '持仓浮盈/浮亏' : filter === 'closed' ? '已平仓已实现盈亏' : '持仓浮盈/浮亏 + 已平仓已实现盈亏'}</p>
      {known.length > 0 ? <div role="region" aria-label="盈亏金额条形图，可横向滚动" tabIndex={0}
        className="min-w-0 overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring">
        <div className="min-w-160" style={{ height: Math.max(280, known.length * 56 + 56) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={known} margin={{ top: 12, right: 40, bottom: 12, left: 8 }} accessibilityLayer>
              <CartesianGrid horizontal={false} stroke="var(--color-separator-border)" strokeDasharray="4 4" />
              <XAxis type="number" dataKey="amount" scale="linear" domain={scale.domain} ticks={scale.ticks} interval={0}
                tickFormatter={tickText} tickLine={false} axisLine={{ stroke: 'var(--color-separator-border)' }}
                tick={{ fill: 'var(--color-text-tertiary)' }} className="text-caption-1-regular" />
              <YAxis type="category" dataKey="symbol" width={96} tickLine={false} axisLine={false}
                tick={{ fill: 'var(--color-text-secondary)' }} className="text-caption-1-medium" />
              <ReferenceLine x={0} stroke="var(--color-text-tertiary)" strokeWidth={1.5} />
              {known.filter(row => row.amount === 0).map(row => <ReferenceDot key={row.symbol} x={0} y={row.symbol} r={0}
                label={{ value: '0', position: 'right', fill: 'var(--color-text-secondary)', className: 'text-caption-1-regular' }} />)}
              <Tooltip cursor={{ fill: 'var(--color-background-secondary-hover)' }} content={({ active, payload }) => {
                const row = payload?.[0]?.payload as (AttributionRow & { amount: number }) | undefined;
                return active && row ? <div className="flex w-max flex-col gap-0.5 rounded-xl border border-border-button-default bg-background-primary-default px-3 py-2 shadow-sm">
                  <p className="text-body-medium text-text-primary"><bdi dir="ltr">{row.symbol}</bdi></p>
                  <dl className="flex flex-col gap-0.5">
                    <div><dt className="sr-only">平仓状态</dt><dd className="text-caption-1-regular text-text-tertiary">{statusText[row.status]}</dd></div>
                    <div><dt className="sr-only">盈亏金额</dt><dd className={cx('text-body-medium whitespace-nowrap tabular-nums', row.amount > 0 ? 'text-chart-return-positive' : row.amount < 0 ? 'text-chart-attribution-loss' : 'text-text-secondary')}><bdi dir="ltr">{amountText(row.amount)}</bdi></dd></div>
                    <div><dt className="sr-only">盈亏比例</dt><dd className="text-caption-1-regular text-text-tertiary tabular-nums"><bdi dir="ltr">{ratioText(row.pnlPct)}</bdi></dd></div>
                  </dl>
                </div> : null;
              }} />
              {/* Recharts starts at zero with signed widths; the far-end corners mirror for losses. */}
              <Bar dataKey="amount" name="盈亏金额" barSize={24} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {known.map(row => <Cell key={row.symbol} fill={row.amount < 0 ? loss : gain} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div> : <p role="status" className="flex min-h-60 items-center justify-center text-body-regular text-text-tertiary">
        {filter === 'closed' && !source.closedAvailable ? '暂无已平仓盈亏数据' : missing.length ? '当前标的暂无盈亏金额' : '当前筛选暂无盈亏记录'}
      </p>}
      {filter === 'all' && !source.closedAvailable && <p role="status" className="text-caption-1-regular text-text-tertiary">暂无已平仓盈亏数据，当前仅展示持仓浮盈/浮亏。</p>}
      {missing.length > 0 && <p role="status" className="text-caption-1-regular text-text-tertiary">{missing.map(row => row.symbol).join('、')} 缺少完整盈亏金额，未绘制。</p>}
      {source.incompleteScope && <p role="status" className="text-caption-1-regular text-text-tertiary">部分记录缺少账户或框架归属，仅展示已匹配标的。</p>}
      <ChartLegend items={[{ label: '盈利', color: gain }, { label: '亏损', color: loss }]} />
      <table className="sr-only" aria-label="盈亏归因明细">
        <thead><tr><th>投资标的</th><th>平仓状态</th><th>盈亏金额（USD）</th><th>盈亏比例</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.symbol}><th scope="row">{row.symbol}</th><td>{statusText[row.status]}</td><td>{row.amount === null ? '暂无完整盈亏金额' : amountText(row.amount)}</td><td>{ratioText(row.pnlPct)}</td></tr>)}</tbody>
      </table>
    </ChartCard>
  </div>;
}

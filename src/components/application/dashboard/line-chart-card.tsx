"use client";
// BoardUI registry line-chart-card, adapted to supplied snapshots and date ranges.
import { ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { SegmentedControl, SegmentedControlItem } from '@/components/base/segmented-control/segmented-control';
import { Panel } from '@/components/module-content';
import { money, type Range } from '@/data/investment-view';

export function LineChartCard({ data, range, onRangeChange, empty, asOf }: {
  data: { date: string; value: number }[]; range: Range; onRangeChange: (range: Range) => void; empty: boolean; asOf: string;
}) {
  return <Panel title="净值曲线">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-caption-1-medium text-text-tertiary">全组合 · USD · 截至 {asOf}</p>
      <SegmentedControl aria-label="净值日期范围" selectedKeys={[range]} onSelectionChange={keys => onRangeChange([...keys][0] as Range)}>
        {(['1M', 'YTD', '1Y', 'Max'] as const).map(id => <SegmentedControlItem key={id} id={id}>{id}</SegmentedControlItem>)}
      </SegmentedControl>
    </div>
    {data.length ? <>
      <p className="mt-4 text-title-2-medium text-text-primary tabular-nums">{money(data.at(-1)?.value)}<span className="ms-2 text-caption-1-medium text-text-tertiary">{data.at(-1)?.date}</span></p>
      <div className="mt-4 h-64 w-full text-caption-1-medium" role="img" aria-label={`净值折线，${data[0].date} 至 ${data.at(-1)?.date}，${data.length} 个快照点`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 8, left: 0 }} accessibilityLayer>
            <CartesianGrid vertical={false} stroke="var(--color-separator-border)" />
            <XAxis dataKey="date" tickFormatter={v => String(v).slice(2)} minTickGap={24} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-text-tertiary)' }} />
            <YAxis width={52} tickFormatter={v => `${Number(v) / 1000}k`} domain={['auto', 'auto']} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-text-tertiary)' }} />
            <Tooltip formatter={v => [money(Number(v)), '净值']} contentStyle={{ background: 'var(--color-background-primary-default)', borderColor: 'var(--color-border-button-default)', borderRadius: 12, color: 'var(--color-text-primary)' }} cursor={{ stroke: 'var(--color-chart-1)' }} />
            <Line type="linear" dataKey="value" stroke="var(--color-chart-1-active)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--color-chart-1-active)' }} activeDot={{ r: 5 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-caption-1-medium text-text-tertiary">按快照日期过滤 · {data.length} 个数据点 · 资金流入流出可能影响净值，曲线不代表收益率。</p>
    </> : <div role="status" className="flex min-h-72 items-center justify-center text-body-regular text-text-tertiary">{empty ? '槽位暂无序列数据' : '所选范围暂无序列数据'}</div>}
  </Panel>;
}

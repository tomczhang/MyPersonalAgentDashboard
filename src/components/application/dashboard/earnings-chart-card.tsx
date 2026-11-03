"use client";
// BoardUI registry earnings-chart-card, adapted to annual received dividends.
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { money } from '@/data/investment-view';

export function EarningsChartCard({ data }: { data: { year: number; amount: number }[] }) {
  if (!data.length) return <p role="status" className="flex min-h-64 items-center justify-center text-body-regular text-text-tertiary">暂无年度已收分红数据</p>;
  return <div className="h-64 min-w-0 text-caption-1-medium" role="img" aria-label={`年度已收分红：${data.map(row => `${row.year} 年 ${money(row.amount)}`).join('；')}`}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={[...data].sort((a, b) => a.year - b.year)} margin={{ top: 12, right: 12, bottom: 8, left: 0 }} accessibilityLayer>
        <YAxis width={52} tickFormatter={v => `${Number(v) / 1000}k`} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-text-tertiary)' }} />
        <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-text-tertiary)' }} />
        <Tooltip formatter={v => [money(Number(v)), '已收分红']} cursor={false} contentStyle={{ background: 'var(--color-background-primary-default)', borderColor: 'var(--color-border-button-default)', borderRadius: 12, color: 'var(--color-text-primary)' }} />
        <Bar dataKey="amount" fill="var(--color-chart-2)" radius={[8, 8, 0, 0]} maxBarSize={64} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  </div>;
}

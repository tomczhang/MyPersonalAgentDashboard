"use client";
import { AreaChartCard, type AreaPoint } from '@/components/application/charts/area-chart-card';
import { Panel } from '@/components/module-content';
import type { Investment } from '@/data/investment-view';

const indexFormat = (value: number) => value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });

// Normalize each supplied series independently; never derive returns from NAV.
export function investmentBenchmarkData(slot: NonNullable<Investment['benchmarkSeries']>): AreaPoint[] {
  const first = slot.points[0];
  if (!first) return [];
  return slot.points.map(({ date, portfolio, benchmark }) => ({
    label: date,
    portfolio: portfolio / first.portfolio * 100,
    benchmark: benchmark / first.benchmark * 100,
  }));
}

export function InvestmentBenchmarkCard({ data }: { data?: Investment['benchmarkSeries'] }) {
  if (!data || data.points.length < 2) return null;
  const points = investmentBenchmarkData(data);
  return <Panel title="基准对比" className="border-0 bg-background-secondary-default">
    <div className="flex flex-col gap-4">
      <p className="text-caption-1-medium text-text-tertiary">全组合 · 起点 100 · {data.points[0].date} — {data.points.at(-1)!.date}</p>
      <AreaChartCard
        variant="overlap"
        title="组合 · 最新指数"
        data={points}
        series={[
          { key: 'portfolio', label: '组合', color: 'var(--color-chart-2)', activeColor: 'var(--color-chart-2-active)' },
          { key: 'benchmark', label: data.benchmarkLabel, color: 'var(--color-chart-4)', activeColor: 'var(--color-chart-4-active)' },
        ]}
        headline={Number(points.at(-1)!.portfolio)}
        format={indexFormat}
        tiles={false}
        className="rounded-none px-0 [&_.text-text-tertiary]:text-text-primary/65 [&_.text-text-secondary]:text-text-primary/75 [&_.recharts-cartesian-axis-tick-value]:fill-text-primary/65 [&_.recharts-cartesian-axis-tick-value]:text-caption-1-regular"
      />
    </div>
  </Panel>;
}

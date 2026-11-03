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
  return <Panel title="基准对比">
    <div className="flex flex-col gap-4">
      <p className="text-caption-1-medium text-text-secondary dark:text-text-primary">归一化起点 100 · 全组合 · 不随账户 / 框架筛选 · 基准为槽位数据，非实时行情</p>
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
        className="rounded-3xl border border-border-button-default"
      />
      <div className="flex flex-col gap-1 text-caption-1-medium text-text-secondary dark:text-text-primary">
        <p>完整槽位区间：{data.points[0].date} 至 {data.points.at(-1)!.date} · 不随净值日期范围切换。双面积重叠，同轴比较指数高度。</p>
        <p>悬停查看当期组合与基准指数；卡头显示组合值。未悬停时，卡头为组合最新指数，图例数值为各期指数之和，不代表收益或最新指数。</p>
      </div>
    </div>
  </Panel>;
}

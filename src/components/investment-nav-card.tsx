"use client";
import { ComboChartCard, type ComboPoint } from '@/components/application/charts/combo-chart-card';
import { ChartStatTiles } from '@/components/application/charts/chart-card';
import { SegmentedControl, SegmentedControlItem } from '@/components/base/segmented-control/segmented-control';
import { Panel } from '@/components/module-content';
import { money, percent, type Investment, type Range } from '@/data/investment-view';

const navFormat = (value: number) => new Intl.NumberFormat('zh-CN', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2,
}).format(value);

// Adapt slots only. Missing returns stay absent, never inferred from NAV or filled with zero.
export function investmentComboData(data: NonNullable<Investment['series']>) {
  const points: ComboPoint[] = data.map(({ date, value, changePct }) => ({
    label: date, value, ...(changePct === undefined ? {} : { changePct }),
  }));
  const rates = data.flatMap(point => point.changePct === undefined ? [] : [point.changePct]);
  return { points, latest: data.at(-1), average: rates.length ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : undefined };
}

export function InvestmentNavCard({ data, summary, range, onRangeChange, empty, asOf }: {
  data: NonNullable<Investment['series']>; summary?: Investment['seriesSummary'];
  range: Range; onRangeChange: (range: Range) => void; empty: boolean; asOf: string;
}) {
  const { points, latest, average } = investmentComboData(data);
  return <Panel title="净值曲线">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-caption-1-medium text-text-tertiary">全组合 · USD · 截至 {asOf} · 不随账户 / 框架筛选</p>
      <SegmentedControl aria-label="净值日期范围" selectedKeys={[range]} onSelectionChange={keys => onRangeChange([...keys][0] as Range)}>
        {(['1M', 'YTD', '1Y', 'Max'] as const).map(id => <SegmentedControlItem key={id} id={id}>{id}</SegmentedControlItem>)}
      </SegmentedControl>
    </div>
    {latest ? <div className="mt-4 flex flex-col gap-4">
      <ComboChartCard
        key={range}
        title="净值 · 最新"
        data={points}
        bar={{ key: 'value', label: '净值', format: navFormat, axisFormat: value => `${value / 1000}k`, color: 'var(--color-chart-2)', activeColor: 'var(--color-chart-2-active)' }}
        line={{ key: 'changePct', label: '收益率', format: percent, axisFormat: average === undefined ? () => '' : percent, color: 'var(--color-chart-4)', activeColor: 'var(--color-chart-4-active)' }}
        headline={latest.value}
        delta={summary === undefined ? undefined : summary.changePct / 100}
        caption={row => row ? `收益率 ${typeof row.changePct === 'number' ? percent(row.changePct) : '—'}` : latest.date}
        tiles={false}
        className="rounded-3xl border border-border-button-default"
      />
      {/* Official tiles sum NAV snapshots and count missing rates as zero. Use the shared
          presentation component with correct summaries; no external hover callback exists. */}
      <ChartStatTiles className="mx-0 mb-0" items={[
        { label: '净值 · 最新', value: money(latest.value), color: 'var(--color-chart-2)' },
        { label: '收益率 · 平均', value: percent(average), color: 'var(--color-chart-4)' },
      ]} />
      <div className="flex flex-col gap-1 text-caption-1-medium text-text-tertiary">
        <p>左轴：净值 USD；右轴：收益率 % · {data.length} 个快照点。净值受资金流入流出影响，不代表收益率。</p>
        <p>区间涨跌：{percent(summary?.changePct)}（填充方提供的完整序列区间，不随日期筛选重算）。</p>
        <p>{average === undefined ? '槽位暂无收益率数据，仅显示净值条形。' : '收益率平均为所选范围已填 changePct 的简单平均，缺失值不参与；不代表区间收益。'}</p>
        <p>悬停查看卡头当期净值与收益率；下方图例保留最新 / 平均汇总。</p>
      </div>
    </div> : <div role="status" className="flex min-h-72 items-center justify-center text-body-regular text-text-tertiary">{empty ? '槽位暂无序列数据' : '所选范围暂无序列数据'}</div>}
  </Panel>;
}

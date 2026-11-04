"use client";
import { useState } from 'react';
import { RiCalendarLine } from '@remixicon/react';
import { ScatterChartCard, type ScatterPoint } from '@/components/application/charts/scatter-chart-card';
import { Select, SelectItem } from '@/components/base/select/select';
import { concentrationData, concentrationRanges } from '@/data/investment-concentration';
import { percent, type Position, type Range } from '@/data/investment-view';

const marketValue = (value: number) => `USD ${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const returnRate = (value: number) => `${value > 0 ? '+' : ''}${percent(value)}`;
const pointLabel = (point: ScatterPoint) => `${point.label}，波动率 ${percent(point.x)}，标的收益率 ${returnRate(point.y)}，持仓市值 ${marketValue(point.z ?? 0)}`;

export function InvestmentConcentration({ positions, asOf }: { positions: Position[]; asOf: string }) {
  const [range, setRange] = useState<Range>('YTD');
  const view = concentrationData(positions, range);
  return <div role="region" aria-label="投资组合集中度" className="min-w-0">
    <ScatterChartCard key={range} series={view.series} bubble format={percent} formatX={percent}
      className="h-128 rounded-3xl p-5 sm:p-6"
      axisLabels={['波动率（%）', '标的收益率（%）']}
      legendValue={series => `${percent(series.points.reduce((sum, point) => sum + (point.z ?? 0), 0) / view.total * 100)}`}
      emptyMessage={view.missing.length ? '所选时间范围暂无完整的波动率与收益率数据' : '当前筛选暂无持仓'}
      header={<div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-body-medium text-text-secondary">投资组合集中度</h2>
          <p className="text-title-1-medium text-text-primary tabular-nums">{percent(view.largestShare)}</p>
          <p className="text-caption-1-regular text-text-tertiary">最大单一持仓占比</p>
        </div>
        <Select aria-label="集中度时间范围" size="sm" selectedKey={range} onSelectionChange={key => setRange(key as Range)}
          popoverClassName="w-48" renderValue={<span className="flex items-center gap-1.5"><RiCalendarLine aria-hidden className="size-4 text-foreground-icon-secondary" />{concentrationRanges.find(item => item.id === range)?.label}</span>}>
          {concentrationRanges.map(item => <SelectItem key={item.id} id={item.id}>{item.label}</SelectItem>)}
        </Select>
      </div>}
      pointLabel={pointLabel}
      renderTooltip={point => <div className="flex flex-col gap-2">
        <p className="text-body-2-medium text-text-primary"><bdi>{point.label}</bdi></p>
        <dl className="flex flex-col gap-1 text-caption-1-regular">
          {[['波动率', percent(point.x)], ['标的收益率', returnRate(point.y)], ['持仓市值', marketValue(point.z ?? 0)]].map(([label, value]) =>
            <div key={label} className="flex items-center justify-between gap-4"><dt className="text-text-secondary">{label}</dt><dd className="text-text-primary tabular-nums"><bdi dir="ltr">{value}</bdi></dd></div>)}
        </dl>
      </div>} />
    <p className="mt-2 text-caption-1-regular text-text-tertiary">气泡面积与持仓市值成正比 · 图例为市值占比 · 年化波动率 · 市值截至 {asOf}</p>
    {view.missing.length > 0 && <p role="status" className="mt-2 text-caption-1-regular text-text-tertiary">{view.missing.join('、')} 缺少完整或一致的区间指标，未绘制。</p>}
  </div>;
}

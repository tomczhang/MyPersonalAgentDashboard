"use client";
import { useMemo } from 'react';
import { RiCalendarLine } from '@remixicon/react';
import { ComboChartCard, type ComboPoint } from '@/components/application/charts/combo-chart-card';
import { ChartHeader, ChartLegend, describeDelta } from '@/components/application/charts/chart-card';
import { Select, SelectItem } from '@/components/base/select/select';
import { filterSeries, money, percent, type Investment, type Range } from '@/data/investment-view';

const ranges = [
  { id: 'YTD', label: '本年至今' }, { id: '1M', label: '近1月' },
  { id: '1Y', label: '近1年' }, { id: 'Max', label: '全部' },
];
const assetColor = 'var(--color-chart-2)';
const rateColor = 'var(--color-chart-4)';

export function investmentNavData(data: Investment, range: Range): ComboPoint[] {
  let factor: number | undefined = 1;
  return filterSeries(data.series, range, data.meta.asOf).map(row => {
    // Supplied period returns, never changes in the asset balance (which includes flows).
    factor = factor === undefined || row.changePct === undefined ? undefined : factor * (1 + row.changePct / 100);
    return { label: row.date, value: row.value, ...(factor === undefined ? {} : { returnPct: (factor - 1) * 100 }) };
  });
}

export function InvestmentNavCard({ data, range, onRangeChange }: {
  data: Investment; range: Range; onRangeChange: (range: Range) => void;
}) {
  const points = useMemo(() => investmentNavData(data, range), [data, range]);
  const latest = points.at(-1);
  const header = (point?: ComboPoint) => {
    const row = point ?? latest;
    const amount = typeof row?.value === 'number' ? row.value : undefined;
    const rate = typeof row?.returnPct === 'number' ? row.returnPct : undefined;
    return <ChartHeader label={point ? `${point.label} 资产总量` : '资产总量'}
      value={amount} format={money} valueText={amount === undefined ? '—' : undefined}
      delta={rate === undefined ? undefined : describeDelta(rate / 100)}
      trailing={<Select aria-label="资产时间范围" size="sm" selectedKey={range} onSelectionChange={key => onRangeChange(key as Range)}
        className="shrink-0" triggerClassName="h-8" popoverClassName="w-48 transition-none"
        renderValue={<><RiCalendarLine aria-hidden className="size-4 text-text-secondary" /><span>{ranges.find(item => item.id === range)?.label}</span></>}>
        {ranges.map(item => <SelectItem key={item.id} id={item.id}>{item.label}</SelectItem>)}
      </Select>}
      className="flex-wrap [&>div:first-child]:min-w-48" />;
  };
  return <section aria-label="资产总量与收益率" className="flex min-w-0 flex-col gap-3 rounded-3xl bg-background-secondary-default p-5 sm:p-6">
    {points.length > 0 ? <ComboChartCard key={range} data={points}
      bar={{ key: 'value', label: '资产总量', color: assetColor, activeColor: 'var(--color-chart-2-active)', format: money, axisFormat: value => `${value / 10000}万` }}
      line={{ key: 'returnPct', label: '累计收益率', color: rateColor, activeColor: 'var(--color-chart-4-active)', format: percent }}
      labelFormat={label => range === 'Max' || range === '1Y' ? label.slice(0, 7) : `${Number(label.slice(5, 7))}月`}
      renderHeader={header}
      renderFooter={point => {
        const row = point ?? latest;
        return <ChartLegend items={[
          { label: '资产总量（USD）', color: assetColor, value: money(typeof row?.value === 'number' ? row.value : undefined) },
          { label: '累计收益率', color: rateColor, value: percent(typeof row?.returnPct === 'number' ? row.returnPct : undefined) },
        ]} />;
      }}
      className="h-96 rounded-none p-0 sm:h-112 [&_.recharts-cartesian-axis-tick-value]:text-caption-1-regular" />
      : <>{header()}<p role="status" className="flex min-h-72 items-center justify-center text-body-regular text-text-tertiary">所选范围暂无资产数据</p></>}
  </section>;
}

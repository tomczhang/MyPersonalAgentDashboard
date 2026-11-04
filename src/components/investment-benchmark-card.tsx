"use client";
import { useMemo, useState } from 'react';
import { RiCalendarLine } from '@remixicon/react';
import { AreaChartCard, type AreaPoint } from '@/components/application/charts/area-chart-card';
import { ChartHeader, describeDelta } from '@/components/application/charts/chart-card';
import { Switch } from '@/components/base/switch/switch';
import { Select, SelectItem } from '@/components/base/select/select';
import { filterSeries, money, percent, type Investment, type Range } from '@/data/investment-view';

const ranges = [
  { id: 'YTD', label: '本年至今' }, { id: '1M', label: '近1月' },
  { id: '1Y', label: '近1年' }, { id: 'Max', label: '全部' },
];
const series = [
  { key: 'portfolioPct', label: '我的累计收益率', color: 'var(--color-chart-2)', activeColor: 'var(--color-chart-2-active)' },
  { key: 'sp500Pct', label: '标普 500', color: 'var(--color-chart-4)', activeColor: 'var(--color-chart-4-active)' },
  { key: 'nasdaq100Pct', label: '纳指 100', color: 'var(--color-chart-5)', activeColor: 'var(--color-chart-5-active)' },
];

export function investmentReturnData(data: Investment, range: Range): AreaPoint[] {
  // Legacy monthly percentages are usable; NAV changes and unnamed benchmarks are not.
  const rows = data.returnComparison ?? (data.monthlyReturns ?? []).flatMap(row => row.months.flatMap((value, index) => {
    const date = new Date(Date.UTC(row.year, index + 1, 0)).toISOString().slice(0, 10);
    return [{ date, ...(value === null ? {} : { portfolioPct: value }) }];
  }));
  const factors: Record<string, number | undefined> = Object.fromEntries(series.map(item => [item.key, 1]));
  let previousMonth: number | undefined;
  return filterSeries(rows, range, data.meta.asOf).map(row => {
    const point: AreaPoint = { ...row, label: row.date };
    const month = Number(row.date.slice(0, 4)) * 12 + Number(row.date.slice(5, 7));
    for (const { key } of series) {
      const rate = point[key];
      // A missing month breaks the cumulative chain; never treat unknown returns as zero.
      if (typeof rate !== 'number' || (previousMonth !== undefined && month !== previousMonth + 1)) factors[key] = undefined;
      const factor = factors[key];
      if (factor === undefined) delete point[key];
      else {
        factors[key] = factor * (1 + Number(rate) / 100);
        point[key] = (factors[key]! - 1) * 100;
      }
    }
    previousMonth = month;
    return point;
  });
}

export function normalizeReturnData(points: AreaPoint[]): AreaPoint[] {
  const first = points[0];
  return points.map(point => {
    const result = { ...point };
    for (const { key } of series) {
      const base = first?.[key];
      const value = point[key];
      if (typeof base !== 'number' || base <= -100 || typeof value !== 'number') delete result[key];
      else result[key] = (100 + value) / (100 + base) * 100;
    }
    return result;
  });
}

export function InvestmentBenchmarkCard({ data }: { data: Investment }) {
  const [range, onRangeChange] = useState<Range>('YTD');
  const [normalized, setNormalized] = useState(false);
  const rawPoints = useMemo(() => investmentReturnData(data, range), [data, range]);
  const points = useMemo(() => normalized ? normalizeReturnData(rawPoints) : rawPoints, [rawPoints, normalized]);
  const normalizedDomain = useMemo<[number, number]>(() => {
    const values = points.flatMap(point => series.flatMap(({ key }) => typeof point[key] === 'number' ? [point[key] as number] : []));
    const low = Math.min(100, ...values);
    const high = Math.max(100, ...values);
    const padding = Math.max(1, (high - low) * 0.15);
    return [Math.floor(low - padding), Math.ceil(high + padding)];
  }, [points]);
  const format = normalized ? (value: number) => value.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : percent;
  const year = data.meta.asOf.slice(0, 4);
  const annual = data.performanceByYear?.[year];
  const header = (point?: AreaPoint) => {
    const income = point ? (typeof point.income === 'number' ? point.income : undefined) : annual?.totalReturn;
    const rawPoint = point ? rawPoints.find(row => row.label === point.label) : undefined;
    const rate = point ? (typeof rawPoint?.portfolioPct === 'number' ? rawPoint.portfolioPct : undefined) : annual?.twrPct;
    return <ChartHeader
      label={point ? `${point.label.slice(0, 7).replace('-', '年')}月收入` : `${year} 收入`}
      value={income} format={money} valueText={income === undefined ? '—' : undefined}
      delta={rate === undefined ? undefined : describeDelta(rate / 100)}
      fadeKey={point?.label ?? 'annual'}
      trailing={<Select aria-label="收益时间范围" size="sm" selectedKey={range} onSelectionChange={id => onRangeChange(id as Range)}
        className="shrink-0" triggerClassName="h-8" popoverClassName="w-48 transition-none"
        renderValue={<><RiCalendarLine aria-hidden className="size-4 text-text-secondary" /><span>{ranges.find(item => item.id === range)?.label}</span></>}>
        {ranges.map(item => <SelectItem key={item.id} id={item.id}>{item.label}</SelectItem>)}
      </Select>}
      className="flex-wrap [&>div:first-child]:min-w-48"
    />;
  };
  const missing = series.filter(item => !points.some(point => typeof point[item.key] === 'number'));
  return <section aria-label="基准对比" className="flex min-w-0 flex-col gap-3 rounded-3xl bg-background-secondary-default p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-body-medium text-text-secondary">基准对比</h2>
      <Switch size="sm" isSelected={normalized} onChange={setNormalized}>归一化（起点 100）</Switch>
    </div>
    {points.length > 0 ? <AreaChartCard
      key={`${range}:${normalized}`} variant="overlap" data={points}
      series={normalized ? series.map(item => item.key === 'portfolioPct' ? { ...item, label: '我的组合' } : item) : series}
      format={format} axisFormat={format} legendSummary="latest"
      axisDomain={normalized ? normalizedDomain : undefined}
      fillOpacity={normalized ? 0.15 : 1}
      referenceValue={normalized ? 100 : undefined}
      labelFormat={label => range === 'Max' || range === '1Y' ? label.slice(0, 7) : `${Number(label.slice(5, 7))}月`}
      renderHeader={header}
      className="h-96 rounded-none p-0 sm:h-112 [&_.recharts-cartesian-axis-tick-value]:text-caption-1-regular"
    /> : <>{header()}<p role="status" className="flex min-h-72 items-center justify-center text-body-regular text-text-tertiary">所选范围暂无收益数据</p></>}
    {points.length > 0 && missing.length > 0 && <p className="text-caption-1-regular text-text-tertiary">暂无{missing.map(item => item.label).join('、')}数据</p>}
  </section>;
}

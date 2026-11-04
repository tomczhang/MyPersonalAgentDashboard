"use client";
import { useEffect, useState } from 'react';
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion, type MotionValue } from 'motion/react';
import { Pie, PieChart, ResponsiveContainer, Sector } from 'recharts';
import { ChartCenterReadout } from '@/components/application/charts/chart-card';
import { Select, SelectItem } from '@/components/base/select/select';
import { useCountUpPrecise } from '@/hooks/use-count-up';
import { distributionDimensions, money, percent, share, type DistributionDimension } from '@/data/investment-view';

const colors = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)'];
type Slice = { name: string; value: number };
type SliceGeometry = { cx: number; cy: number; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number; index: number };

function DistributionReadout({ amount, total, label }: { amount: number; total: number; label: string }) {
  const displayAmount = useCountUpPrecise(amount);
  const percentage = share(amount, total) ?? 0;
  return <div data-distribution-readout className="pointer-events-none absolute inset-0">
    <span aria-live="polite" aria-atomic="true" className="sr-only">{label}：{percent(percentage)} · {money(amount)}</span>
    <div aria-hidden="true">
      <ChartCenterReadout label={label} value={percentage} format={percent} caption={money(displayAmount)} size="title"
        className="gap-1 [&>span:last-child]:mt-0" />
    </div>
  </div>;
}

function DistributionSlice({ rows, total, selected, sweep, reducedMotion, onSelect, onClear, ...geometry }: Partial<SliceGeometry> & {
  rows: Slice[]; total: number | null; selected: number | null; sweep: MotionValue<number>;
  reducedMotion: boolean | null; onSelect: (index: number) => void; onClear: () => void;
}) {
    const [visibleSweep, setVisibleSweep] = useState(sweep.get());
    useMotionValueEvent(sweep, 'change', setVisibleSweep);
    const { cx: x, cy: y, innerRadius, outerRadius, startAngle, endAngle, index } = geometry as SliceGeometry;
    const row = rows[index];
    const visibleEnd = Math.max(endAngle, 90 - visibleSweep);
    const isSelected = selected === index;
    const angle = -(startAngle + endAngle) / 2 * Math.PI / 180;
    const offset = isSelected && rows.length > 1 ? 8 : 0;
    if (!row || visibleEnd >= startAngle) return <g />;
    return <g data-distribution-slice role="button" tabIndex={0} aria-label={`${row.name} ${percent(share(row.value, total))}`} aria-pressed={isSelected}
      onPointerEnter={() => onSelect(index)} onPointerLeave={onClear}
      onFocus={() => onSelect(index)} onBlur={onClear}
      onClick={() => onSelect(index)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(index); }
        if (event.key === 'Escape') onClear();
      }}
      className="cursor-pointer outline-none focus-visible:[&>g>path]:stroke-border-focus-ring focus-visible:[&>g>path]:stroke-2">
      {/* Keep the pointer target stationary so moving a slice cannot interrupt its own hover. */}
      <Sector cx={x} cy={y} innerRadius={innerRadius} outerRadius={outerRadius + 10} startAngle={startAngle} endAngle={visibleEnd}
        fill="transparent" stroke="none" pointerEvents="all" />
      <g pointerEvents="none" style={{ transform: `translate(${Math.cos(angle) * offset}px, ${Math.sin(angle) * offset}px)`, opacity: selected === null || isSelected ? 1 : 0.45, transition: reducedMotion ? 'none' : 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms ease-out' }}>
        <Sector cx={x} cy={y} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={visibleEnd}
        fill={colors[index % colors.length]} stroke="var(--color-background-secondary-default)" strokeWidth={2} />
      </g>
    </g>;
}

function DistributionChart({ rows, total }: { rows: Slice[]; total: number | null }) {
  const [selected, setSelected] = useState<number | null>(null);
  const sweep = useMotionValue(0);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion) { sweep.set(360); return; }
    const animation = animate(sweep, 360, { duration: 1.8, ease: [0.33, 0, 0.15, 1] });
    return () => animation.stop();
  }, [reducedMotion, sweep]);
  const active = selected === null ? undefined : rows[selected];
  return rows.length > 0 && total !== null && total > 0 ? <>
      <div className="flex flex-1 items-center justify-center">
      <div className="relative aspect-square w-full max-w-96" onPointerLeave={() => setSelected(null)}
        onPointerMove={event => { if (!(event.target as Element).closest('[data-distribution-slice]')) setSelected(null); }}
        onKeyDown={event => { if (event.key === 'Escape') setSelected(null); }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart accessibilityLayer={false}><Pie data={rows} dataKey="value" nameKey="name" innerRadius="80%" outerRadius="90%"
            startAngle={90} endAngle={-270} paddingAngle={2} isAnimationActive={false}
            shape={<DistributionSlice rows={rows} total={total} selected={selected} sweep={sweep} reducedMotion={reducedMotion} onSelect={setSelected} onClear={() => setSelected(null)} />} /></PieChart>
        </ResponsiveContainer>
        <DistributionReadout amount={active?.value ?? total} total={total} label={active?.name ?? '总资产'} />
      </div>
      </div>
    </> : <p role="status" className="py-8 text-body-regular text-text-tertiary">暂无可展示的资产分布</p>;
}

export function InvestmentDistribution({ rows, total, dimension, onDimensionChange }: {
  rows: Slice[]; total: number | null; dimension: DistributionDimension; onDimensionChange: (dimension: DistributionDimension) => void;
}) {
  return <section aria-label="资产分布" className="flex min-w-0 flex-col gap-4 rounded-3xl bg-background-secondary-default p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-body-medium text-text-secondary">资产分布</h2>
      <Select aria-label="资产分布视角" size="sm" selectedKey={dimension}
        className="shrink-0" triggerClassName="h-8" popoverClassName="w-48 transition-none"
        onSelectionChange={key => {
          const selected = distributionDimensions.find(item => item.id === key);
          if (selected) onDimensionChange(selected.id);
        }}>
        {distributionDimensions.map(item => <SelectItem key={item.id} id={item.id}>{item.label}</SelectItem>)}
      </Select>
    </div>
    <DistributionChart key={JSON.stringify([dimension, rows, total])} rows={rows} total={total} />
  </section>;
}

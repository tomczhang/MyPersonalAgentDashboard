"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useReducedMotion } from "motion/react";
import { Tooltip as PointTooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  ChartCard,
  ChartHeader,
  ChartLegend,
  ChartStatTiles,
  describeDelta,
  formatNumber,
  resolveTone,
  useChartRange,
  type ChartRange,
} from "@/components/application/charts/chart-card";
import { cx } from "@/utils/cx";

/**
 * Scatter / bubble chart card on Recharts `ScatterChart` - the correlation
 * view: one dot per record, positioned by two measures, optionally sized by a
 * third (`z`, which turns it into a bubble chart).
 *
 * `series` groups the points so each cohort gets its own colour and legend
 * row. Hovering a point swaps the headline to it and dims the other series;
 * axis captions sit under the plot the way the Sankey card labels its ends.
 */

export type ScatterPoint = {
  x: number;
  y: number;
  /** Bubble size input. Any point carrying `z` switches the card to bubbles. */
  z?: number;
  /** Name shown in the header while the point is hovered. */
  label?: string;
};

export type ScatterSeries = {
  label: string;
  points: ScatterPoint[];
  /** Any CSS colour; defaults to the chart palette by series index. */
  color?: string;
  activeColor?: string;
};

/** A selectable period: pill label + the props it overrides. */
export type ScatterRange = ChartRange<{
  series: ScatterSeries[];
  delta: number;
  headline: number;
}>;

export interface ScatterChartCardProps {
  /** Optional application header for a separately defined headline metric. */
  header?: ReactNode;
  renderTooltip?: (point: ScatterPoint) => ReactNode;
  pointLabel?: (point: ScatterPoint) => string;
  legendValue?: (series: ScatterSeries) => string;
  emptyMessage?: string;
  /** Header label; swaps to the hovered point while hovering. */
  title?: string;
  series?: ScatterSeries[];
  /** Captions under the plot: `[x, y]`. */
  axisLabels?: [string, string];
  /** Force bubbles on/off; by default any `z` in the data turns them on. */
  bubble?: boolean;
  /** Headline number at rest; defaults to the average y across every point. */
  headline?: number;
  /** Delta ratio for the chip, e.g. `0.052` → "+5.2%". */
  delta?: number;
  /** Static period pill ("This quarter"). Ignored when `ranges` is set. */
  range?: string;
  /** Selectable periods - the pill becomes a dropdown and the selected
   *  range's fields override the top-level props. */
  ranges?: ScatterRange[];
  /** Initially selected range id (defaults to the first). */
  defaultRange?: string;
  onRangeChange?: (id: string) => void;
  /** Formats the y measure (headline, axis, tiles). */
  format?: (n: number) => string;
  /** Formats the x measure (axis ticks, hovered point caption). */
  formatX?: (n: number) => string;
  /** Stat tiles under the chart, one per series (its average y). */
  tiles?: boolean;
  className?: string;
}

const points = (pairs: [number, number, number?][], labels: string[]): ScatterPoint[] =>
  pairs.map(([x, y, z], i) => ({ x, y, z, label: labels[i] }));

const DEFAULT_SERIES: ScatterSeries[] = [
  {
    label: "Starter",
    points: points(
      [
        [12, 180, 40],
        [18, 240, 60],
        [24, 210, 30],
        [31, 320, 80],
        [38, 290, 50],
        [45, 380, 70],
      ],
      ["Acme", "Bolt", "Corvus", "Delta", "Ember", "Flux"],
    ),
  },
  {
    label: "Growth",
    points: points(
      [
        [42, 620, 90],
        [55, 740, 120],
        [61, 690, 70],
        [68, 880, 150],
        [74, 810, 100],
        [83, 960, 130],
      ],
      ["Gale", "Helio", "Ionic", "Juno", "Kite", "Lumen"],
    ),
  },
  {
    label: "Scale",
    points: points(
      [
        [78, 1240, 180],
        [86, 1420, 220],
        [92, 1310, 160],
        [97, 1580, 260],
      ],
      ["Meridian", "Nova", "Orbit", "Prism"],
    ),
  },
];

const scaleSeries = (series: ScatterSeries[], factor: number): ScatterSeries[] =>
  series.map((s) => ({
    ...s,
    points: s.points.map((p) => ({ ...p, y: Math.round(p.y * factor) })),
  }));

/** Demo periods used when no data props are given at all. */
const DEFAULT_RANGES: ScatterRange[] = [
  { id: "q3", label: "This quarter", series: DEFAULT_SERIES, delta: 0.068 },
  { id: "q2", label: "Last quarter", series: scaleSeries(DEFAULT_SERIES, 0.82), delta: 0.041 },
  { id: "year", label: "This year", series: scaleSeries(DEFAULT_SERIES, 3.6), delta: -0.019 },
];

const compactNumber = (n: number) =>
  n >= 1000 ? `${Math.round(n / 100) / 10}K`.replace(".0K", "K") : String(Math.round(n));

/** Bubble area range, px². Big enough to read, small enough not to collide. */
const BUBBLE_RANGE: [number, number] = [0, 1800];
/** Both the domain and area range start at zero: area ratios equal value ratios. */
export function bubbleAreaDomain(points: ScatterPoint[]): [number, number] {
  return [0, Math.max(1, ...points.map(point => Math.max(0, point.z ?? 0)))];
}
function axisTicks(min: number, max: number) {
  const rough = Math.max(Number.EPSILON, max - min) / 5;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round((end - start) / step) + 1 }, (_, index) => Number((start + index * step).toPrecision(12)));
}
/** Opacity of the other series while a point is hovered. */
const DIM = 0.25;

type PointReadoutHandle = { show: (key: string, point: ScatterPoint) => void; hide: () => void };
// Keep tooltip state outside Recharts' animated symbols: it may replace a
// symbol on hover. Resolve its current DOM node when positioning the overlay.
const PointReadout = forwardRef<PointReadoutHandle, { plot: RefObject<HTMLDivElement | null>; render: (point: ScatterPoint) => ReactNode }>(
  function PointReadout({ plot, render }, ref) {
    const [selection, setSelection] = useState<{ key: string; point: ScatterPoint } | null>(null);
    useImperativeHandle(ref, () => ({ show: (key, point) => setSelection({ key, point }), hide: () => setSelection(null) }), []);
    const triggerRef = useMemo(() => ({ get current() {
      return selection ? plot.current?.querySelector(`[data-point-key="${selection.key}"]`) as unknown as HTMLElement ?? null : null;
    } }), [plot, selection]);
    useEffect(() => {
      if (!selection) return;
      const dismiss = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelection(null); };
      document.addEventListener('keydown', dismiss);
      return () => document.removeEventListener('keydown', dismiss);
    }, [selection]);
    return <TooltipTrigger isOpen={selection !== null} onOpenChange={open => {
      // Keyboard focus can scroll the page while opening; retain its readout.
      if (!open && triggerRef.current !== document.activeElement) setSelection(null);
    }}><PointTooltip triggerRef={triggerRef}
      placement="top" shouldFlip containerPadding={8} className="motion-reduce:transition-none">
      {selection && render(selection.point)}
    </PointTooltip></TooltipTrigger>;
  },
);

export function ScatterChartCard({
  title = "Revenue per account",
  series: seriesProp,
  axisLabels,
  bubble: bubbleProp,
  headline: headlineProp,
  delta: deltaProp,
  range,
  ranges,
  defaultRange,
  onRangeChange,
  format = formatNumber,
  formatX = compactNumber,
  tiles = false,
  className,
  header,
  renderTooltip,
  pointLabel,
  legendValue,
  emptyMessage = "暂无可展示的数据",
}: ScatterChartCardProps = {}) {
  const localize = useTemplateCopy();
  const reducedMotion = useReducedMotion();
  const plot = useRef<HTMLDivElement>(null);
  const readout = useRef<PointReadoutHandle>(null);
  const [active, setActive] = useState<{ series: number; index: number } | null>(null);

  // Built-in demo periods when the host supplies neither ranges nor series.
  const demo = ranges === undefined && range === undefined && seriesProp === undefined;
  const rangeList = ranges ?? (demo ? DEFAULT_RANGES : undefined);
  const { selected, selectedId, select } = useChartRange(rangeList, defaultRange, onRangeChange);
  const selectRange = (id: string) => {
    setActive(null);
    select(id);
  };

  const series = selected?.series ?? seriesProp ?? DEFAULT_SERIES;
  const headline = selected?.headline ?? headlineProp;
  const delta = selected?.delta ?? deltaProp;
  const tones = series.map((s, i) => resolveTone(i, s.color, s.activeColor));

  const allPoints = series.flatMap((s) => s.points);
  const zDomain = bubbleAreaDomain(allPoints);
  const xMax = Math.max(1, ...allPoints.map(point => point.x));
  const xMin = Math.min(0, ...allPoints.map(point => point.x));
  const yMax = Math.max(0, ...allPoints.map(point => point.y));
  const yMin = Math.min(0, ...allPoints.map(point => point.y));
  const yPadding = Math.max(1, (yMax - yMin) * 0.15);
  const xTicks = axisTicks(xMin, xMax + (xMax - xMin) * 0.15);
  const yTicks = axisTicks(yMin - yPadding, yMax + yPadding);
  const bubble = bubbleProp ?? allPoints.some((p) => p.z !== undefined);
  const averageOf = (list: ScatterPoint[]) =>
    list.length ? list.reduce((sum, p) => sum + p.y, 0) / list.length : 0;

  const hovering = active !== null;
  const hoveredSeries = active ? series[active.series] : undefined;
  const hoveredPoint = active ? hoveredSeries?.points[active.index] : undefined;
  const headerLabel = hoveredPoint
    ? `${hoveredPoint.label ?? hoveredSeries?.label} · ${formatX(hoveredPoint.x)}`
    : title;
  // The resting figure is an average, so round it - a fractional headline
  // reads as false precision next to the points' own whole values.
  const headlineValue = hoveredPoint ? hoveredPoint.y : (headline ?? Math.round(averageOf(allPoints)));

  const legendItems = series.map((s, i) => ({
    label: s.label,
    color: tones[i].color,
    value: legendValue ? legendValue(s) : format(Math.round(averageOf(s.points))),
  }));

  return localize((
    <ChartCard className={cx(tiles && "h-auto", className)}>
      {header ?? <ChartHeader
        label={headerLabel}
        value={headlineValue}
        format={format}
        delta={delta !== undefined ? describeDelta(delta) : undefined}
        hovering={hovering}
        fadeKey={`${selectedId ?? ""}:${active ? `${active.series}:${active.index}` : "idle"}`}
        range={range}
        ranges={rangeList}
        rangeId={selectedId}
        onRangeChange={selectRange}
      />}

      {allPoints.length > 0 ? <div ref={plot} className={cx("min-h-0 w-full flex-1", tiles && "h-[196px] flex-none")}
        onPointerLeave={() => readout.current?.hide()}
        onPointerMove={event => { if (!(event.target as Element).closest('[data-scatter-point]')) readout.current?.hide(); }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ScatterChart margin={{ top: 24, right: 28, bottom: 8, left: 4 }} accessibilityLayer={false}>
            <CartesianGrid stroke="var(--color-chart-track)" strokeDasharray="4 4" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[xTicks[0], xTicks[xTicks.length - 1]]}
              ticks={xTicks}
              tickCount={5}
              tickFormatter={formatX}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fill: "var(--color-text-tertiary)" }}
              className="text-caption-1-regular"
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[yTicks[0], yTicks[yTicks.length - 1]]}
              ticks={yTicks}
              width={64}
              tickCount={4}
              tickFormatter={format}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--color-text-tertiary)" }}
              className="text-caption-1-regular"
            />
            {bubble && <ZAxis type="number" dataKey="z" domain={zDomain} range={BUBBLE_RANGE} scale="linear" />}
            {/* Headless: the header carries the hovered point's values. */}
            {!renderTooltip && <Tooltip content={() => null} cursor={false} isAnimationActive={false} />}
            {series.map((s, i) => {
              const dimmed = active !== null && active.series !== i;
              return (
                <Scatter
                  key={s.label}
                  name={s.label}
                  data={s.points}
                  activeShape={false}
                  fill={tones[i].color}
                  fillOpacity={dimmed ? DIM : 0.85}
                  stroke={tones[i].activeColor}
                  strokeOpacity={dimmed ? DIM : 1}
                  strokeWidth={1.5}
                  className="cursor-default transition-opacity duration-200 ease-out motion-reduce:transition-none"
                  shape={renderTooltip ? (props: unknown) => {
                    const { cx: x, cy: y, size, payload, fill, stroke, fillOpacity, strokeOpacity, index } = props as {
                      cx: number; cy: number; size: number; payload: ScatterPoint; fill: string; stroke: string; fillOpacity: number; strokeOpacity: number; index: number;
                    };
                    return <circle cx={x} cy={y} r={Math.sqrt(Math.max(0, size) / Math.PI)} fill={fill} stroke={stroke}
                          fillOpacity={fillOpacity} strokeOpacity={strokeOpacity} strokeWidth={1.5}
                          tabIndex={0} role="img" aria-label={pointLabel?.(payload) ?? payload.label}
                          data-scatter-point data-market-value={payload.z} data-point-key={`${i}:${index}`}
                          onPointerEnter={() => readout.current?.show(`${i}:${index}`, payload)} onPointerLeave={() => readout.current?.hide()}
                          onFocus={event => { event.stopPropagation(); readout.current?.show(`${i}:${index}`, payload); }}
                          onBlur={event => { event.stopPropagation(); readout.current?.hide(); }}
                          className="outline-none focus-visible:stroke-border-focus-ring focus-visible:stroke-2" />;
                  } : undefined}
                  onMouseEnter={renderTooltip ? undefined : (_, index: number) => setActive({ series: i, index })}
                  onMouseLeave={renderTooltip ? undefined : () => setActive(null)}
                  isAnimationActive={!reducedMotion}
                  animationDuration={360}
                />
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>
      </div> : <p role="status" className="flex min-h-60 flex-1 items-center justify-center text-body-regular text-text-tertiary">{emptyMessage}</p>}
      {renderTooltip && <PointReadout ref={readout} plot={plot} render={renderTooltip} />}

      {axisLabels && (
        <div className="flex w-full justify-between text-caption-1-medium text-text-tertiary">
          <span>{axisLabels[1]}</span>
          <span>{axisLabels[0]}</span>
        </div>
      )}

      {!tiles && <ChartLegend items={legendItems} className="pb-1" />}

      {tiles && (
        <ChartStatTiles
          items={series.map((s, i) => ({
            label: `${s.label} · avg`,
            value: format(Math.round(averageOf(s.points))),
            color: tones[i].color,
            activeColor: tones[i].activeColor,
          }))}
          activeIndex={active?.series ?? null}
          onActiveChange={(index) => setActive(index === null ? null : { series: index, index: 0 })}
        />
      )}
    </ChartCard>
  ));
}

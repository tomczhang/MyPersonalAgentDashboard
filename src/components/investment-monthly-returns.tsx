"use client";
import { forwardRef, useLayoutEffect, useRef, useState, type ReactNode, type ComponentProps } from 'react';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react';
import { Focusable } from 'react-aria-components';
import { Panel } from '@/components/module-content';
import { SegmentedControl, SegmentedControlItem } from '@/components/base/segmented-control/segmented-control';
import { Select, SelectItem } from '@/components/base/select/select';
import { Tooltip, TooltipTrigger } from '@/components/base/tooltip/tooltip';
import type { Investment } from '@/data/investment-view';
import { cx } from '@/utils/cx';

const months = Array.from({ length: 12 }, (_, index) => `${index + 1}月`);
const fills = {
  positive: ['bg-chart-return-positive/15', 'bg-chart-return-positive/25', 'bg-chart-return-positive/40', 'bg-chart-return-positive'],
  negative: ['bg-chart-return-negative/15', 'bg-chart-return-negative/25', 'bg-chart-return-negative/40', 'bg-chart-return-negative'],
};

function returnCell(value: number | null, maximum: number) {
  const tone = value === null ? 'missing' : value === 0 ? 'zero' : value > 0 ? 'positive' : 'negative';
  const band = value === null || value === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil(Math.abs(value) / maximum * 4)));
  const label = value === null ? '' : `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(1)}%`;
  return { tone, band, label } as const;
}

function cellClasses(cell: ReturnType<typeof returnCell>) {
  return cx('rounded-md whitespace-nowrap',
    cell.tone === 'positive' || cell.tone === 'negative' ? fills[cell.tone][cell.band - 1] : 'bg-background-secondary-default',
    cell.band === 4 ? 'text-chart-return-on-fill' : 'text-text-primary');
}

export function formatReturnAmount(amount: number | null | undefined, currency: Investment['currency']) {
  if (amount == null) return '暂无盈亏金额';
  return `${amount < 0 ? '−' : '+'}${currency} ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount))}`;
}

function ReturnCell({ period, amount, currency, children, className, ...props }: ComponentProps<'td'> & {
  period: string; amount?: number | null; currency: Investment['currency'];
}) {
  const present = useIsPresent();
  return <TooltipTrigger isDisabled={!present}>
    <Focusable>
      <td {...props} tabIndex={0} className={cx(className, 'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus-ring')}>
        {children}
      </td>
    </Focusable>
    {present && <Tooltip placement="top" shouldFlip containerPadding={8} className="motion-reduce:transition-none">
      <div className="flex flex-col gap-1">
        <span className="text-text-secondary">{period}</span>
        <span className="text-body-2-medium text-text-primary">{amount != null && (amount > 0 ? '盈利 ' : amount < 0 ? '亏损 ' : '持平 ')}<bdi dir="ltr" className="tabular-nums">{formatReturnAmount(amount, currency)}</bdi></span>
      </div>
    </Tooltip>}
  </TooltipTrigger>;
}

// Only map supplied percentage points to presentation. All years share one scale.
// Compute bands before rendering cells; null and zero never enter a signed band.
export function monthlyReturnsData(data: NonNullable<Investment['monthlyReturns']>) {
  const maximum = data.reduce((max, row) => row.months.reduce<number>((m, value) => Math.max(m, Math.abs(value ?? 0)), max), 0);
  return data.map(row => ({
    year: row.year,
    months: row.months.map((value, index) => ({ ...returnCell(value, maximum), amount: row.pnlAmounts?.[index] })),
  }));
}

export function MonthlyReturnsMatrix({ data, currency = 'USD' }: { data: NonNullable<Investment['monthlyReturns']>; currency?: Investment['currency'] }) {
  const rows = monthlyReturnsData(data);
  return <div className="flex min-w-0 flex-col gap-4">
      {/* Dedicated signed matrix, explicitly approved in place of the official heatmap.
          Native row/column headers keep the display accessible without chart tooling. */}
      <div role="region" aria-label="月度收益矩阵，可横向滚动" tabIndex={0} className="max-w-full overflow-x-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring">
        <table aria-label="月度收益率" className="w-full min-w-160 border-separate border-spacing-1 text-center text-caption-1-medium tabular-nums">
          <thead><tr>
            <th scope="col" className="px-2 py-2 text-text-primary">年份</th>
            {months.map(month => <th key={month} scope="col" className="px-1 py-2 text-text-primary">{month}</th>)}
          </tr></thead>
          <tbody>{rows.map((row, index) => <tr key={`${row.year}:${index}`}>
            <th scope="row" className="px-2 py-2 text-text-primary"><bdi>{row.year}</bdi></th>
            {row.months.map((cell, month) => <ReturnCell
              key={month}
              period={`${row.year}年${months[month]}`} amount={cell.amount} currency={currency}
              data-tone={cell.tone}
              data-band={cell.band}
              aria-label={cell.tone === 'missing' ? `${row.year}年${months[month]}，无数据` : undefined}
              className={cx('min-w-12 px-1 py-3', cellClasses(cell))}
            ><bdi dir="ltr">{cell.label}</bdi></ReturnCell>)}
          </tr>)}</tbody>
        </table>
      </div>
    </div>;
}

/** Calendar dates use UTC so leap days and weekday positions are timezone independent. */
export function dailyReturnsData(data: NonNullable<Investment['dailyReturns']>, month: string) {
  const first = new Date(`${month}-01T00:00:00Z`);
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const values = new Map(data.map(point => [point.date, point]));
  const maximum = data.reduce((max, point) => Math.max(max, Math.abs(point.returnPct ?? 0)), 0);
  return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    if (day < 1 || day > days) return null;
    const date = `${month}-${String(day).padStart(2, '0')}`;
    const point = values.get(date);
    return { day, date, amount: point?.pnlAmount, ...returnCell(point?.returnPct ?? null, maximum) };
  });
}

function DailyReturnsCalendar({ data, month, currency }: { data: NonNullable<Investment['dailyReturns']>; month: string; currency: Investment['currency'] }) {
  const cells = dailyReturnsData(data, month);
  return <table aria-label={`${month} 日度收益率`} className="w-full table-fixed border-separate border-spacing-1 text-center text-caption-1-medium tabular-nums">
    <thead><tr>{['一', '二', '三', '四', '五', '六', '日'].map(day => <th key={day} scope="col" className="py-2 text-text-secondary">{day}</th>)}</tr></thead>
    <tbody>{Array.from({ length: cells.length / 7 }, (_, week) => <tr key={week}>
      {cells.slice(week * 7, week * 7 + 7).map((cell, index) => cell ? <ReturnCell key={cell.date}
        period={cell.date} amount={cell.amount} currency={currency}
        data-tone={cell.tone} data-band={cell.band}
        aria-label={`${cell.date}，${cell.tone === 'missing' ? '无数据' : cell.label}`}
        className={cx('h-16 px-0.5 py-2', cellClasses(cell))}>
        <div className="flex flex-col items-center gap-1"><span>{cell.day}</span><bdi dir="ltr">{cell.label || '—'}</bdi></div>
      </ReturnCell> : <td key={`blank-${index}`} aria-hidden="true" />)}
    </tr>)}</tbody>
  </table>;
}

// Measure the incoming view while the outgoing view leaves normal flow. Animate
// the actual container height so the rest of the dashboard moves smoothly too.
const ReturnView = forwardRef<HTMLDivElement, { children: ReactNode; onHeight: (height: number) => void; reduced: boolean }>(
  function ReturnView({ children, onHeight, reduced }, ref) {
    const content = useRef<HTMLDivElement>(null);
    const present = useIsPresent();
    useLayoutEffect(() => {
      const node = content.current;
      if (!node || !present) return;
      const measure = () => onHeight(node.offsetHeight);
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(node);
      return () => observer.disconnect();
    }, [onHeight, present]);
    return <motion.div ref={ref} inert={!present} aria-hidden={!present || undefined}
      initial={reduced ? false : { opacity: 0, scale: 0.98, filter: 'blur(2px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.15 } }}
      transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="w-full origin-top transform-gpu">
      <div ref={content}>{children}</div>
    </motion.div>;
  },
);

export function InvestmentMonthlyReturns({ data, dailyData, currency = 'USD' }: { data?: Investment['monthlyReturns']; dailyData?: Investment['dailyReturns']; currency?: Investment['currency'] }) {
  const [granularity, setGranularity] = useState('daily');
  const [chosenMonth, setChosenMonth] = useState<string>();
  const [height, setHeight] = useState<number>();
  const reduced = !!useReducedMotion();
  const availableMonths = [...new Set((dailyData ?? []).map(point => point.date.slice(0, 7)))].sort().reverse();
  const month = chosenMonth && availableMonths.includes(chosenMonth) ? chosenMonth : availableMonths[0];
  if (!data?.length && !dailyData?.length) return null;
  return <Panel title="收益热力图" className="border-0 bg-background-secondary-default">
    <div className="mb-4 flex min-h-10 flex-wrap items-center justify-between gap-3">
      <SegmentedControl aria-label="收益时间粒度" selectedKeys={[granularity]} onSelectionChange={keys => setGranularity(String([...keys][0]))}
        className="motion-reduce:[&_*]:transition-none">
        <SegmentedControlItem id="daily">日度</SegmentedControlItem>
        <SegmentedControlItem id="monthly">月度</SegmentedControlItem>
      </SegmentedControl>
      {granularity === 'daily' && month && <Select aria-label="日度收益月份" size="sm" selectedKey={month}
        onSelectionChange={key => setChosenMonth(String(key))} popoverClassName="w-48 motion-reduce:transition-none">
        {availableMonths.map(value => <SelectItem key={value} id={value}>{value.replace('-', '年')}月</SelectItem>)}
      </Select>}
    </div>
    <motion.div data-testid="returns-viewport" initial={false} animate={{ height: height ?? 'auto' }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30 }} className="relative overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <ReturnView key={granularity === 'daily' ? `daily:${month}` : 'monthly'} onHeight={setHeight} reduced={reduced}>
          {granularity === 'daily'
            ? month && dailyData?.length ? <DailyReturnsCalendar data={dailyData} month={month} currency={currency} /> : <p role="status" className="py-8 text-body-regular text-text-tertiary">暂无日度收益数据</p>
            : data?.length ? <MonthlyReturnsMatrix data={data} currency={currency} /> : <p role="status" className="py-8 text-body-regular text-text-tertiary">暂无月度收益数据</p>}
        </ReturnView>
      </AnimatePresence>
    </motion.div>
  </Panel>;
}

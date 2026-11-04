"use client";
import { Panel } from '@/components/module-content';
import type { Investment } from '@/data/investment-view';
import { cx } from '@/utils/cx';

const months = Array.from({ length: 12 }, (_, index) => `${index + 1}月`);
const fills = {
  positive: ['bg-chart-return-positive/15', 'bg-chart-return-positive/25', 'bg-chart-return-positive/40', 'bg-chart-return-positive'],
  negative: ['bg-chart-return-negative/15', 'bg-chart-return-negative/25', 'bg-chart-return-negative/40', 'bg-chart-return-negative'],
};

// Only map supplied percentage points to presentation. All years share one scale.
// Compute bands before rendering cells; null and zero never enter a signed band.
export function monthlyReturnsData(data: NonNullable<Investment['monthlyReturns']>) {
  const maximum = data.reduce((max, row) => row.months.reduce<number>((m, value) => Math.max(m, Math.abs(value ?? 0)), max), 0);
  return data.map(row => ({
    year: row.year,
    months: row.months.map(value => {
      const tone = value === null ? 'missing' : value === 0 ? 'zero' : value > 0 ? 'positive' : 'negative';
      const band = value === null || value === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil(Math.abs(value) / maximum * 4)));
      const label = value === null ? '' : `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(1)}%`;
      return { tone, band, label };
    }),
  }));
}

export function InvestmentMonthlyReturns({ data }: { data?: Investment['monthlyReturns'] }) {
  if (!data?.length) return null;
  const rows = monthlyReturnsData(data);
  return <Panel title="月度收益" className="border-0 bg-background-secondary-default">
    <div className="flex min-w-0 flex-col gap-4">
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
            {row.months.map((cell, month) => <td
              key={month}
              data-tone={cell.tone}
              data-band={cell.band}
              aria-label={cell.tone === 'missing' ? `${row.year}年${months[month]}，无数据` : undefined}
              className={cx('min-w-12 rounded-md px-1 py-3 whitespace-nowrap',
                cell.tone === 'positive' || cell.tone === 'negative' ? fills[cell.tone][cell.band - 1] : 'bg-background-secondary-default',
                cell.band === 4 ? 'text-chart-return-on-fill' : 'text-text-primary')}
            ><bdi dir="ltr">{cell.label}</bdi></td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  </Panel>;
}

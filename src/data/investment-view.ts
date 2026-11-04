import type { DataMap } from '@/data/schema';

export type Investment = DataMap['investment'];
export type Position = Investment['holdings'][number] & Partial<NonNullable<Investment['positions']>[number]>;
export type Range = '1M' | 'YTD' | '1Y' | 'Max';
export const money = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
export const percent = (value: number | null | undefined) => value == null ? '—' : `${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)}%`;
export const share = (value: number, total: number | null) => total === null || total === 0 ? null : value / total * 100;

export function investmentView(data: Investment, accountId: string, frameworkOnly: boolean) {
  const allPositions: Position[] = data.positions ?? data.holdings;
  const allAmmo = data.ammo ?? data.cashTiers;
  const filtered = accountId !== 'all' || frameworkOnly;
  const matches = (row: { accountId?: string; inFramework?: boolean }) =>
    (accountId === 'all' || row.accountId === accountId) && (!frameworkOnly || row.inFramework === true);
  const positions = allPositions.filter(matches);
  const ammo = allAmmo.filter(matches);
  // Missing attribution is unknown, never a zero balance or an inferred account.
  const complete = [...allPositions, ...allAmmo].every(row =>
    (accountId === 'all' || row.accountId !== undefined) && (!frameworkOnly || row.inFramework !== undefined));
  const cash = complete ? ammo.reduce((sum, row) => sum + row.amount.value, 0) : null;
  const total = cash === null ? null : cash + positions.reduce((sum, row) => sum + row.valueUsd.value, 0);
  const buckets = data.framework.buckets.map(bucket => {
    const mapped = positions.every(row => row.inFramework === false || row.bucket !== undefined) && ammo.every(row => row.inFramework === false || row.bucket !== undefined);
    const amount = !filtered ? bucket.amount.value : complete && mapped
      ? positions.filter(row => row.bucket === bucket.name && row.inFramework !== false).reduce((sum, row) => sum + row.valueUsd.value, 0)
        + ammo.filter(row => row.bucket === bucket.name && row.inFramework !== false).reduce((sum, row) => sum + row.amount.value, 0)
      : null;
    return { name: bucket.name, target: bucket.targetRatio.value * 100, actual: amount === null ? null : share(amount, total),
      gap: !filtered ? bucket.gap.value : amount === null || total === null ? null : total * bucket.targetRatio.value - amount };
  });
  const gap = buckets.some(bucket => bucket.gap === null) ? null : buckets.reduce((sum, bucket) => sum + Math.max(0, bucket.gap!), 0);
  return { positions, ammo, total, cash, buckets, gap, complete, filtered };
}

export function filterSeries<T extends { date: string }>(series: T[] | undefined, range: Range, asOf: string): T[] {
  const end = new Date(`${asOf}T00:00:00Z`);
  let start = '0000-01-01';
  if (range === 'YTD') start = `${asOf.slice(0, 4)}-01-01`;
  if (range === '1M' || range === '1Y') {
    const day = end.getUTCDate();
    end.setUTCDate(1);
    if (range === '1M') end.setUTCMonth(end.getUTCMonth() - 1);
    else end.setUTCFullYear(end.getUTCFullYear() - 1);
    const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
    end.setUTCDate(Math.min(day, lastDay));
    start = end.toISOString().slice(0, 10);
  }
  return (series ?? []).filter(point => point.date >= start && point.date <= asOf).sort((a, b) => a.date.localeCompare(b.date));
}

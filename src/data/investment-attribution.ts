import type { Investment, Position } from '@/data/investment-view';

export type AttributionFilter = 'all' | 'closed' | 'open';
export type AttributionRow = { symbol: string; amount: number | null; pnlPct: number | null; status: 'open' | 'closed' | 'mixed' };
type SourceRow = AttributionRow & { cost: number | undefined };

/** Open unrealized and closed realized P/L are disjoint; never infer closed P/L from quantity or total return. */
export function attributionData(data: Investment, account: string, frameworkOnly: boolean) {
  const matches = (row: { accountId?: string; inFramework?: boolean }) =>
    (account === 'all' || row.accountId === account) && (!frameworkOnly || row.inFramework === true);
  const positions: Position[] = data.positions ?? data.holdings;
  const open: SourceRow[] = positions.filter(row => row.qty.value > 0 && matches(row))
    .map(row => ({ symbol: row.symbol, amount: row.pnlAmount ?? null, pnlPct: row.pnlPct ?? null, status: 'open', cost: row.buyInAmount }));
  const closed: SourceRow[] = (data.closedPositions ?? []).filter(matches)
    .map(row => ({ symbol: row.symbol, amount: row.pnlAmount, pnlPct: row.pnlPct ?? null, status: 'closed', cost: row.buyInAmount }));
  const group = (rows: SourceRow[]): AttributionRow[] => {
    const groups = new Map<string, SourceRow[]>();
    for (const row of rows) {
      const group = groups.get(row.symbol) ?? [];
      group.push(row);
      groups.set(row.symbol, group);
    }
    return [...groups].map(([symbol, items]): AttributionRow => {
      const amount = items.some(item => item.amount === null) ? null : items.reduce((sum, item) => sum + item.amount!, 0);
      // Percentages cannot be added or averaged. Only combine them with complete supplied cost bases.
      const cost = items.every(item => item.cost != null && item.cost > 0) ? items.reduce((sum, item) => sum + item.cost!, 0) : null;
      const ratio = items.length === 1 && items[0].pnlPct !== null ? items[0].pnlPct
        : amount !== null && cost !== null ? amount / cost * 100 : null;
      return { symbol, amount, pnlPct: ratio !== null && Number.isFinite(ratio) ? ratio : null,
        status: items.every(item => item.status === items[0].status) ? items[0].status : 'mixed' };
    }).sort((a, b) =>
      a.amount === null ? b.amount === null ? a.symbol.localeCompare(b.symbol) : 1
        : b.amount === null ? -1 : b.amount - a.amount || a.symbol.localeCompare(b.symbol));
  };
  const filters = { all: group([...open, ...closed]), open: group(open), closed: group(closed) };
  const sourceRows = [...positions.filter(row => row.qty.value > 0), ...(data.closedPositions ?? [])];
  const incompleteScope = sourceRows.some(row => (account !== 'all' && row.accountId === undefined)
    || (frameworkOnly && row.inFramework === undefined));
  return { filters, closedAvailable: data.closedPositions !== undefined, incompleteScope };
}

/** One linear domain across filters, with evenly spaced, round-number ticks including zero. */
export function attributionScale(rows: Pick<AttributionRow, 'amount'>[]) {
  let low = 0;
  let high = 0;
  for (const { amount } of rows) {
    if (amount !== null) { low = Math.min(low, amount); high = Math.max(high, amount); }
  }
  if (low === high) return { domain: [-1, 1] as [number, number], ticks: [-1, -0.5, 0, 0.5, 1] };
  const rawStep = (high - low) / 5;
  const power = 10 ** Math.floor(Math.log10(rawStep));
  const step = ([1, 2, 5, 10].find(value => value * power >= rawStep) ?? 10) * power;
  const start = Math.floor(low / step);
  const end = Math.ceil(high / step);
  const ticks = Array.from({ length: end - start + 1 }, (_, index) => Number(((start + index) * step).toPrecision(12)));
  return { domain: [ticks[0], ticks[ticks.length - 1]] as [number, number], ticks };
}

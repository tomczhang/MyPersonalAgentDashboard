"use client";
import { useMemo, useState } from 'react';
import type { SortDescriptor } from 'react-aria-components';
import { RiArrowDownLine, RiArrowUpLine, RiExpandUpDownLine, RiSearchLine } from '@remixicon/react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@/components/base/table/table';
import { Input } from '@/components/base/input/input';
import { Chip } from '@/components/base/badges/chip';
import { Meter } from '@/components/base/meter/meter';
import { money, percent, share, type Position } from '@/data/investment-view';
import { cx } from '@/utils/cx';

const columns = [
  { id: 'symbol', label: '股票代码' }, { id: 'qty', label: '持仓股数' },
  { id: 'cost', label: '平均成本' }, { id: 'value', label: '价值' },
  { id: 'pnl', label: '浮盈/浮亏' }, { id: 'return', label: '总回报' },
  { id: 'weight', label: '资产配置占比' },
] as const;
type Column = typeof columns[number]['id'];
const signed = (value: number | null | undefined, ratio = false) => value == null ? '—' : `${value > 0 ? '+' : ''}${ratio ? percent(value) : money(value)}`;
const returnColor = (value: number | null | undefined) => value == null || value === 0 ? 'soft' : value > 0 ? 'lime' : 'rose';
function ReturnCell({ amount, ratio }: { amount: number | null | undefined; ratio: number | null | undefined }) {
  return <div className="flex flex-col items-end gap-1">
    <span className="text-body-medium">{signed(amount)}</span>
    <span className="text-caption-1-regular text-text-secondary">{ratio == null ? '—' : <Chip variant="caption" color={returnColor(ratio)}>{signed(ratio, true)}</Chip>}</span>
  </div>;
}
function AllocationCell({ value, total, symbol }: { value: number; total: number | null; symbol: string }) {
  const allocation = share(value, total);
  return <div className="flex items-center justify-center gap-3">
    {allocation != null && <Meter aria-label={`${symbol} 资产配置占比`} value={allocation} minValue={0} maxValue={100} size="md" className="w-20 shrink-0" />}
    <span className="min-w-14 text-center">{percent(allocation)}</span>
  </div>;
}
const valueOf = (row: Position, key: Column, total: number | null) => {
  switch (key) {
    case 'symbol': return row.symbol;
    case 'qty': return row.qty.value;
    case 'cost': return row.buyInPerShare;
    case 'value': return row.valueUsd.value;
    case 'pnl': return row.pnlAmount;
    case 'return': return row.totalReturn;
    case 'weight': return share(row.valueUsd.value, total);
  }
};

export function InvestmentHoldings({ positions, total }: { positions: Position[]; total: number | null }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortDescriptor>({ column: 'symbol', direction: 'ascending' });
  const rows = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return positions.map((position, index) => ({ position, id: `${position.accountId}:${position.symbol}:${index}` }))
      .filter(({ position }) => `${position.symbol} ${position.name ?? ''}`.toLocaleLowerCase().includes(search))
      .sort((a, b) => {
        const left = valueOf(a.position, sort.column as Column, total);
        const right = valueOf(b.position, sort.column as Column, total);
        // Unknown values remain last in either direction, never treated as zero.
        if (left == null) return right == null ? 0 : 1;
        if (right == null) return -1;
        const comparison = typeof left === 'string' && typeof right === 'string'
          ? left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' }) : Number(left) - Number(right);
        return sort.direction === 'descending' ? -comparison : comparison;
      });
  }, [positions, total, query, sort]);
  return <section aria-label="持仓明细" className="min-w-0 overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default">
    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-col gap-1"><h2 className="text-body-medium text-text-tertiary">持仓明细</h2><span className="text-headline-medium text-text-primary">{rows.length} 项持仓 <span className="text-body-2-regular text-text-tertiary">· USD</span></span></div>
      <Input aria-label="搜索持仓" placeholder="搜索代码或名称" leadingIcon={RiSearchLine}
        value={query} onChange={setQuery} className="ms-auto w-full sm:w-60"
        fieldClassName="h-10 rounded-full bg-background-secondary-default px-3" />
    </div>
    <Table aria-label="投资持仓明细" sortDescriptor={sort} onSortChange={setSort}
      className="investment-holdings-table min-w-max" containerClassName="outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring">
      <TableHeader>{columns.map(column => <TableColumn key={column.id} id={column.id} isRowHeader={column.id === 'symbol'} allowsSorting>
        {({ sortDirection }) => {
          const Icon = sortDirection === 'ascending' ? RiArrowUpLine : sortDirection === 'descending' ? RiArrowDownLine : RiExpandUpDownLine;
          return <span className={cx('flex items-center gap-1 whitespace-nowrap', column.id === 'weight' ? 'justify-center' : column.id !== 'symbol' && 'justify-end')}>
            {column.label}<Icon aria-hidden className="size-3.5 shrink-0" />
          </span>;
        }}
      </TableColumn>)}</TableHeader>
      <TableBody items={rows} renderEmptyState={() => query.trim() ? '没有匹配的持仓' : '当前视图暂无持仓'}>
        {({ position: row, id }) => <TableRow id={id} textValue={`${row.symbol} ${row.name ?? ''}`}>
          <TableCell><div className="flex flex-col items-start gap-1"><bdi dir="ltr" className="text-body-medium">{row.symbol}</bdi>{row.name && <bdi className="text-caption-1-regular text-text-secondary">{row.name}</bdi>}{row.inFramework === false && <Chip variant="caption" color="soft">框架外</Chip>}</div></TableCell>
          <TableCell className="text-end tabular-nums">{row.qty.value.toLocaleString('zh-CN', { maximumFractionDigits: 8 })}</TableCell>
          <TableCell className="text-end whitespace-nowrap tabular-nums">{money(row.buyInPerShare)}</TableCell>
          <TableCell className="text-end whitespace-nowrap tabular-nums">{money(row.valueUsd.value)}</TableCell>
          <TableCell className="text-end whitespace-nowrap tabular-nums"><ReturnCell amount={row.pnlAmount} ratio={row.pnlPct} /></TableCell>
          <TableCell className="text-end whitespace-nowrap tabular-nums"><ReturnCell amount={row.totalReturn} ratio={row.totalReturnPct} /></TableCell>
          <TableCell className="text-center whitespace-nowrap tabular-nums"><AllocationCell value={row.valueUsd.value} total={total} symbol={row.symbol} /></TableCell>
        </TableRow>}
      </TableBody>
    </Table>
  </section>;
}

import { Badge } from '@/components/base/badges/badge';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@/components/base/table/table';
import { Panel } from '@/components/module-content';
import { money, percent, type Investment } from '@/data/investment-view';
import { cx } from '@/utils/cx';

const statuses = {
  triggered: { label: '已触发', tone: 'bg-accent-600 text-text-white' },
  near: { label: '临近触发', tone: 'bg-status-orange-background text-status-orange-text' },
  watching: { label: '观察中', tone: 'bg-badge-neutral-background text-text-secondary' },
};

export function InvestmentAlerts({ alerts, asOf }: { alerts: Investment['alerts']; asOf: string }) {
  if (!alerts?.length) return null;
  return <Panel title="触发 / 观察名单">
    <p className="mb-4 text-caption-1-medium text-text-tertiary">全组合观察名单 · 价格 USD · 截至 {asOf} · 状态与距触发比例读取槽位，不随账户 / 框架筛选</p>
    <Table size="sm" aria-label="触发与观察名单">
      <TableHeader><TableColumn isRowHeader>标的 / 状态</TableColumn><TableColumn>触发与参考</TableColumn></TableHeader>
      <TableBody>{alerts.map((row, i) => <TableRow key={`${row.symbol}:${i}`} id={`${row.symbol}:${i}`}>
        <TableCell><div className="flex min-w-0 flex-col gap-2 py-2">
          <span className="break-words text-body-2-medium"><bdi>{row.name}</bdi></span>
          <span className="text-caption-1-medium text-text-tertiary"><bdi dir="ltr">{row.symbol}</bdi> · {row.direction}</span>
          <span><Badge className={cx('rounded-full px-2 py-1', statuses[row.status].tone)}>{statuses[row.status].label}</Badge></span>
          <p className="break-words text-caption-1-medium text-text-tertiary">{row.note}</p>
        </div></TableCell>
        <TableCell><div className="flex flex-col gap-2 whitespace-nowrap text-caption-1-medium tabular-nums">
          <span className="text-body-2-medium text-text-primary">距触发 {percent(row.distancePct)}</span>
          <span className="text-text-secondary">触发价 {money(row.triggerPrice)}</span>
          <span className="text-text-tertiary">参考价 {money(row.referencePrice)}</span>
        </div></TableCell>
      </TableRow>)}</TableBody>
    </Table>
  </Panel>;
}

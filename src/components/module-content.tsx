"use client";
import type { ReactNode } from 'react';
import { Badge } from '@/components/base/badges/badge';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@/components/base/table/table';
import { StatCards } from '@/components/application/dashboard/stat-cards';
import { isStale, type Metric, type ModuleData, type Meta } from '@/data/schema';
import { confidenceLabels, formatMetric, kpis, moduleInfo, statusLabels } from '@/data/presentation';
import type { LoadedModule } from '@/data/load';
import { cx } from '@/utils/cx';

export function Panel({ title, children, className, titleClassName }: { title: string; children: ReactNode; className?: string; titleClassName?: string }) {
  return <section className={cx('min-w-0 rounded-3xl border border-border-button-default bg-background-primary-default p-5 sm:p-6', className)}><h2 className={cx('mb-4 text-headline-medium text-text-primary', titleClassName)}>{title}</h2>{children}</section>;
}
export function Status({ meta }: { meta: Meta }) {
  return <span className="inline-flex flex-wrap items-center gap-2"><Badge className={cx('rounded-full px-3 py-1', meta.status === 'confirmed' && 'bg-accent-100 text-accent-800')}>{statusLabels[meta.status]}</Badge>{isStale(meta) && <Badge className="rounded-full px-3 py-1">已过复核期</Badge>}</span>;
}
export function Provenance({ metric }: { metric: Metric }) {
  return <span className="block break-words text-caption-1-medium text-text-primary/65">截至 <time dateTime={metric.asOf}>{metric.asOf}</time> · <bdi>{metric.source}</bdi></span>;
}
export function NumberValue({ metric }: { metric: Metric }) {
  return <span className="flex flex-col gap-1 py-1"><bdi className="text-body-medium text-text-primary tabular-nums">{formatMetric(metric)}</bdi><Provenance metric={metric} /></span>;
}
export function Metadata({ loaded }: { loaded: LoadedModule }) {
  const { data, origin } = loaded;
  const meta = data.meta;
  return <div className="flex flex-col gap-3 rounded-3xl border border-border-button-default bg-background-secondary-default p-4">
    <div className="flex flex-wrap items-center gap-3"><Status meta={meta} /><span className="text-body-2-medium text-text-primary/75">{origin === 'example' ? '示例回退 · 非个人正式数据' : '本地数据'} · <bdi>{data.owner}</bdi></span></div>
    <dl className="grid grid-cols-2 gap-3 text-caption-1-medium text-text-primary/65 sm:grid-cols-3">
      <div><dt>快照日期</dt><dd className="text-text-primary/75">{meta.asOf}</dd></div><div><dt>来源</dt><dd className="break-words text-text-primary/75"><bdi>{meta.source}</bdi></dd></div>
      <div><dt>置信度</dt><dd className="text-text-primary/75">{confidenceLabels[meta.confidence]}</dd></div><div><dt>更新者</dt><dd className="text-text-primary/75"><bdi>{meta.updatedBy}</bdi></dd></div>
      <div><dt>确认者</dt><dd className="text-text-primary/75"><bdi>{meta.confirmedBy ?? '尚未确认'}</bdi></dd></div><div><dt>复核期限（UTC）</dt><dd className="text-text-primary/75">{meta.reviewAfter}</dd></div>
    </dl>
  </div>;
}
function DataTable({ title, headers, rows }: { title: string; headers: string[]; rows: ReactNode[][] }) {
  return <Table aria-label={title}>
    <TableHeader>{headers.map((header, index) => <TableColumn key={header} id={header} isRowHeader={index === 0}>{header}</TableColumn>)}</TableHeader>
    <TableBody renderEmptyState={() => '暂无记录；Muse 尚未填写此列表。'}>{rows.map((row, index) => <TableRow key={index} id={String(index)}>{row.map((cell, col) => <TableCell key={col}>{cell}</TableCell>)}</TableRow>)}</TableBody>
  </Table>;
}
const note = (value: string) => <span className="block min-w-40 text-body-2-regular text-text-primary/75"><bdi>{value}</bdi></span>;
export function ModuleContent({ loaded }: { loaded: LoadedModule }) {
  const data = loaded.data;
  return <>
    <Metadata loaded={loaded} />
    <StatCards stats={kpis(data).map(kpi => ({ label: kpi.label, value: formatMetric(kpi.metric), caption: <Provenance metric={kpi.metric} />, icon: moduleInfo[data.module].icon }))} />
    {data.module !== 'health' && <p className="text-caption-1-medium text-text-primary/65">金额单位：<bdi>{data.currency}</bdi>{data.module === 'cashflow' ? ` · 统计月份：${data.period}` : ''} · 当前数值均遵循上方确认状态。</p>}
    <Details data={data} />
  </>;
}
function Details({ data }: { data: ModuleData }) {
  switch (data.module) {
    case 'investment': return <>
      <Panel title="子弹 / 现金分层"><DataTable title="现金分层" headers={['层级', '存放位置', '金额']} rows={data.cashTiers.map(row => [row.tier, note(row.location), <NumberValue metric={row.amount} />])} /></Panel>
      <Panel title="受管账户"><DataTable title="受管账户" headers={['账户', '掩码标识', '净资产 NAV', '数据日期', '置信度']} rows={data.accounts.map(row => [row.name, <bdi dir="ltr">{row.idMasked}</bdi>, <NumberValue metric={row.nav} />, row.dataDate, confidenceLabels[row.confidence]])} /></Panel>
      <Panel title="持仓明细"><DataTable title="持仓明细" headers={['代码', '数量', '标记价格', '美元市值', '备注']} rows={data.holdings.map(row => [<bdi dir="ltr">{row.symbol}</bdi>, <NumberValue metric={row.qty} />, <NumberValue metric={row.markPrice} />, <NumberValue metric={row.valueUsd} />, note(row.note)])} /></Panel>
      <Panel title="独立账户 · 单独观察"><div className="grid gap-4 sm:grid-cols-2">{data.independentAccounts.length ? data.independentAccounts.map((row, index) => <article key={index} className="flex flex-col gap-3 rounded-3xl border border-border-button-default bg-background-secondary-default p-4">
        <h3 className="text-body-medium text-text-primary">{row.name}</h3><p className="text-caption-1-medium text-text-primary/75"><bdi dir="ltr">{row.idMasked}</bdi> · {row.includedInManagedAssets ? '计入受管资产' : '不计入受管资产'}</p><NumberValue metric={row.nav} /><p className="text-caption-1-medium text-text-primary/65">数据日期 {row.dataDate} · 置信度 {confidenceLabels[row.confidence]}</p>{note(row.note)}
      </article>) : note('暂无独立账户。')}</div></Panel>
      <Panel title="配置框架"><div className="flex flex-col gap-5">
        <p className="text-body-regular text-text-primary/75"><bdi>{data.framework.note}</bdi></p>
        <StatCards stats={[{ label: '现金目标占比', metric: data.framework.cashTargetRatio }, { label: '现金实际占比', metric: data.framework.cashActualRatio }, { label: '现金缺口（目标 − 实际）', metric: data.framework.cashGap }].map(item => ({ label: item.label, value: formatMetric(item.metric), caption: <Provenance metric={item.metric} />, icon: moduleInfo.investment.icon }))} />
        <DataTable title="三桶配置" headers={['资金桶', '目标权重', '目标占比', '实际占比', '实际金额', '缺口']} rows={data.framework.buckets.map(row => [row.name, <NumberValue metric={row.targetWeight} />, <NumberValue metric={row.targetRatio} />, <NumberValue metric={row.actualRatio} />, <NumberValue metric={row.amount} />, <NumberValue metric={row.gap} />])} />
      </div></Panel>
    </>;
    case 'cashflow': return <Panel title="收支明细"><DataTable title="收支明细" headers={['项目', '类型', '金额', '备注']} rows={data.entries.map(row => [row.label, row.kind === 'income' ? '收入' : '支出', <NumberValue metric={row.amount} />, note(row.note)])} /></Panel>;
    case 'family-assets': return <>
      <Panel title="家庭资产目录"><DataTable title="家庭资产目录" headers={['资产', '分类', '归属', '估值', '备注']} rows={data.assets.map(row => [row.name, row.category, row.owner, <NumberValue metric={row.value} />, note(row.note)])} /></Panel>
      <Panel title="负债目录"><DataTable title="负债目录" headers={['负债', '余额', '备注']} rows={data.liabilities.map(row => [row.name, <NumberValue metric={row.balance} />, note(row.note)])} /></Panel>
    </>;
    case 'insurance': return <Panel title="保障与续期"><p className="mb-4 text-body-regular text-text-primary/75">{data.note}</p><div className="grid gap-4 xl:grid-cols-2">{data.policies.length ? data.policies.map((row, index) => <article key={index} className="flex flex-col gap-4 rounded-3xl border border-border-button-default bg-background-secondary-default p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-headline-medium text-text-primary">{row.name}</h3><Badge>{row.state}</Badge></div><p className="text-body-2-regular text-text-primary/75">{row.insured} · {row.provider}</p><p className="text-caption-1-medium text-text-primary/65">保单 <bdi dir="ltr">{row.policyIdMasked}</bdi></p>
      <dl className="grid grid-cols-2 gap-4"><div><dt className="text-body-2-medium text-text-primary/65">保额</dt><dd><NumberValue metric={row.coverage} /></dd></div><div><dt className="text-body-2-medium text-text-primary/65">年度保费</dt><dd><NumberValue metric={row.annualPremium} /></dd></div></dl>
      <p className="text-body-2-medium text-text-primary/75">续期日期 <time>{row.renewalDate}</time></p>{note(row.note)}
    </article>) : note('暂无保单记录。')}</div></Panel>;
    case 'health': return <Panel title="日常健康记录"><p className="mb-4 text-body-regular text-text-primary/75">{data.note}</p><DataTable title="日常健康记录" headers={['指标', '记录', '设备', '备注']} rows={data.records.map(row => [row.label, <NumberValue metric={row.measurement} />, row.device, note(row.note)])} /></Panel>;
  }
}

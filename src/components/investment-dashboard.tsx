"use client";
import { useState, type ReactNode } from 'react';
import { RiBankLine, RiCoinsLine, RiFundsLine, RiPieChartLine } from '@remixicon/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Badge } from '@/components/base/badges/badge';
import { SegmentedControl, SegmentedControlItem } from '@/components/base/segmented-control/segmented-control';
import { Select, SelectItem } from '@/components/base/select/select';
import { Tabs, TabList, Tab, TabPanel } from '@/components/base/tabs/tabs';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@/components/base/table/table';
import { StatCards } from '@/components/application/dashboard/stat-cards';
import { Chip } from '@/components/base/badges/chip';
import { describeDelta } from '@/components/application/charts/chart-card';
import { InvestmentDistribution } from '@/components/investment-distribution';
import { InvestmentNavCard } from '@/components/investment-nav-card';
import { InvestmentBenchmarkCard } from '@/components/investment-benchmark-card';
import { InvestmentMonthlyReturns } from '@/components/investment-monthly-returns';
import { InvestmentAlerts } from '@/components/investment-alerts';
import { Panel, Status } from '@/components/module-content';
import { confidenceLabels } from '@/data/presentation';
import { investmentView, investmentDistribution, investmentKpiChanges, money, percent, share, type DistributionDimension, type Investment, type Range } from '@/data/investment-view';
import { cx } from '@/utils/cx';

const colors = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)'];
const signed = (v: number | null | undefined, pct = false) => v == null ? '—' : `${v > 0 ? '+' : ''}${pct ? percent(v) : money(v)}`;
const tone = (v: number | null | undefined) => v == null || v === 0 ? 'text-text-primary/75' : v > 0 ? 'text-chart-7-active' : 'text-chart-3-active';
const performanceRows = [
  ['investedCapital', '投入资本'], ['priceGain', '价格收益'], ['dividends', '分红'], ['realized', '已实现'], ['costs', '成本'], ['totalReturn', '总回报'], ['twrPct', 'TWR'],
] as const;

function Empty({ children }: { children: ReactNode }) {
  return <p role="status" className="py-8 text-body-regular text-text-primary/65">{children}</p>;
}
function Comparison({ name, actual, target, gap, color }: { name: string; actual: number | null; target: number; gap: number | null; color: string }) {
  return <div className="flex flex-col gap-2">
    <div className="flex flex-wrap justify-between gap-2 text-body-2-medium"><span className="text-text-primary">{name}</span><span className="text-text-primary/75">实际 {percent(actual)} / 目标 {percent(target)}</span></div>
    <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="h-5 w-full" role="img" aria-label={`${name}，实际 ${percent(actual)}，目标 ${percent(target)}`}>
      <rect width="100" height="10" rx="2" fill="var(--color-background-tertiary-default)" />
      <rect width={Math.min(100, Math.max(0, actual ?? 0))} height="10" rx="2" fill={color} />
      <line x1={target} x2={target} y1="0" y2="10" stroke="var(--color-text-primary)" strokeWidth="0.6" />
    </svg>
    <p className="text-caption-1-medium text-text-primary/65">{gap == null ? '缺少归属信息，无法计算缺口' : gap > 0 ? `缺口 ${money(gap)}` : gap < 0 ? `超配 ${money(-gap)}` : '已达目标'}</p>
  </div>;
}

function AllocationRing({ rows, label, percentage = false, className, interactive = true }: { rows: { name: string; value: number }[]; label: string; percentage?: boolean; className?: string; interactive?: boolean }) {
  return <div className={cx('h-44 w-full', className)} role="img" aria-label={label}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}><PieChart><Pie data={rows} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={2} stroke="var(--color-background-primary-default)" isAnimationActive={false}>
      {rows.map((row, i) => <Cell key={`${row.name}:${i}`} fill={colors[i % colors.length]} />)}
    </Pie>{interactive && <Tooltip formatter={v => percentage ? percent(Number(v)) : money(Number(v))} contentStyle={{ background: 'var(--color-background-primary-default)', borderColor: 'var(--color-border-button-default)', borderRadius: 12, color: 'var(--color-text-primary)' }} />}</PieChart></ResponsiveContainer>
  </div>;
}

export function InvestmentDashboard({ data }: { data: Investment; origin: 'example' | 'local' }) {
  const [account, setAccount] = useState('all');
  const [scope, setScope] = useState('all');
  const [distributionDimension, setDistributionDimension] = useState<DistributionDimension>('holding');
  const [range, setRange] = useState<Range>('YTD');
  const years = Object.keys(data.performanceByYear ?? {}).sort((a, b) => Number(b) - Number(a));
  const [chosenYear, setChosenYear] = useState<string>();
  const year = chosenYear && years.includes(chosenYear) ? chosenYear : years[0];
  const performance = year ? data.performanceByYear?.[year] : undefined;
  const view = investmentView(data, account, scope === 'framework');
  const accountName = account === 'all' ? '聚合账户' : data.accounts.find(row => row.idMasked === account)?.name ?? '所选账户';
  const scopeLabel = `${accountName} · ${scope === 'all' ? '全部持仓' : '仅框架内'}`;
  const cashRatio = view.cash === null ? null : share(view.cash, view.total);
  const holdingTotal = view.positions.reduce((sum, row) => sum + row.valueUsd.value, 0);
  const topThreeTotal = [...view.positions].sort((a, b) => b.valueUsd.value - a.valueUsd.value).slice(0, 3).reduce((sum, row) => sum + row.valueUsd.value, 0);
  const concentration = view.complete ? share(topThreeTotal, holdingTotal) : null;
  const filteredPerformance = view.filtered ? undefined : performance?.totalReturn;
  const cashGap = view.total === null || view.cash === null ? null : view.total * data.framework.cashTargetRatio.value - view.cash;
  const distribution = investmentDistribution(view, data.accounts, distributionDimension);
  const changes = investmentKpiChanges(data, view.filtered, year, { total: view.total, cashRatio, concentration });
  const delta = (change: number | null) => {
    const display = change === null ? { label: '—', color: 'neutral' as const } : describeDelta(change);
    return <Chip variant="bold" color={display.color} className="tabular-nums"
      aria-label={change === null ? '暂无可比变化比例' : `较上期快照（${changes.asOf}）变化 ${display.label}`}>{display.label}</Chip>;
  };
  const kpiMoney = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);

  return <>
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Status meta={data.meta} />
        <span className="text-caption-1-medium text-text-tertiary">截至 <time dateTime={data.meta.asOf}>{data.meta.asOf}</time> · USD · <bdi>{data.owner}</bdi></span>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SegmentedControl aria-label="投资账户" selectedKeys={[account]} onSelectionChange={keys => setAccount(String([...keys][0]))} className="max-w-full flex-wrap">
          <SegmentedControlItem id="all">聚合账户</SegmentedControlItem>
          {data.accounts.map(row => <SegmentedControlItem key={row.idMasked} id={row.idMasked}>{row.name}</SegmentedControlItem>)}
        </SegmentedControl>
        <SegmentedControl aria-label="持仓视图" selectedKeys={[scope]} onSelectionChange={keys => setScope(String([...keys][0]))}>
          <SegmentedControlItem id="all">全部持仓</SegmentedControlItem><SegmentedControlItem id="framework">仅框架内</SegmentedControlItem>
        </SegmentedControl>
      </div>
    </div>
    <div className="grid min-w-0 items-stretch gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col [&>section]:flex-1">
        <InvestmentNavCard data={data} range={range} onRangeChange={setRange} />
      </div>
      <InvestmentDistribution rows={distribution} total={view.total} dimension={distributionDimension} onDimensionChange={setDistributionDimension} />
    </div>
        <div className="flex flex-col gap-3">
          <p aria-live="polite" className="sr-only">当前视图：{scopeLabel}</p>
          {!view.complete && <p role="status" className="text-body-2-medium text-text-error-primary">槽位缺少账户或框架归属；仅列出已匹配条目，汇总与权重暂不显示。</p>}
          <p className="text-caption-1-medium text-text-tertiary">{changes.asOf ? <>变化比例 · 较上期快照 <time dateTime={changes.asOf}>{changes.asOf}</time></> : '变化比例 · 暂无可比历史快照'}</p>
          <StatCards borderless variant="summary" className="xl:grid-cols-4" stats={[
            { label: '组合总值', value: kpiMoney(view.total), delta: delta(changes.total), icon: RiBankLine },
            { label: '现金占比', value: percent(cashRatio), delta: delta(changes.cash), icon: RiCoinsLine },
            { label: `${year ?? '年度'} 收益`, value: `${filteredPerformance != null && filteredPerformance > 0 ? '+' : ''}${kpiMoney(filteredPerformance)}`, delta: delta(changes.income), icon: RiFundsLine,
              trailing: years.length > 0 && <Select aria-label="KPI 收益年份" size="sm" selectedKey={year} onSelectionChange={key => setChosenYear(String(key))} className="shrink-0" triggerClassName="h-8" popoverClassName="w-48 transition-none">{years.map(y => <SelectItem key={y} id={y}>{y} 年</SelectItem>)}</Select> },
            { label: '集中度', value: percent(concentration), delta: delta(changes.concentration), icon: RiPieChartLine },
          ]} />
        </div>
    <div className="grid min-w-0 items-start gap-5 xl:grid-cols-12">
      <div className="flex min-w-0 flex-col gap-5 xl:col-span-8">
        <InvestmentBenchmarkCard data={data} />
        <InvestmentAlerts watchlist={data.watchlist} asOf={data.meta.asOf} />
        <Panel title="持仓明细" className="border-0 bg-background-secondary-default">
          <p className="mb-4 text-caption-1-medium text-text-tertiary">{view.positions.length} 项 · USD</p>
          <Table size="sm" aria-label="投资持仓明细"><TableHeader><TableColumn isRowHeader>名称 / 代码 × 股数</TableColumn><TableColumn className="hidden sm:table-cell">Buy in</TableColumn><TableColumn>市值<span className="sm:hidden"> / P/L</span></TableColumn><TableColumn className="hidden sm:table-cell">权重</TableColumn><TableColumn className="hidden sm:table-cell">现价</TableColumn><TableColumn className="hidden sm:table-cell">P/L</TableColumn></TableHeader><TableBody renderEmptyState={() => '当前视图暂无持仓'}>{view.positions.map((row, i) => <TableRow key={`${row.accountId}:${row.symbol}:${i}`} id={`${row.accountId}:${row.symbol}:${i}`}>
            <TableCell><div className="flex min-w-0 flex-col gap-1 py-2"><span className="break-words text-body-2-medium"><bdi>{row.name ?? row.symbol}</bdi></span><span className="text-caption-1-medium text-text-primary/65"><bdi dir="ltr">{row.symbol} × {row.qty.value.toLocaleString('zh-CN')}</bdi> {row.qty.unit}</span><div className="flex flex-col gap-1 text-caption-1-medium text-text-primary/65 sm:hidden"><span>Buy in {money(row.buyInAmount)}</span><span>均价 {money(row.buyInPerShare)}</span></div>{row.inFramework === false && <span className="text-caption-1-medium text-text-primary/65">框架外</span>}</div></TableCell>
            <TableCell className="hidden sm:table-cell"><div className="flex flex-col gap-1 whitespace-nowrap tabular-nums"><span>{money(row.buyInAmount)}</span><span className="text-caption-1-medium text-text-primary/65">均价 {money(row.buyInPerShare)}</span></div></TableCell>
            <TableCell><div className="flex flex-col gap-1 whitespace-nowrap tabular-nums"><span>{money(row.valueUsd.value)}</span><div className="flex flex-col gap-1 text-caption-1-medium sm:hidden"><span className={tone(row.pnlAmount)}>P/L {signed(row.pnlAmount)}</span><span className={tone(row.pnlPct)}>{signed(row.pnlPct, true)}</span></div></div></TableCell><TableCell className="hidden sm:table-cell">{percent(share(row.valueUsd.value, view.total))}</TableCell><TableCell className="hidden sm:table-cell">{money(row.markPrice.value)}</TableCell>
            <TableCell className="hidden sm:table-cell"><div className={cx('flex flex-col gap-1 whitespace-nowrap tabular-nums', tone(row.pnlAmount))}><span>{signed(row.pnlAmount)}</span><span className={cx('text-caption-1-medium', tone(row.pnlPct))}>{signed(row.pnlPct, true)}</span></div></TableCell>
          </TableRow>)}</TableBody></Table>
        </Panel>
        <Panel title="子弹分层" className="border-0 bg-background-secondary-default">
          <Table size="sm" aria-label="子弹分层"><TableHeader><TableColumn isRowHeader>层级</TableColumn><TableColumn>存放位置</TableColumn><TableColumn>金额 USD</TableColumn><TableColumn>占总值</TableColumn></TableHeader><TableBody renderEmptyState={() => '当前视图暂无现金记录'}>{view.ammo.map((row, i) => <TableRow key={i} id={i}><TableCell>{row.tier}</TableCell><TableCell><bdi>{row.location}</bdi></TableCell><TableCell>{money(row.amount.value)}</TableCell><TableCell>{percent(share(row.amount.value, view.total))}</TableCell></TableRow>)}</TableBody></Table>
        </Panel>
        <InvestmentMonthlyReturns data={data.monthlyReturns} />
      </div>
      <div className="flex min-w-0 flex-col gap-5 xl:col-span-4">
        <Panel title="资产配置" className="border-0 bg-background-secondary-default">
          <Tabs defaultSelectedKey="framework">
            <TabList aria-label="配置视角"><Tab id="framework">框架</Tab><Tab id="holdings">持仓</Tab></TabList>
            <TabPanel id="framework"><div className="flex flex-col gap-4">
              <AllocationRing rows={view.buckets.map(bucket => ({ name: bucket.name, value: bucket.target }))} label="框架目标配置，比例见下方图例" percentage />
              {view.buckets.map((bucket, i) => <Comparison key={bucket.name} {...bucket} color={colors[i]} />)}
              <div className="border-t border-separator-border pt-4"><Comparison name="现金（已包含在三桶中）" actual={cashRatio} target={data.framework.cashTargetRatio.value * 100} gap={cashGap} color={colors[3]} /></div>
            </div></TabPanel>
            <TabPanel id="holdings">
              {holdingTotal > 0 ? <>
                <AllocationRing rows={view.positions.map(row => ({ name: row.name ?? row.symbol, value: row.valueUsd.value }))} label="当前持仓市值分布，数值见下方图例" />
                <ul className="flex flex-col gap-2">{view.positions.map((row, i) => <li key={`${row.accountId}:${row.symbol}:${i}`} className="flex items-center justify-between gap-3 text-body-2-medium"><span className="flex min-w-0 items-center gap-2"><span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: colors[i % colors.length] }} /><bdi>{row.name ?? row.symbol}</bdi></span><span className="text-text-primary/75 tabular-nums">{percent(share(row.valueUsd.value, holdingTotal))}</span></li>)}</ul>
              </> : <Empty>当前视图暂无持仓市值</Empty>}
            </TabPanel>
          </Tabs>
        </Panel>
        <Panel title="分年绩效拆解" className="border-0 bg-background-secondary-default">
          <p className="mb-4 text-caption-1-medium text-text-tertiary">全组合 · USD</p>
          {years.length ? <Tabs selectedKey={year} onSelectionChange={key => setChosenYear(String(key))}><TabList aria-label="绩效年份" className="flex-wrap">{years.map(y => <Tab key={y} id={y}>{y} 年</Tab>)}</TabList>{years.map(y => <TabPanel key={y} id={y}>
            <dl className="flex flex-col">{performanceRows.filter(([key]) => data.performanceByYear?.[y][key] != null).map(([key, label]) => { const value = data.performanceByYear![y][key]!; return <div key={key} className={cx('flex items-center justify-between gap-3 border-b border-separator-border py-2', (key === 'totalReturn' || key === 'twrPct') && 'bg-background-secondary-default px-2')}><dt className="text-body-medium text-text-primary/75">{label}</dt><dd className={cx('text-body-medium tabular-nums', key === 'investedCapital' ? 'text-text-primary' : tone(value))}>{key === 'investedCapital' ? money(value) : signed(value, key === 'twrPct')}</dd></div>; })}</dl>
            {Object.keys(data.performanceByYear![y]).length === 0 && <Empty>该年份尚未填写绩效数据</Empty>}
          </TabPanel>)}</Tabs> : <Empty>槽位暂无分年绩效数据</Empty>}
        </Panel>
        <Panel title="账户快照" className="border-0 bg-background-secondary-default">
          <div className="flex flex-col divide-y divide-separator-border">{data.accounts.filter(row => account === 'all' || row.idMasked === account).map(row => <article key={row.idMasked} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-body-medium text-text-primary"><bdi>{row.name}</bdi></h3><Badge className="rounded-full px-2">置信度 · {confidenceLabels[row.confidence]}</Badge></div>
            <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-headline-medium text-text-primary tabular-nums">{money(row.nav.value)}</p><p className="text-body-2-medium text-text-primary/75">占比 {percent(share(row.nav.value, data.accounts.reduce((sum, item) => sum + item.nav.value, 0)))}</p></div>
            <p className="text-caption-1-medium text-text-primary/65"><bdi dir="ltr">{row.idMasked}</bdi> · 数据日期 {row.dataDate}</p>
          </article>)}{!data.accounts.length && <Empty>暂无账户快照</Empty>}</div>
          {data.independentAccounts.length > 0 && <p className="mt-4 text-caption-1-medium text-text-primary/65">独立观察（不计入）：{data.independentAccounts.map(row => `${row.name} ${money(row.nav.value)} · ${row.dataDate}`).join('；')}</p>}
        </Panel>
      </div>
    </div>
  </>;
}

"use client";
import { useState } from 'react';
import { RiBankLine, RiCoinsLine, RiFundsLine, RiPieChartLine } from '@remixicon/react';
import { SegmentedControl, SegmentedControlItem } from '@/components/base/segmented-control/segmented-control';
import { Select, SelectItem } from '@/components/base/select/select';
import { StatCards } from '@/components/application/dashboard/stat-cards';
import { Chip } from '@/components/base/badges/chip';
import { describeDelta } from '@/components/application/charts/chart-card';
import { InvestmentDistribution } from '@/components/investment-distribution';
import { InvestmentNavCard } from '@/components/investment-nav-card';
import { InvestmentBenchmarkCard } from '@/components/investment-benchmark-card';
import { InvestmentMonthlyReturns } from '@/components/investment-monthly-returns';
import { InvestmentAlerts } from '@/components/investment-alerts';
import { InvestmentHoldings } from '@/components/investment-holdings';
import { InvestmentAttribution } from '@/components/investment-attribution';
import { InvestmentConcentration } from '@/components/investment-concentration';
import { Status } from '@/components/module-content';
import { investmentView, investmentDistribution, investmentKpiChanges, percent, share, type DistributionDimension, type Investment, type Range } from '@/data/investment-view';

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
    <div className="flex min-w-0 flex-col gap-5">
        <InvestmentBenchmarkCard data={data} />
        <InvestmentAlerts watchlist={data.watchlist} asOf={data.meta.asOf} />
        <InvestmentHoldings positions={view.positions} total={view.total} />
        <InvestmentAttribution data={data} account={account} frameworkOnly={scope === 'framework'} />
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-2">
          <InvestmentConcentration positions={view.positions} asOf={data.meta.asOf} />
          <InvestmentMonthlyReturns data={data.monthlyReturns} dailyData={data.dailyReturns} currency={data.currency} />
        </div>
    </div>
  </>;
}

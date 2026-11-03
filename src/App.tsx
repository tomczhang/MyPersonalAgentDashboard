"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { RiArrowRightUpLine, RiRefreshLine, RiShieldCheckLine } from '@remixicon/react';
import { DashboardShell } from '@/components/application/dashboard/dashboard-shell';
import { ThemeToggle } from '@/components/application/theme/theme-toggle';
import { Button, ButtonLink } from '@/components/base/buttons/button';
import { Select, SelectItem } from '@/components/base/select/select';
import { Metadata, ModuleContent, Panel, Provenance } from '@/components/module-content';
import { InvestmentDashboard } from '@/components/investment-dashboard';
import { loadModule, type LoadedModule } from '@/data/load';
import { moduleIds, type ModuleId } from '@/data/schema';
import { confidenceLabels, formatMetric, kpis, moduleIdFromHash, moduleInfo, navigation } from '@/data/presentation';

type Slot = { state: 'ready'; loaded: LoadedModule } | { state: 'error' };
export function App() {
  const [page, setPage] = useState(moduleIdFromHash);
  const [slots, setSlots] = useState<Partial<Record<ModuleId, Slot>>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++request.current;
    setLoading(true);
    const entries = await Promise.all(moduleIds.map(async id => {
      try { return [id, { state: 'ready', loaded: await loadModule(id) }] as const; }
      catch { return [id, { state: 'error' }] as const; }
    }));
    if (current !== request.current) return;
    setSlots(Object.fromEntries(entries));
    setLoading(false);
  }, []);
  useEffect(() => { void refresh(); return () => { request.current++; }; }, [refresh]);
  useEffect(() => {
    const change = () => { setPage(moduleIdFromHash()); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  const title = page === 'overview' ? '生活全景，一目了然。' : page === 'investment' ? '股票 Dashboard' : moduleInfo[page].title;
  const visible = moduleIds.filter(id => {
    const slot = slots[id];
    return filter === 'all' || (slot?.state === 'ready' && slot.loaded.data.meta.status === filter);
  });
  return <DashboardShell items={navigation} selected={page}>
    <header className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-caption-1-semibold text-text-tertiary">MUSE BOARD / {page === 'overview' ? '总览' : moduleInfo[page].title}</p><div className="flex gap-2"><span className="lg:hidden"><ThemeToggle /></span><Button variant="secondary" leadingIcon={RiRefreshLine} disabled={loading} onClick={() => void refresh()}>{loading ? '读取中…' : '刷新数据'}</Button></div></div>
      <div><h1 className="text-title-1-medium text-text-primary">{title}</h1><p className="mt-2 text-body-regular text-text-secondary">{page === 'overview' ? '把重要的事放在一起，让每一个数字都有出处。' : `${moduleInfo[page].subtitle} · ${moduleInfo[page].cadence}`}</p></div>
    </header>
    {loading ? <Panel title="正在读取数据"><p role="status" className="text-body-regular text-text-secondary">正在检查本地槽位与示例数据…</p></Panel> : page === 'overview' ? <>
      <section className="flex flex-col gap-5 rounded-3xl border border-border-button-default bg-background-secondary-default p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2"><p className="text-caption-1-semibold text-text-tertiary">固定模板 · 数据由你掌握</p><h2 className="text-title-3-semibold text-text-primary">Muse 整理，你来确认。</h2><p className="max-w-xl text-body-regular text-text-secondary">先填草稿，再确认。示例与草稿用于展示，只有「已确认」才是正式数值。不同模块口径独立，不跨模块相加。</p></div>
        <Button variant="secondary" leadingIcon={RiShieldCheckLine} onClick={() => document.getElementById('filling-help')?.scrollIntoView({ behavior: 'smooth' })}>如何填充数据</Button>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-headline-medium text-text-primary">模块概览</h2><Select aria-label="按数据状态筛选" selectedKey={filter} onSelectionChange={key => setFilter(String(key))} className="min-w-44"><SelectItem id="all">所有状态</SelectItem><SelectItem id="confirmed">已确认</SelectItem><SelectItem id="draft">待确认草稿</SelectItem><SelectItem id="example">示例数据</SelectItem></Select></div>
      <div className="grid gap-5 xl:grid-cols-2">{visible.map(id => {
        const slot = slots[id];
        if (!slot || slot.state === 'error') return <ErrorCard key={id} id={id} />;
        const { data } = slot.loaded;
        const [primary, ...secondary] = kpis(data);
        return <Panel key={id} title={moduleInfo[id].title}>
          <div className="flex flex-col gap-5">
            <div><p className="text-body-medium text-text-secondary">{primary.label}</p><p className="mt-1 break-words text-title-1-medium text-text-primary tabular-nums">{formatMetric(primary.metric)}</p><Provenance metric={primary.metric} /></div>
            <div className="grid grid-cols-2 gap-4">{secondary.map(item => <div key={item.label}><p className="text-caption-1-medium text-text-tertiary">{item.label}</p><p className="text-body-medium text-text-primary">{formatMetric(item.metric)}</p><Provenance metric={item.metric} /></div>)}</div>
            <Metadata loaded={slot.loaded} />
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-caption-1-medium text-text-tertiary">{moduleInfo[id].cadence} · 置信度 {confidenceLabels[data.meta.confidence]}</span><ButtonLink variant="ghost" size="small" href={`#${id}`} trailingIcon={RiArrowRightUpLine}>查看{moduleInfo[id].title}</ButtonLink></div>
          </div>
        </Panel>;
      })}</div>
      {visible.length === 0 && <Panel title="暂无此状态的数据"><p className="text-body-regular text-text-secondary">可切换「所有状态」查看模块，或让 Muse 按说明书更新本地槽位。</p></Panel>}
      <section id="filling-help"><Panel title="让你的 Muse 来填数据"><div className="flex flex-col gap-3 text-body-regular text-text-secondary"><p>请让你的 PA agent 阅读仓库中的 <code dir="ltr">docs/FILLING_GUIDE.md</code> 和 <code dir="ltr">data/CONTRACT.md</code>，按模块收集信息并创建待确认草稿。</p><p>真实数据仅存放在 <code dir="ltr">data/local/</code>。你确认后，Muse 才能将状态改为 confirmed；刷新页面即可读取新文件。</p></div></Panel></section>
    </> : slots[page]?.state === 'ready' ? <PageContent loaded={(slots[page] as Extract<Slot, { state: 'ready' }>).loaded} /> : <ErrorCard id={page} />}
    <footer className="flex flex-col gap-2 border-t border-separator-border py-4 text-caption-1-medium text-text-tertiary">
      {page === 'investment' && <p>组合总值 = 当前持仓市值 + 当前现金；持仓表权重以此总值为分母。集中度为前三大持仓市值占当前视图持仓总市值的比例，不含现金。仅框架内保留已标记的现金。筛选视图按同一目标比例重算配置缺口。独立观察账户不计入。</p>}
      <p>Muse Board · 公开模板仅包含虚构示例。数据状态、日期与来源以各槽位标注为准。</p>
    </footer>
  </DashboardShell>;
}
function PageContent({ loaded }: { loaded: LoadedModule }) {
  return loaded.data.module === 'investment'
    ? <InvestmentDashboard data={loaded.data} origin={loaded.origin} />
    : <ModuleContent loaded={loaded} />;
}
function ErrorCard({ id }: { id: ModuleId }) {
  return <Panel title={`${moduleInfo[id].title} · 暂时无法读取`}><p role="alert" className="text-body-regular text-text-error-primary">本地数据格式不符合契约，或读取失败。请让 Muse 检查对应文件后刷新；没有使用示例覆盖这一错误。</p></Panel>;
}

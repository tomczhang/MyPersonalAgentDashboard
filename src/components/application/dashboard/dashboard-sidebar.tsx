"use client";

import type { ComponentType } from 'react';
import { ButtonLink } from '@/components/base/buttons/button';
import { ThemeToggle } from '@/components/application/theme/theme-toggle';
import { cx } from '@/utils/cx';

export type DashboardNavItem = { key: string; label: string; icon: ComponentType<{ className?: string }>; href: string };
// Adapted from BoardUI template-home-dashboard: floating, rounded navigation rail.
export function DashboardSidebar({ items, selected }: { items: DashboardNavItem[]; selected: string }) {
  return <aside className="flex flex-col gap-6 rounded-3xl border border-border-button-default bg-background-secondary-default p-4 shadow-sidebar lg:sticky lg:top-4 lg:w-60 lg:shrink-0">
    <a href="#overview" className="flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring">
      <span className="flex size-10 items-center justify-center rounded-xl bg-accent-600 text-headline-medium text-text-white" aria-hidden="true">M</span>
      <span className="flex flex-col"><span className="text-headline-medium text-text-primary">Muse Board</span><span className="text-caption-1-medium text-text-tertiary">个人助手 · 公开模板</span></span>
    </a>
    <nav aria-label="主导航" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
      {items.map(item => <ButtonLink key={item.key} href={item.href} leadingIcon={item.icon} variant={selected === item.key ? 'primary' : 'ghost'} aria-current={selected === item.key ? 'page' : undefined} className={cx('justify-start', selected !== item.key && 'text-text-secondary')}>{item.label}</ButtonLink>)}
    </nav>
    <div className="hidden flex-col gap-3 border-t border-separator-border pt-4 lg:flex">
      <p className="text-caption-1-semibold text-text-tertiary">你的生活，由你确认</p>
      <p className="text-body-2-regular text-text-secondary">Muse 负责收集与填槽。每次更新，都保留来源与确认状态。</p>
      <ThemeToggle />
    </div>
  </aside>;
}

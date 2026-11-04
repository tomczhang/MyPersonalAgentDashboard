"use client";

import type { ComponentType } from 'react';
import { ButtonLink } from '@/components/base/buttons/button';
import { ThemeToggle } from '@/components/application/theme/theme-toggle';
import { cx } from '@/utils/cx';

export type DashboardNavItem = { key: string; label: string; icon: ComponentType<{ className?: string }>; href: string };
// Shared top navigation, composed from BoardUI links and the existing theme control.
export function DashboardNavigation({ items, selected }: { items: DashboardNavItem[]; selected: string }) {
  return <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-3xl bg-background-secondary-default p-3 sm:p-4 lg:flex lg:gap-4">
    <a href="#overview" className="flex min-w-0 shrink-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring">
      <span className="flex size-10 items-center justify-center rounded-xl bg-background-tertiary-default text-headline-medium text-text-primary font-latin" aria-hidden="true">M</span>
      <span className="flex min-w-0 flex-col"><span className="whitespace-nowrap text-headline-medium text-text-primary font-latin">Muse Board</span><span className="whitespace-nowrap text-caption-1-medium text-text-tertiary">个人助手 · 公开模板</span></span>
    </a>
    <nav aria-label="主导航" className="order-last col-span-2 grid min-w-0 grid-cols-3 gap-1 sm:grid-cols-6 lg:order-none lg:flex lg:flex-1 lg:justify-center">
      {items.map(item => <ButtonLink key={item.key} href={item.href} size="small" leadingIcon={item.icon} variant={selected === item.key ? 'primary' : 'ghost'} aria-current={selected === item.key ? 'page' : undefined} className={cx('justify-center whitespace-nowrap shadow-none', selected !== item.key && 'bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover active:bg-background-tertiary-default')}>{item.label}</ButtonLink>)}
    </nav>
    <div className="shrink-0"><ThemeToggle /></div>
  </header>;
}

"use client";
import type { ReactNode } from 'react';
import { DashboardNavigation, type DashboardNavItem } from '@/components/application/dashboard/dashboard-navigation';

// BoardUI dashboard shell adapted for Vite and document-level scrolling.
// No nested vertical scroller: headings and content share the native page flow.
export function DashboardShell({ items, selected, children }: { items: DashboardNavItem[]; selected: string; children: ReactNode }) {
  return <div className="mx-auto flex min-h-screen max-w-screen-2xl flex-col gap-6 bg-background-full p-4 lg:p-6">
    <a href="#main-content" className="sr-only rounded-lg bg-background-primary-default p-3 text-text-primary focus:not-sr-only focus-visible:ring-2 focus-visible:ring-border-focus-ring">跳到主要内容</a>
    <DashboardNavigation items={items} selected={selected} />
    <main id="main-content" tabIndex={-1} className="flex min-w-0 flex-1 flex-col gap-6 outline-none">{children}</main>
  </div>;
}

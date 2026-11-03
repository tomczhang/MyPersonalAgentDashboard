"use client";
import type { ComponentType, ReactNode } from 'react';
import { cx } from '@/utils/cx';

export type Stat = { label: string; value: ReactNode; caption: ReactNode; icon: ComponentType<{className?: string; 'aria-hidden'?: boolean | 'true' | 'false'}> };
// BoardUI stat-card recipe, with explicit data and provenance instead of defaults.
export function StatCards({ stats, className }: { stats: Stat[]; className?: string }) {
  return <div className={cx('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3', className)}>
    {stats.map(stat => <section key={stat.label} className="flex min-w-0 flex-col gap-4 rounded-3xl border border-border-button-default bg-background-secondary-default p-5">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-stat-card-icon-background p-2"><stat.icon className="size-5 text-foreground-icon-primary" aria-hidden /></span><h3 className="text-body-medium text-text-secondary">{stat.label}</h3></div>
      <div className="break-words text-title-1-medium text-text-primary tabular-nums">{stat.value}</div>
      <div className="border-t border-separator-border pt-3 text-caption-1-medium text-text-tertiary">{stat.caption}</div>
    </section>)}
  </div>;
}

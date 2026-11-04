"use client";
import type { ComponentType, ReactNode } from 'react';
import { cx } from '@/utils/cx';

export type Stat = { label: string; value: ReactNode; caption?: ReactNode; icon: ComponentType<{className?: string; 'aria-hidden'?: boolean | 'true' | 'false'}> };
// BoardUI stat-card recipe, with explicit data and provenance instead of defaults.
export function StatCards({ stats, className, compact = false, borderless = false }: { stats: Stat[]; className?: string; compact?: boolean; borderless?: boolean }) {
  return <div className={cx('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3', className)}>
    {stats.map(stat => <section key={stat.label} className={cx('flex min-w-0 flex-col gap-4 rounded-3xl border border-border-button-default bg-background-secondary-default p-5', compact && 'gap-3 p-4', borderless && 'border-0')}>
      <div className={cx('flex items-center gap-3', compact && 'flex-wrap gap-2')}><span className="rounded-xl bg-stat-card-icon-background p-2"><stat.icon className="size-5 text-foreground-icon-primary" aria-hidden /></span><h3 className="text-body-medium text-text-primary/75">{stat.label}</h3></div>
      <div className={cx('break-words text-title-1-medium text-text-primary tabular-nums', compact && 'text-headline-medium')}>{stat.value}</div>
      {stat.caption != null && <div className="border-t border-separator-border pt-3 text-caption-1-medium text-text-primary/65">{stat.caption}</div>}
    </section>)}
  </div>;
}

"use client";

import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";
import { useId, useState, type ReactNode } from "react";
import { RiArrowDownSLine, RiArrowRightLine, RiArrowRightSLine } from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";
import { resolveTone } from "@/components/application/charts/chart-card";
import { cx } from "@/utils/cx";

/**
 * Agent limits card - the "how much of my agent budget is left" widget:
 *
 *   Context window   stacked usage bar (one segment per token bucket) with a
 *                    "used / max (pct)" readout. Expanding it grows the whole
 *                    card to reveal the breakdown: a legend row per bucket
 *                    (swatch · label · tokens · share), free space, deferred
 *                    buckets that don't count against the window ("—"), and
 *                    collapsible groups (MCP tools, memory files…) listing
 *                    their members.
 *   Plan limits      one row per rolling limit: label, reset time, percent,
 *                    and a progress bar.
 *
 * All numbers are props: `context.max` + `context.segments[]` drive the bar
 * and shares, `context.groups[]` the collapsible rows, `limits[]` the plan
 * section. Segment colours cycle the chart palette from blue unless set.
 */

export type ContextSegment = {
  /** Stable identity when display labels (for example prices) repeat. */
  id?: string;
  label: string;
  tokens: number;
  /** Any CSS colour; defaults to the chart palette by index (blue first). */
  color?: string;
  /** Deferred buckets are listed but neither drawn in the bar nor counted. */
  deferred?: boolean;
  /** Optional display values; bar geometry continues to use tokens. */
  display?: { label?: ReactNode; value: ReactNode; share: ReactNode };
};

export type ContextGroup = {
  label: string;
  tokens: number;
  items: { label: string; tokens: number }[];
};

export type UsageLimit = {
  label: ReactNode;
  /** 0-1 share of the limit already used. */
  used: number | null;
  /** "Resets in 2 hr 46 min", "Resets Tue 3:00 PM"… */
  resets: string;
};

export interface AgentLimitsCardProps {
  context?: {
    /** Window size in tokens (e.g. 1_000_000). */
    max: number;
    segments: ContextSegment[];
    groups?: ContextGroup[];
    /** Equal-width ordinal stages, independent of their displayed values. */
    equalSegments?: boolean;
    /** Full-width gradient clipped to a 0–1 completion, with equal stage ticks. */
    completion?: { used: number; gradient: string; label: string };
  };
  /** Presentation-only adaptation; omitted fields retain the original widget. */
  presentation?: {
    title?: ReactNode;
    readout?: ReactNode;
    breakdownLabel?: string;
    showFreeSpace?: boolean;
    limitsTitle?: ReactNode;
    footer?: ReactNode;
  };
  /** Plan name shown after "Plan usage limits ·". */
  plan?: string;
  /** Where the plan arrow points (omit to hide the arrow). */
  planHref?: string;
  limits?: UsageLimit[];
  /** Start with the context breakdown open. */
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
}

const DEFAULT_CONTEXT: NonNullable<AgentLimitsCardProps["context"]> = {
  max: 1_000_000,
  // 820k used of 1M: messages dominate, the rest is spread, 18% free.
  segments: [
    { label: "Messages", tokens: 520_000 },
    { label: "System tools", tokens: 96_000 },
    { label: "MCP tools", tokens: 68_000 },
    { label: "Skills", tokens: 54_000 },
    { label: "System prompt", tokens: 42_000 },
    { label: "Memory files", tokens: 24_000 },
    { label: "Custom agents", tokens: 16_000 },
    { label: "MCP tools (deferred)", tokens: 69_900, deferred: true },
    { label: "System tools (deferred)", tokens: 16_100, deferred: true },
  ],
  groups: [
    {
      label: "MCP tools",
      tokens: 137_900,
      items: [
        { label: "browser", tokens: 54_200 },
        { label: "figma", tokens: 41_800 },
        { label: "vercel", tokens: 26_500 },
        { label: "session", tokens: 15_400 },
      ],
    },
    {
      label: "Memory files",
      tokens: 24_000,
      items: [
        { label: "MEMORY.md", tokens: 16_400 },
        { label: "project-conventions.md", tokens: 7_600 },
      ],
    },
    {
      label: "Custom agents",
      tokens: 16_000,
      items: [
        { label: "reviewer", tokens: 7_100 },
        { label: "explorer", tokens: 5_200 },
        { label: "planner", tokens: 3_700 },
      ],
    },
  ],
};

const DEFAULT_LIMITS: UsageLimit[] = [
  { label: "5-hour limit", used: 0.38, resets: "Resets in 2 hr 46 min" },
  { label: "Weekly · all models", used: 0.03, resets: "Resets Tue 3:00 PM" },
  { label: "Weekly · Pro", used: 0.05, resets: "Resets Tue 3:00 PM" },
];

/** 482_800 → "482.8k", 96_000 → "96k", 1_000_000 → "1M", 314 → "314". */
export function formatTokens(n: number) {
  const short = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  if (n >= 1_000_000) return `${short(n / 1_000_000)}M`;
  if (n >= 1_000) return `${short(n / 1_000)}k`;
  return String(n);
}

const EASE = [0.22, 1, 0.36, 1] as const;

/** Thin rounded track + fill, the same bar the earnings/steps cards use. */
function Bar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-chart-track", className)}>
      {children}
    </div>
  );
}

export function AgentLimitsCard({
  context = DEFAULT_CONTEXT,
  plan = "Max (5x)",
  presentation,
  planHref,
  limits = DEFAULT_LIMITS,
  defaultExpanded = false,
  onExpandedChange,
  className,
}: AgentLimitsCardProps = {}) {
  const localize = useTemplateCopy();
  const breakdownId = useId();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const counted = context.segments.filter((s) => !s.deferred);
  const used = counted.reduce((sum, s) => sum + s.tokens, 0);
  const free = Math.max(0, context.max - used);
  const share = (n: number) => (n / Math.max(1, context.max)) * 100;
  const tones = context.segments.map((s, i) => resolveTone(i + 1, s.color));

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    onExpandedChange?.(next);
  };

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  return localize((
    <section
      className={cx(
        "flex w-full min-w-0 flex-col rounded-2xl bg-background-secondary-default px-4 pt-2.5 pb-4",
        className,
      )}
    >
      {/* ---------------------------------------------- context window */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls={expanded ? breakdownId : undefined}
        className="group -mx-2 flex cursor-pointer items-center justify-between gap-3 rounded-2lg px-2 py-1 text-start outline-none transition-colors duration-150 hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        <span className="text-body-medium text-text-secondary">{presentation?.title ?? "Context window"}</span>
        <span className="flex items-center gap-2">
          <span className="text-body-medium whitespace-nowrap text-text-secondary tabular-nums">
            {presentation?.readout ?? <>{formatTokens(used)} / {formatTokens(context.max)}{" "}
            <span className="text-text-primary">({Math.round(share(used))}%)</span></>}
          </span>
          <RiArrowDownSLine
            className={cx(
              "size-4 shrink-0 text-text-tertiary transition-transform duration-200 ease-out group-hover:text-text-secondary",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        </span>
      </button>

      {context.completion ? <div
        role="progressbar"
        aria-label={context.completion.label}
        aria-valuemin={0}
        aria-valuemax={counted.length}
        aria-valuenow={Math.round(context.completion.used * counted.length)}
        className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-chart-track"
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: context.completion.gradient,
            clipPath: `inset(0 ${(1 - Math.max(0, Math.min(1, context.completion.used))) * 100}% 0 0)`,
          }}
        />
        {counted.slice(1).map((s, i) => <span
          key={s.id ?? s.label}
          aria-hidden
          className="absolute inset-y-0 w-px bg-background-secondary-default"
          style={{ left: `${((i + 1) / counted.length) * 100}%` }}
        />)}
      </div> : <Bar className="mt-1.5">
        {context.segments.map((s, i) =>
          s.deferred ? null : (
            <div
              key={s.id ?? s.label}
              className="h-full shrink-0 transition-[width] duration-500 ease-out"
              style={{ width: `${share(s.tokens)}%`, flex: context.equalSegments ? 1 : undefined, backgroundColor: tones[i].color }}
              title={s.display ? undefined : `${s.label} · ${formatTokens(s.tokens)}`}
              aria-hidden
            />
          ),
        )}
      </Bar>}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="breakdown"
            id={breakdownId}
            role={presentation?.breakdownLabel ? "region" : undefined}
            aria-label={presentation?.breakdownLabel}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            // The panel clips for the height animation, so it bleeds 8px past
            // the content and pads back in - the hover pills on the rows below
            // extend into that gutter and keep their rounded corners.
            className="-mx-2 overflow-hidden px-2"
          >
            <div className="flex flex-col pt-3">
              {context.segments.map((s, i) => (
                <div key={s.id ?? s.label} className="flex items-center gap-2 py-[5px]">
                  <span
                    className="size-2.5 shrink-0 rounded-[3px]"
                    style={{ backgroundColor: s.deferred ? "var(--color-chart-cursor)" : tones[i].color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-body-regular text-text-primary">{s.display?.label ?? s.label}</span>
                  <span className="shrink-0 whitespace-nowrap text-body-regular text-text-tertiary tabular-nums">{s.display?.value ?? formatTokens(s.tokens)}</span>
                  <span className={cx("shrink-0 text-end text-body-medium text-text-primary tabular-nums", s.display ? "min-w-16" : "w-14")}>
                    {s.deferred ? "—" : s.display?.share ?? `${share(s.tokens).toFixed(1)}%`}
                  </span>
                </div>
              ))}
              {presentation?.showFreeSpace !== false && <div className="flex items-center gap-2 py-[5px]">
                <span className="size-2.5 shrink-0 rounded-[3px] bg-chart-track" />
                <span className="min-w-0 flex-1 truncate text-body-regular text-text-primary">Free space</span>
                <span className="text-body-regular text-text-tertiary tabular-nums">{formatTokens(free)}</span>
                <span className="w-14 text-end text-body-medium text-text-primary tabular-nums">
                  {share(free).toFixed(1)}%
                </span>
              </div>}

              {context.groups && context.groups.length > 0 && (
                <div className="mt-1.5 flex flex-col">
                  {context.groups.map((g) => {
                    const open = openGroups.has(g.label);
                    return (
                      <div key={g.label} className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => toggleGroup(g.label)}
                          aria-expanded={open}
                          className="-mx-2 flex cursor-pointer items-center gap-1.5 rounded-2lg px-2 py-[7px] text-start outline-none transition-colors duration-150 hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                        >
                          <RiArrowRightSLine
                            className={cx(
                              "size-4 shrink-0 text-text-tertiary transition-transform duration-200 ease-out",
                              open ? "rotate-90" : "rtl:rotate-180",
                            )}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate text-body-regular text-text-secondary">{g.label}</span>
                          <span className="text-body-regular text-text-tertiary tabular-nums">{formatTokens(g.tokens)}</span>
                          <span className="w-14 text-end text-body-regular text-text-tertiary tabular-nums">
                            {g.items.length}
                          </span>
                        </button>
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div
                              key="items"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.26, ease: EASE }}
                              className="overflow-hidden"
                            >
                              <div className="flex flex-col pb-1 ps-[22px]">
                                {g.items.map((item) => (
                                  <div key={item.label} className="flex items-center gap-2 py-1">
                                    <span className="min-w-0 flex-1 truncate text-body-2-regular text-text-secondary">
                                      {item.label}
                                    </span>
                                    <span className="text-body-2-regular text-text-tertiary tabular-nums">
                                      {formatTokens(item.tokens)}
                                    </span>
                                    <span className="w-14" />
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------- plan limits */}
      <div className="my-3 h-px w-full bg-separator-border-strong" />

      {presentation?.limitsTitle !== null && <div className="flex items-center justify-between gap-3 py-1">
        <span className="text-body-medium text-text-secondary">
          {presentation?.limitsTitle ?? <>Plan usage limits{plan ? ` · ${plan}` : ""}</>}
        </span>
        {planHref && (
          <a
            href={planHref}
            aria-label="Manage plan"
            className="flex size-6 items-center justify-center rounded-md text-text-tertiary outline-none transition-colors duration-150 hover:bg-background-secondary-hover hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            <RiArrowRightLine className="size-4 rtl:rotate-180" aria-hidden />
          </a>
        )}
      </div>}

      {presentation?.footer ?? <div className="flex flex-col gap-3 pt-1">
        {limits.map((limit, index) => {
          const pct = Math.round(Math.max(0, Math.min(1, limit.used ?? 0)) * 100);
          return (
            <div key={index} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className={cx("min-w-0 text-body-medium text-text-primary", typeof limit.label === "string" && "truncate")}>{limit.label}</span>
                <span className="flex shrink-0 items-baseline gap-2">
                  <span className="text-body-regular text-text-tertiary">{limit.resets}</span>
                  <span className="w-9 text-end text-body-medium text-text-primary tabular-nums">{limit.used === null ? "—" : `${pct}%`}</span>
                </span>
              </div>
              <Bar>
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: "var(--color-chart-6)" }}
                />
              </Bar>
            </div>
          );
        })}
      </div>}
    </section>
  ));
}

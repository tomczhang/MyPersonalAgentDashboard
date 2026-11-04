import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InvestmentBenchmarkCard, investmentBenchmarkData } from '@/components/investment-benchmark-card';
import type { Investment } from '@/data/investment-view';

const slot = {
  benchmarkLabel: '虚构测试基准',
  points: [
    { date: '2026-10-01', portfolio: 200, benchmark: 50 },
    { date: '2026-11-01', portfolio: 180, benchmark: 60 },
  ],
};
const render = (data?: Investment['benchmarkSeries']) => renderToStaticMarkup(createElement(InvestmentBenchmarkCard, { data }));

describe('benchmark comparison slot adapter', () => {
  it('normalizes independently to 100 while preserving dates, declines and the input', () => {
    const original = structuredClone(slot);
    expect(investmentBenchmarkData(slot)).toEqual([
      { label: '2026-10-01', portfolio: 100, benchmark: 100 },
      { label: '2026-11-01', portfolio: 90, benchmark: 120 },
    ]);
    expect(slot).toEqual(original);
    expect(investmentBenchmarkData({ ...slot, points: [] })).toEqual([]);
  });
  it('hides the whole card for absent, empty and single-point slots', () => {
    expect(render()).toBe('');
    expect(render({ ...slot, points: [] })).toBe('');
    expect(render({ ...slot, points: slot.points.slice(0, 1) })).toBe('');
    expect(render(slot)).toContain('基准对比');
  });
  it('renders supplied benchmark naming and scope', () => {
    const html = render(slot);
    for (const label of ['虚构测试基准', '全组合 · 起点 100']) expect(html).toContain(label);
    expect(html).toContain('>90<');
    expect(html).not.toContain('Visitors');
  });
});

import { describe, expect, it } from 'vitest';
import example from '../../data/examples/investment.json';
import { parseModule } from '@/data/schema';
import { concentrationData } from '@/data/investment-concentration';
import { bubbleAreaDomain } from '@/components/application/charts/scatter-chart-card';

describe('investment concentration', () => {
  it('switches supplied interval metrics while preserving current market values and a defined concentration metric', () => {
    const positions = parseModule('investment', example).positions!;
    const annual = concentrationData(positions, 'YTD');
    const month = concentrationData(positions, '1M');
    expect(annual.total).toBe(400000);
    expect(annual.largestShare).toBe(37.5);
    expect(annual.series.flatMap(series => series.points).map(point => point.z).sort()).toEqual([50000, 90000, 110000, 150000].sort());
    expect(month.series.flatMap(series => series.points).map(point => point.z)).toEqual(annual.series.flatMap(series => series.points).map(point => point.z));
    expect(month.series[0].points[0].y).not.toBe(annual.series[0].points[0].y);
    expect(annual.series.flatMap(series => series.points).some(point => point.y < 0)).toBe(true);
    expect(annual.series.flatMap(series => series.points).some(point => point.y === 0)).toBe(true);
    expect(bubbleAreaDomain(annual.series.flatMap(series => series.points))).toEqual([0, 150000]);
  });
  it('combines a security across accounts and omits inconsistent or missing metrics without fabricating zeros', () => {
    const positions = parseModule('investment', example).positions!;
    const duplicate = structuredClone(positions[0]);
    duplicate.valueUsd.value = 50000;
    const combined = concentrationData([...positions, duplicate], 'YTD');
    expect(combined.series.flatMap(series => series.points)).toHaveLength(4);
    expect(combined.series.find(series => series.label === '基金')!.points[0].z).toBe(200000);
    duplicate.riskReturn!.YTD!.returnPct = 99;
    const conflict = concentrationData([...positions, duplicate], 'YTD');
    expect(conflict.missing).toEqual(['DEMO-A']);
    expect(conflict.total).toBe(450000);
    for (const position of positions) delete position.riskReturn;
    expect(concentrationData(positions, 'YTD').series).toEqual([]);
    expect(concentrationData(positions, 'YTD').largestShare).toBe(37.5);
    expect(concentrationData([], 'YTD').largestShare).toBeNull();
  });
  it('validates nullable finite interval metrics and rejects negative volatility', () => {
    const slot = parseModule('investment', example);
    slot.positions![0].riskReturn = { YTD: { volatilityPct: 0, returnPct: null } };
    expect(parseModule('investment', slot).positions![0].riskReturn?.YTD).toEqual({ volatilityPct: 0, returnPct: null });
    for (const metric of [{ volatilityPct: -1, returnPct: 1 }, { volatilityPct: 1, returnPct: Infinity }]) {
      slot.positions![0].riskReturn = { YTD: metric };
      expect(() => parseModule('investment', slot)).toThrow();
    }
  });
});

import type { Position, Range } from '@/data/investment-view';

export const concentrationRanges = [
  { id: 'YTD', label: '年初至今' }, { id: '1M', label: '近1月' }, { id: '1Y', label: '近1年' }, { id: 'Max', label: '全部时间' },
] as const;
const categories = [
  { label: '股票', aliases: ['股票', 'stock', 'stocks', 'equity'], color: 2 },
  { label: '基金', aliases: ['基金', '债券基金', '股票基金', 'ETF', 'fund', 'funds'], color: 4 },
  { label: '债券', aliases: ['债券', 'bond', 'bonds'], color: 1 },
  { label: '加密资产', aliases: ['加密资产', '加密货币', 'crypto', 'cryptocurrency'], color: 5 },
  { label: '其他资产', aliases: [], color: 3 },
];
export function concentrationCategory(assetType?: string) {
  return categories.find(category => category.aliases.some(alias => alias.toLowerCase() === assetType?.toLowerCase())) ?? categories[4];
}

export function concentrationData(positions: Position[], range: Range) {
  const groups = new Map<string, Position[]>();
  for (const position of positions) {
    if (position.qty.value <= 0 || position.valueUsd.value <= 0) continue;
    const group = groups.get(position.symbol) ?? [];
    group.push(position);
    groups.set(position.symbol, group);
  }
  const holdings = [...groups].map(([symbol, items]) => {
    const first = items[0];
    const metric = first.riskReturn?.[range];
    const category = concentrationCategory(first.assetType);
    // The same security can be held in multiple accounts. Its return/volatility
    // must agree before market values are combined into one plotted instrument.
    const complete = metric?.volatilityPct != null && metric?.returnPct != null && items.every(item =>
      item.riskReturn?.[range]?.volatilityPct === metric.volatilityPct && item.riskReturn?.[range]?.returnPct === metric.returnPct && concentrationCategory(item.assetType).label === category.label);
    return { symbol, label: `${first.name ?? symbol}${first.name ? ` · ${symbol}` : ''}`, category,
      marketValue: items.reduce((sum, item) => sum + item.valueUsd.value, 0),
      volatilityPct: complete ? metric.volatilityPct! : null, returnPct: complete ? metric.returnPct! : null };
  });
  const total = holdings.reduce((sum, holding) => sum + holding.marketValue, 0);
  const plotted = holdings.filter(row => row.volatilityPct !== null && row.returnPct !== null);
  const series = categories.flatMap(category => {
    const rows = plotted.filter(row => row.category.label === category.label).sort((a, b) => b.marketValue - a.marketValue);
    return rows.length ? [{ label: category.label, color: `var(--color-chart-${category.color})`, activeColor: `var(--color-chart-${category.color}-active)`,
      points: rows.map(row => ({ x: row.volatilityPct!, y: row.returnPct!, z: row.marketValue, label: row.label })) }] : [];
  });
  return { series, total, missing: holdings.filter(row => row.volatilityPct === null || row.returnPct === null).map(row => row.symbol),
    largestShare: total > 0 ? Math.max(...holdings.map(row => row.marketValue)) / total * 100 : null };
}

import { RiBankLine, RiExchangeDollarLine, RiHeartPulseLine, RiHome5Line, RiShieldCheckLine, RiDashboardLine } from '@remixicon/react';
import type { ModuleData, ModuleId, Metric } from '@/data/schema';

export const moduleInfo = {
  investment: { title: '投资', subtitle: '资产、现金与配置框架', icon: RiBankLine, cadence: '建议每周复核' },
  cashflow: { title: '现金流', subtitle: '收入与支出，保持清晰', icon: RiExchangeDollarLine, cadence: '建议每月复核' },
  'family-assets': { title: '家庭资产', subtitle: '家庭资产与负债目录', icon: RiHome5Line, cadence: '变动时更新' },
  insurance: { title: '保险', subtitle: '保障目录与续期记录', icon: RiShieldCheckLine, cadence: '变动时更新' },
  health: { title: '健康', subtitle: '设备记录与日常状态', icon: RiHeartPulseLine, cadence: '建议每日同步' },
};
export const navigation = [
  { key: 'overview', label: '总览', icon: RiDashboardLine, href: '#overview' },
  ...Object.entries(moduleInfo).map(([key, info]) => ({ key, label: info.title, icon: info.icon, href: `#${key}` })),
];
export const statusLabels = { example: '示例数据', draft: '草稿 · 待确认', confirmed: '已确认 · 正式数据' };
export const confidenceLabels = { example: '示例', low: '低', medium: '中', high: '高' };
export function formatMetric(metric: Metric): string {
  if (metric.unit === 'ratio') return new Intl.NumberFormat('zh-CN', { style: 'percent', maximumFractionDigits: 2 }).format(metric.value);
  if (metric.unit === 'USD') return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(metric.value);
  const value = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 4 }).format(metric.value);
  return metric.unit === 'weight' ? value : `${value} ${metric.unit}`;
}
export function kpis(data: ModuleData): { label: string; metric: Metric }[] {
  switch (data.module) {
    case 'investment': return [{ label: '受管资产总额', metric: data.managedAssets }, { label: '弹药 / 现金合计', metric: data.ammunitionTotal }, { label: '汇率 · ' + data.fx.pair, metric: data.fx.rate }];
    case 'cashflow': return [{ label: '月度净现金流', metric: data.netCashflow }, { label: '月度收入', metric: data.incomeTotal }, { label: '月度支出', metric: data.expenseTotal }];
    case 'family-assets': return [{ label: '家庭净资产', metric: data.netAssets }, { label: '资产总额', metric: data.grossAssets }, { label: '负债总额', metric: data.liabilitiesTotal }];
    case 'insurance': return [{ label: '年度保费', metric: data.annualPremium }, { label: '名义保额合计', metric: data.coverageTotal }, { label: '保单数量', metric: data.policyCount }];
    case 'health': return [{ label: '每日步数', metric: data.steps }, { label: '睡眠时长', metric: data.sleepHours }, { label: '活动时长', metric: data.activeMinutes }];
  }
}
export function moduleIdFromHash(): ModuleId | 'overview' {
  const id = window.location.hash.slice(1);
  return Object.hasOwn(moduleInfo, id) ? id as ModuleId : 'overview';
}

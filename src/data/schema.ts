import { z } from 'zod';

export const moduleIds = ['investment', 'cashflow', 'family-assets', 'insurance', 'health'] as const;
export type ModuleId = typeof moduleIds[number];
const date = z.iso.date();
const text = z.string().trim().min(1);
export const confidenceSchema = z.enum(['example', 'low', 'medium', 'high']);
export const metricSchema = z.object({ value: z.number().finite(), unit: text, asOf: date, source: text }).strict();
const money = metricSchema.extend({ unit: z.literal('USD') });
const positiveMoney = money.extend({ value: z.number().nonnegative() });
const ratio = metricSchema.extend({ value: z.number().min(0).max(1), unit: z.literal('ratio') });
const nonnegativeMetric = metricSchema.extend({ value: z.number().nonnegative() });
const maskedId = z.string().regex(/^[A-Za-z]\*{3,}\d{4}$/, '只允许掩码标识');
const metaSchema = z.object({
  asOf: date, source: text, status: z.enum(['example', 'draft', 'confirmed']),
  confidence: confidenceSchema, updatedBy: text, confirmedBy: text.nullable(), reviewAfter: date,
}).strict().superRefine((meta, ctx) => {
  if (meta.status === 'confirmed' && !meta.confirmedBy) ctx.addIssue({ code: 'custom', message: '正式数据必须有确认人' });
  if (meta.status === 'confirmed' && meta.confidence === 'example') ctx.addIssue({ code: 'custom', message: '正式数据不能使用示例置信度' });
  if (meta.status !== 'confirmed' && meta.confirmedBy !== null) ctx.addIssue({ code: 'custom', message: '未确认数据的 confirmedBy 必须为空' });
  if (meta.status === 'example' && (meta.source !== '示例数据' || meta.confidence !== 'example')) ctx.addIssue({ code: 'custom', message: '示例元信息不一致' });
  if (meta.reviewAfter < meta.asOf) ctx.addIssue({ code: 'custom', message: '复核日期不能早于数据日期' });
});
const base = { meta: metaSchema, owner: text };
const account = z.object({ name: text, idMasked: maskedId, nav: positiveMoney, dataDate: date, confidence: confidenceSchema }).strict();
const holding = z.object({ symbol: text, qty: nonnegativeMetric, markPrice: positiveMoney, valueUsd: positiveMoney, note: text }).strict();
const attribution = { accountId: maskedId.optional(), bucket: text.optional(), inFramework: z.boolean().optional() };
const cashTier = z.object({ tier: text, location: text, amount: positiveMoney, ...attribution }).strict();
const position = holding.extend({
  name: text.optional(), ...attribution,
  buyInAmount: z.number().nonnegative().optional(), buyInPerShare: z.number().nonnegative().optional(),
  pnlAmount: z.number().finite().nullable(), pnlPct: z.number().finite().nullable(),
  costCaliber: text, inFramework: z.boolean(),
});
const performance = z.object({
  investedCapital: z.number().nonnegative().optional(), priceGain: z.number().finite().optional(),
  dividends: z.number().finite().optional(), realized: z.number().finite().optional(),
  costs: z.number().finite().optional(), totalReturn: z.number().finite().optional(),
  twrPct: z.number().finite().optional(),
}).strict();
export const schemas = {
  investment: z.object({
    ...base, module: z.literal('investment'), currency: z.literal('USD'), managedAssets: positiveMoney,
    fx: z.object({ pair: text, rate: nonnegativeMetric }).strict(),
    cashTiers: z.array(cashTier),
    ammunitionTotal: positiveMoney, accounts: z.array(account),
    holdings: z.array(holding),
    // Optional extensions keep existing local slots readable. Plain amounts use currency;
    // percentages are percentage points. Their provenance is the module meta.
    positions: z.array(position).optional(), ammo: z.array(cashTier).optional(),
    series: z.array(z.object({ date, value: z.number().nonnegative(), changePct: z.number().finite().optional() }).strict()).optional(),
    seriesSummary: z.object({ changePct: z.number().finite() }).strict().optional(),
    performanceByYear: z.record(z.string().regex(/^\d{4}$/), performance).optional(),
    dividends: z.object({ totalReceived: z.number().nonnegative(), yieldTtmPct: z.number().nonnegative(), byYear: z.array(z.object({ year: z.number().int().min(1900).max(9999), amount: z.number().nonnegative() }).strict()) }).strict().optional(),
    independentAccounts: z.array(account.extend({ includedInManagedAssets: z.literal(false), note: text })),
    framework: z.object({
      note: text, cashTargetRatio: ratio, cashActualRatio: ratio, cashGap: money,
      buckets: z.array(z.object({ name: text, targetWeight: nonnegativeMetric, targetRatio: ratio, actualRatio: ratio, amount: positiveMoney, gap: money }).strict()).length(3),
    }).strict(),
  }).strict(),
  cashflow: z.object({ ...base, module: z.literal('cashflow'), currency: z.literal('USD'), period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), incomeTotal: positiveMoney, expenseTotal: positiveMoney, netCashflow: money, entries: z.array(z.object({ label: text, kind: z.enum(['income', 'expense']), amount: positiveMoney, note: text }).strict()) }).strict(),
  'family-assets': z.object({ ...base, module: z.literal('family-assets'), currency: z.literal('USD'), grossAssets: positiveMoney, liabilitiesTotal: positiveMoney, netAssets: money, assets: z.array(z.object({ name: text, category: text, owner: text, value: positiveMoney, note: text }).strict()), liabilities: z.array(z.object({ name: text, balance: positiveMoney, note: text }).strict()) }).strict(),
  insurance: z.object({ ...base, module: z.literal('insurance'), currency: z.literal('USD'), annualPremium: positiveMoney, coverageTotal: positiveMoney, policyCount: metricSchema.extend({ value: z.number().int().nonnegative(), unit: z.literal('份') }), note: text, policies: z.array(z.object({ name: text, insured: text, provider: text, policyIdMasked: maskedId, coverage: positiveMoney, annualPremium: positiveMoney, renewalDate: date, state: text, note: text }).strict()) }).strict(),
  health: z.object({ ...base, module: z.literal('health'), steps: nonnegativeMetric, sleepHours: nonnegativeMetric, activeMinutes: nonnegativeMetric, note: text, records: z.array(z.object({ label: text, measurement: nonnegativeMetric, device: text, note: text }).strict()) }).strict(),
};
export type DataMap = { [K in ModuleId]: z.infer<typeof schemas[K]> };
export type ModuleData = DataMap[ModuleId];
export type Metric = z.infer<typeof metricSchema>;
export type Meta = ModuleData['meta'];

export function parseModule<K extends ModuleId>(id: K, raw: unknown): DataMap[K] {
  const data = schemas[id].parse(raw) as DataMap[K];
  const checkMetricSources = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if ('value' in value && 'source' in value) {
      const metric = value as Metric;
      if (metric.asOf > data.meta.asOf) throw new Error('数字日期不可晚于模块快照日期');
      if (data.meta.status === 'example' && metric.source !== '示例数据') throw new Error('示例数字来源必须为示例数据');
      if (data.meta.status !== 'example' && metric.source === '示例数据') throw new Error('本地数字不能保留示例来源');
    }
    Object.values(value).forEach(checkMetricSources);
  };
  checkMetricSources(data);
  return data;
}

export function isStale(meta: Meta, today = new Date().toISOString().slice(0, 10)): boolean {
  return today > meta.reviewAfter;
}

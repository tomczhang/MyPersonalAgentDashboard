import { describe, expect, it } from 'vitest';
import example from '../../data/examples/investment.json';
import { parseModule } from '@/data/schema';
import { distributionDimensions, investmentDistribution, investmentView, type DistributionDimension } from '@/data/investment-view';

describe('asset distribution grouping', () => {
  const data = () => parseModule('investment', structuredClone(example));
  it('preserves the total across all dimensions and includes cash in account balances', () => {
    const slot = data();
    const view = investmentView(slot, 'all', false);
    for (const { id } of distributionDimensions) {
      expect(investmentDistribution(view, slot.accounts, id).reduce((sum, row) => sum + row.value, 0)).toBe(500000);
    }
    expect(investmentDistribution(view, slot.accounts, 'type')).toEqual([
      { name: '债券基金', value: 150000 }, { name: '股票', value: 250000 }, { name: '现金', value: 100000 },
    ]);
    expect(investmentDistribution(view, slot.accounts, 'sector').find(row => row.name === '科技')?.value).toBe(200000);
    expect(investmentDistribution(view, slot.accounts, 'account')).toEqual([
      { name: '虚构证券主账户', value: 300000 }, { name: '虚构证券副账户', value: 200000 },
    ]);
    expect(investmentDistribution(view, slot.accounts, 'currency')).toEqual([{ name: 'USD', value: 500000 }]);
  });
  it('uses supplied denomination and USD valuations without treating missing metadata as USD', () => {
    const slot = data();
    slot.positions![0].currency = 'HKD';
    delete slot.positions![1].currency;
    delete slot.positions![1].sector;
    delete slot.positions![1].assetType;
    const view = investmentView(slot, 'all', false);
    expect(investmentDistribution(view, slot.accounts, 'currency')).toEqual([
      { name: 'HKD', value: 150000 }, { name: '未知货币', value: 90000 }, { name: 'USD', value: 260000 },
    ]);
    for (const dimension of ['type', 'sector'] as DistributionDimension[]) {
      expect(investmentDistribution(view, slot.accounts, dimension)).toContainEqual({ name: '未分类', value: 90000 });
    }
  });
  it('merges the same holding across accounts and respects account and framework filters', () => {
    const slot = data();
    slot.positions!.push({ ...slot.positions![0], accountId: 'U***0002' });
    expect(investmentDistribution(investmentView(slot, 'all', false), slot.accounts, 'holding')[0]).toEqual({ name: '虚构稳健资产', value: 300000 });
    const view = investmentView(slot, 'U***0002', true);
    expect(investmentDistribution(view, slot.accounts, 'account')).toEqual([{ name: '虚构证券副账户', value: 300000 }]);
    delete slot.positions![0].accountId;
    expect(investmentDistribution(investmentView(slot, 'U***0002', false), slot.accounts, 'account')).toEqual([]);
  });
  it('supports legacy holdings with unknown categories and empty portfolios', () => {
    const slot = data();
    delete slot.positions;
    delete slot.ammo;
    for (const row of slot.holdings) { delete row.assetType; delete row.sector; delete row.currency; }
    expect(investmentDistribution(investmentView(slot, 'all', false), slot.accounts, 'type')).toEqual([
      { name: '未分类', value: 400000 }, { name: '现金', value: 100000 },
    ]);
    slot.holdings = [];
    slot.cashTiers = [];
    expect(investmentDistribution(investmentView(slot, 'all', false), slot.accounts, 'holding')).toEqual([]);
  });
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import example from '../../data/examples/investment.json';
import { parseModule } from '@/data/schema';
import { InvestmentDashboard } from '@/components/investment-dashboard';
import { DirectionProvider } from '@/components/foundations/direction/direction';

function render(data = parseModule('investment', example)) {
  return renderToStaticMarkup(createElement(DirectionProvider, { locale: 'zh-CN', children: createElement(InvestmentDashboard, { data, origin: 'example' }) }));
}
describe('investment dashboard rendering', () => {
  it('renders ordered dashboard sections with provenance and supplied performance', () => {
    const html = render();
    const labels = ['资产分布', '组合总值', '基准对比', '触发 / 观察名单', '持仓明细', '子弹分层', '月度收益', '资产配置', '分年绩效拆解', '账户快照'];
    const indices = labels.map(label => html.indexOf(`>${label}<`));
    expect(indices.every(index => index >= 0)).toBe(true);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    expect(html).toContain('Alex（虚构）');
    expect(html).toContain('2026-11-01');
    expect(html).toContain('2026 收益');
    expect(html).toContain('500,000');
    expect(html).toContain('>集中度<');
    expect(html).toContain('87.5%');
    expect(html).not.toContain('框架缺口合计');
    expect(html).not.toContain('已收分红');
    expect(html).toContain('>分红<');
  });
  it('shows supplied buy-in amounts without deriving them and accepts older positions', () => {
    const slot = parseModule('investment', structuredClone(example));
    slot.positions![0].buyInAmount = 12345.67;
    slot.positions![0].buyInPerShare = 8.9;
    const supplied = render(parseModule('investment', slot));
    expect(supplied).toContain('12,345.67');
    expect(supplied).toContain('8.90');
    for (const position of slot.positions!) {
      delete position.buyInAmount;
      delete position.buyInPerShare;
    }
    const legacy = render(parseModule('investment', slot));
    expect(legacy).toContain('Buy in —');
    expect(legacy).toContain('均价 —');
    expect(legacy).not.toContain('12,345.67');
  });
  it('renders empty optional slots and hides missing performance rows while retaining zero', () => {
    const slot = parseModule('investment', example);
    delete slot.series;
    delete slot.returnComparison;
    delete slot.monthlyReturns;
    delete slot.dividends;
    slot.performanceByYear = { '2026': { totalReturn: 0 } };
    const html = render(slot);
    expect(html).toContain('所选范围暂无收益数据');
    expect(html).not.toContain('已收分红');
    expect(html).toContain('>总回报<');
    expect(html).not.toContain('>价格收益<');
    expect(html).not.toContain('>TWR<');
    expect(html).not.toContain('>投入资本<');
  });
  it('renders watchlist counts and interval progress, and omits missing or empty watchlists', () => {
    const slot = parseModule('investment', example);
    slot.watchlist![0].referencePrice = 155;
    const html = render(slot);
    for (const label of ['已触发 2/4', '全部节点已触发', '下一节点', '50%', '参考价', '缺少区间']) expect(html).toContain(label);
    slot.watchlist = [];
    expect(render(slot)).not.toContain('触发 / 观察名单');
    delete slot.watchlist;
    expect(render(slot)).not.toContain('触发 / 观察名单');
  });
  it('keeps concentration unknown when the current holdings have no market value', () => {
    const slot = parseModule('investment', example);
    slot.positions = [];
    const html = render(slot);
    expect(html).not.toContain('87.5%');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
  });
});

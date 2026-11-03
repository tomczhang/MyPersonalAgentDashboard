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
    const labels = ['净值曲线', '基准对比', '触发 / 观察名单', '持仓明细', '子弹分层', '资产配置', '分年绩效拆解', '账户快照'];
    const indices = labels.map(label => html.indexOf(`>${label}<`));
    expect(indices.every(index => index >= 0)).toBe(true);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    expect(html).toContain('Alex（虚构）');
    expect(html).toContain('全页价格与市值遵循此快照');
    expect(html).toContain('2026 收益');
    expect(html).toContain('500,000');
    expect(html).toContain('P/L 由数据填充方按口径计算，界面不二次计算');
    expect(html).toContain('>集中度<');
    expect(html).toContain('87.5%');
    expect(html).toContain('按当前视图持仓市值计算');
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
    expect(supplied).toContain('Buy in 总额与每股均价由填充方提供，界面不计算');
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
    delete slot.dividends;
    slot.performanceByYear = { '2026': { totalReturn: 0 } };
    const html = render(slot);
    expect(html).toContain('槽位暂无序列数据');
    expect(html).not.toContain('已收分红');
    expect(html).toContain('>总回报<');
    expect(html).not.toContain('>价格收益<');
    expect(html).not.toContain('>TWR<');
    expect(html).not.toContain('>投入资本<');
  });
  it('renders all alert states and supplied values, and omits missing or empty alerts', () => {
    const slot = parseModule('investment', example);
    slot.alerts![0].distancePct = -7;
    const html = render(slot);
    for (const label of ['已触发', '临近触发', '观察中', '距触发 -7%', '触发价', '参考价']) expect(html).toContain(label);
    slot.alerts = [];
    expect(render(slot)).not.toContain('触发 / 观察名单');
    delete slot.alerts;
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

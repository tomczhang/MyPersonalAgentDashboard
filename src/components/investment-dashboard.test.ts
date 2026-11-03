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
    const labels = ['净值曲线', '资产配置', '子弹分层', '账户快照', '持仓明细', '分年绩效拆解', '已收分红'];
    const indices = labels.map(label => html.indexOf(`>${label}<`));
    expect(indices.every(index => index >= 0)).toBe(true);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    expect(html).toContain('Alex（虚构）');
    expect(html).toContain('全页价格与市值遵循此快照');
    expect(html).toContain('2026 收益');
    expect(html).toContain('500,000');
    expect(html).toContain('P/L 由数据填充方按口径计算，界面不二次计算');
  });
  it('renders empty optional slots and hides missing performance rows while retaining zero', () => {
    const slot = parseModule('investment', example);
    delete slot.series;
    delete slot.dividends;
    slot.performanceByYear = { '2026': { totalReturn: 0 } };
    const html = render(slot);
    expect(html).toContain('槽位暂无序列数据');
    expect(html).toContain('槽位暂无已收分红数据');
    expect(html).toContain('>总回报<');
    expect(html).not.toContain('>价格收益<');
    expect(html).not.toContain('>TWR<');
    expect(html).not.toContain('>投入资本<');
  });
});

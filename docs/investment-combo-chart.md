# 第六单：官方净值组合图（2026-11-03）

> 历史实现记录。首屏现已改为 AreaChartCard 收入与收益率对比，当前数据口径和交互见 [收入与收益率](./investment-return-comparison.md)。下文的组件校验、映射和验证结果仅对应当时版本。

通过 `npx -y @collectui/bdui@latest add combo-chart-card --key "$BDUI_KEY"` 安装。安装命令只引用环境变量，仓库不保存密钥。

官方文件原样保留：

- `src/components/application/charts/combo-chart-card.tsx`
- `src/components/application/charts/chart-card.tsx`（安装时解析的依赖）

安装后 SHA-256 与交付文件一致：

```text
33542d6d7da0e58d7655a3ad9d257d3d82155ae65e074b066791b3d44f04a962  combo-chart-card.tsx
73c287fd31bc226cd5c81fabd122465333327f69aa45e77e6e961be2957b66de  chart-card.tsx
```

## 调用层映射

所有适配位于 `src/components/investment-nav-card.tsx`，无自绘 SVG 或组件内部修改。

| 槽位 | 官方 props / 展示 |
| --- | --- |
| `series[].date` | `data[].label`，保留完整日期 |
| `series[].value` | `data[].value`，`bar.key="value"`，左轴 USD |
| `series[].changePct` | `data[].changePct`，`line.key="changePct"`，右轴百分数；不从净值推算 |
| 所选范围最后一个快照的 `value` | `headline`；悬停时由官方组件自动切换为当期值 |
| `seriesSummary.changePct` | `delta=changePct/100`；只转换单位，不计算区间收益 |
| 当期 `changePct` | `caption(row)`；缺失显示「—」，真实 0 显示 0% |
| 所选范围有值的 `changePct` | 简单平均，传给官方 `ChartStatTiles`；脚注明确缺失不参与、不代表区间收益 |

示例新增的每期收益率与区间收益均为虚构填充值。Schema 的两个扩展均可选，旧槽位仍可读取。

原日期筛选保留；账户、框架筛选与其他卡片、双栏布局未改。序列保持全组合口径，卡头注明。顶层 summary 没有日期范围键，因此 chip 始终代表填充方的完整序列区间，并明确注明不随日期筛选重算。

## 官方 props 的限制

- 内置 tiles 的条形值固定为各期总和，不适用于净值；内置平均还会把缺失收益率视为 0。调用层设置 `tiles=false`，改用同包 `ChartStatTiles` 展示最新净值与已填收益率平均。
- 没有对外悬停回调或自定义 tiles render prop。卡头使用官方 hover readout，显示当期净值与收益率；外置图例保持最新 / 平均，不能同步悬停。没有读取内部状态、DOM 注入或复刻图表。
- 官方 chip 悬停时隐藏，不改成当期 chip；当期收益率显示于 caption。官方 delta 格式最多保留一位小数，脚注仍显示槽位值（最多两位）。
- 收益率全缺时，所有数据点省略 `changePct`，形成空线，`line.axisFormat` 返回空字符串。浏览器确认仅绘制柱形；组件无隐藏右轴 prop，因此仍保留原右轴占位。
- 坐标轴样式、暗色文字对比及插值方式沿用官方组件；未修改内部实现。

序列缺失保留「槽位暂无序列数据」；筛选后无点保留「所选范围暂无序列数据」。

## 验证

- `npm test`：11 项通过。
- `npm run test:e2e`：3 项通过，覆盖原生卡头悬停、淡化、脉冲、离开复位、日期范围、账户/框架口径、部分/全部缺失收益率及空序列。
- `npm run build`：通过；仍有 Vite 配置未来兼容性提示与大 chunk 提示。
- 1440×1000 / 390×844、deviceScaleFactor=1：浅深色、默认态与悬停截图自查，390px 无横向溢出。使用文档级滚动，未引入内部滚动容器。
- `git diff --check` 与官方文件校验通过。对源文件、示例、测试和构建输出做实际 BDUI key 精确扫描及凭据模式扫描；对源文件做未掩码账户/手机号模式扫描，均无匹配。数据改动仅限虚构示例新增字段，未读取本地真实数据文件。
- 未 commit/push。

截图保存在 git 忽略的 `test-results/`：`combo-1440-light.png`、`combo-1440-dark.png`、`combo-1440-hover.png`、`combo-390-light.png`、`combo-390-dark.png`、`combo-390-hover.png`，另有手机卡片局部 `combo-390-card-light.png` / `combo-390-card-dark.png`。

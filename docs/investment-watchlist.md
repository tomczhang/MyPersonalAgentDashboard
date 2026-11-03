# 第十二单：BoardUI 字体、投资页与触发卡

观察名单仍位于基准对比下方、持仓明细上方，手机一列、桌面两列、超宽屏三列。每只标的调用 BoardUI `AgentLimitsCard`，以原生按钮展开完整梯子。

## 字体与投资页观感

- `src/styles/theme.css` 的 `--font-sans` 使用 `"Noto Sans SC", "Noto Sans SC Fallback", "Inter", "Inter Fallback", sans-serif`，移除未定义的 Next.js `--font-inter` 依赖。
- `index.html` 加载 Google Fonts：Noto Sans SC 400 / 500 / 700、Inter 100–900 variable，`display=swap`，并预连接 Google 字体域名。CSP 仅在 `style-src` / `font-src` 分别增加 `fonts.googleapis.com` / `fonts.gstatic.com`。
- Noto 本身包含拉丁字形，因此数字 `.tabular-nums`、明确的 LTR 字段、英文标题与日期范围控件显式优先使用 Inter，中文仍回退 Noto；网络失败时由末尾 `sans-serif` 兜底。
- 侧栏去掉投影，品牌块和未选中导航回归中性表面，选中状态保留蓝色 accent。分段切换去掉浮层阴影，选中字体使用 accent，深色选用同一 accent ramp 的可读级别。
- Panel 既有边框、圆角、内边距不变。紧凑 KPI 内边距由 12px 改为 16px，数字使用 `text-headline-medium`，避免 Inter 加载后在 1440px 布局下拆开金额末位。
- 弱文字使用 `text-text-primary/65` / `/75`，改善深色下原 tertiary token 的可读性。原生卡片通过调用层 className 应用相同文字规则，图轴使用复合 caption 样式。
- 投资收益数值与图表涨跌 chip 使用 chart 色。月度矩阵审计确认原主题别名已映射为 `chart-return-positive → chart-2`、`chart-return-negative → text-error-primary`，保留该映射与四档色深，更新说明。全表正负色带文字对比度测试仍要求至少 4.5。
- 本次未修改投资槽位、示例数值、金额与收益计算口径、筛选范围或图表数据。

## 槽位契约不变

```json
{
  "watchlist": [{
    "symbol": "DEMO-E",
    "name": "虚构候选资产",
    "direction": "买入",
    "referencePrice": 95,
    "levels": [
      { "level": 1, "price": 100, "status": "triggered", "note": "虚构阈值，仅作展示。" },
      { "level": 2, "price": 90, "status": "next" },
      { "level": 3, "price": 80, "status": "pending" }
    ]
  }]
}
```

- `watchlist` 可选；缺失或空数组时整块隐藏。旧 `alerts` 字段仍被严格 schema 拒绝。
- 每只标的至少一个节点；`level` 为正整数、唯一且升序；价格有限且非负。
- 状态依次为 `triggered`、`next`、`pending`，至多一个 `next`。不根据参考价重新判断历史触发状态。
- 头部显示名称、代码、方向徽标及「已触发 X / 共 Y 级」。X 为已触发节点数量，不是最高级别编号。
- 分段条按节点等宽：已触发使用 `chart-1…chart-8` 循环，下一个使用 accent，待触发使用中性轨道。分段间隙从可用宽度扣除，不截掉末段。
- 展开区逐级显示色块、级别与备注、触发价、状态，替代原 token 数值和占比。备注允许换行。
- 方向徽标使用 chart-1 / chart-3 / chart-4，位于名称旁。

## 下一节点进度

以上一已触发节点的价格为起点：

`progress = clamp((referencePrice - previousTriggered.price) / (next.price - previousTriggered.price), 0, 1)`

上例的进度为 50%；递增卖出梯子使用同一个有符号公式。参考价回退到起点之前时为 0%，超过目标为 100%，但都不会改变槽位状态。界面按原组件规则四舍五入为整数百分比。

首级没有已触发起点、两端价格相同或没有指定 `next` 时，进度为未知，显示「—」及空轨道。全部节点均已触发时显示「全部节点已触发」和 100%；若还有 pending 且未指定 next，则显示「暂无下一节点」，不会冒充全触发。脚注列明口径；不添加任何槽位字段。

## agent-limits-card 安装与接口适配

安装命令：`npx -y @collectui/bdui@latest add agent-limits-card --key "$BDUI_KEY"`。安装器只新增组件文件，已有依赖文件均跳过。

原 API 的标题、读数、占比列、Free space 行及底部标题写死为 agent token 用量，因此增加以下可选展示接口，默认用法保持兼容：

1. `presentation.title` / `readout` / `limitsTitle`：注入头部与底部文案；`showFreeSpace` 隐藏与梯子无关的空余用量行。
2. `ContextSegment.display`：将原数值列、百分比列映射为触发价、状态，并接收备注。没有该对象时仍显示原 token / 百分比；`deferred` 仍优先显示「—」。自定义明细不再产生原 token 的原生 title 提示。
3. `context.equalSegments`：为级别语义提供等宽段布局；默认仍按 tokens / max 比例绘制。
4. `UsageLimit.used` 允许 `null`，未知进度显示「—」和空轨道，不伪装成 0%。
5. `presentation.breakdownLabel` 加上 `useId` 生成的 `aria-controls`，为展开区提供可访问名称与按钮关联。

外观调整均在调用层：沿用 `className` 接口设置 1px 边框、`rounded-3xl`、16px 内边距以及语义文字色。原组件分段条、明细行列、分隔线、底部单色条、展开箭头和 motion 动画保留。没有重写组件外壳，也没有新增 hover tooltip。

桌面点击、手机 tap、键盘 Enter / Space 使用同一个原生按钮；再次操作收起。聚焦或悬停不会展开。无内部垂直滚动区。

## 验收记录

- `npm run build`、`npm test`（27 项）、`npm run test:e2e`（15 项）。图轴样式收尾后另重跑对应 6 项浏览器测试通过。构建仍有既有 Vite native-config 兼容性及大 chunk 提示。
- 单测覆盖计数、稀疏级别、双方向进度、越界钳制、零价格、首级未知、同价区间、无下一节点和旧 schema 约束。
- 浏览器覆盖点击 / tap / Enter / Space、无 hover tooltip、3–5 级明细、等宽段、ARIA 关联、空槽位隐藏，以及筛选范围与月度色带对比度。
- 1440×1000、390×844，deviceScaleFactor=1，浅深色下检查外壳、收起与展开态，无页面横向溢出；真实字体加载后另检查 KPI 金额单行。
- 本环境 Chromium 直连 Google Fonts 报 `ERR_TUNNEL_CONNECTION_FAILED`，已确认系统回退可读。字体成功路径的验收通过 curl 获取原始 Google CSS / 字体响应，再在 Playwright 中按原 URL 回放，未改写字体内容或应用 CSP。CDP `CSS.getPlatformFontsForNode` 确认中文标题 / 正文使用自定义 Noto Sans SC（文件内部名 Noto Sans SC Thin），英文标题 / 金额使用自定义 Inter。该验收不等同于当前环境 Chromium 的 Google 直连已恢复。
- 所有最终浏览器验收使用公开虚构 fixture。对第一方文件、公开示例与构建产物扫描凭据模式、可用环境密钥精确值、未掩码账户 / 手机号及常见真实证券代码；未发现匹配；宽泛扫描的构建内 mask-* CSS 后缀命中已核实为误报。仅报告命中文件路径，不输出密钥值。
- 不 commit / push。

验收产物位于 git 忽略的 `test-results/`：

- `boardui-{1440,390}-shell-{light,dark}.png`：页头与侧栏。
- `boardui-{1440,390}-full-{light,dark}.png`：投资全页。
- `watchlist-{1440,390}-faces-{light,dark}.png`：收起卡面。
- `watchlist-{1440,390}-panel-expanded-{light,dark}.png`：完整观察名单展开态。
- `font-audit.json`：实际字形来源与验收传输方式。

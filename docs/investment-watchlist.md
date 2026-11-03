# 第十三单：触发卡价格行式与字体自托管

观察名单仍位于基准对比下方、持仓明细上方，手机一列、桌面两列、超宽屏三列。每只标的调用 BoardUI `AgentLimitsCard`，以原生按钮展开完整梯子。

## 字体与投资页观感

- `src/styles/theme.css` 的 `--font-sans` 使用 `"Noto Sans SC", "Noto Sans SC Fallback", "Inter", "Inter Fallback", sans-serif`，移除未定义的 Next.js `--font-inter` 依赖。
- `src/main.tsx` 引入 `@fontsource/inter` 与 `@fontsource/noto-sans-sc` 的 400 / 500 / 600 / 700 字重 CSS；保留包内 Unicode 分片与 `font-display: swap`，Vite 将 WOFF2 / WOFF 打包至本站 `dist/assets/`。字体栈保持原样。
- `index.html` 已删除 Google Fonts 的预连接与样式链接，CSP 移除两个 Google 字体域名，`font-src` 仅允许 self。`style-src` 保留 `unsafe-inline`，因为现有图表几何、颜色、Motion 动画及 React Aria 控件仍使用内联样式，并非仅供字体使用。
- Noto 本身包含拉丁字形，因此数字 `.tabular-nums`、明确的 LTR 字段、英文标题与日期范围控件显式优先使用 Inter，中文仍回退 Noto；本站字体加载失败时由末尾 `sans-serif` 兜底。
- 侧栏去掉投影，品牌块和未选中导航回归中性表面，选中状态保留蓝色 accent。分段切换去掉浮层阴影，选中字体使用 accent，深色选用同一 accent ramp 的可读级别。
- Panel 既有边框、圆角、内边距不变。紧凑 KPI 内边距由 12px 改为 16px，数字使用 `text-headline-medium`，避免 Inter 加载后在 1440px 布局下拆开金额末位。
- 弱文字使用 `text-text-primary/65` / `/75`，改善深色下原 tertiary token 的可读性。原生卡片通过调用层 className 应用相同文字规则，图轴使用复合 caption 样式。
- 投资收益数值与图表涨跌 chip 使用 chart 色。月度矩阵审计确认原主题别名已映射为 `chart-return-positive → chart-2`、`chart-return-negative → text-error-primary`，保留该映射与四档色深，更新说明。全表正负色带文字对比度测试仍要求至少 4.5。
- 本次只变更 watchlist 节点的 `shares` / `note` 契约与行式；价格、触发状态、金额与收益计算口径、筛选范围及图表数据保持原样。

## 槽位契约

```json
{
  "watchlist": [{
    "symbol": "DEMO-E",
    "name": "虚构候选资产",
    "direction": "买入",
    "referencePrice": 95,
    "levels": [
      { "level": 1, "price": 100, "status": "triggered", "shares": 1000 },
      { "level": 2, "price": 90, "status": "next", "shares": 2000 },
      { "level": 3, "price": 80, "status": "pending" }
    ]
  }]
}
```

- `watchlist` 可选；缺失或空数组时整块隐藏。旧 `alerts` 字段仍被严格 schema 拒绝。
- 每只标的至少一个节点；`level` 为正整数、唯一且升序，只用于内部排序与深度定位；价格有限且非负。
- `shares` 可选，为非负整数；`1000` 显示「1,000 股」，`0` 显示「0 股」，缺失显示「—」。这些示例股数均为虚构计划数量，不参与进度计算。节点 `note` 已移除；严格 schema 会拒绝带有旧字段的数据，填充方须移除该字段。
- 状态依次为 `triggered`、`next`、`pending`，至多一个 `next`。不根据参考价重新判断历史触发状态。
- 头部显示名称、代码、方向徽标及「已触发 X / 共 Y 级」。X 为已触发节点数量，不是最高级别编号。
- 分段条按节点等宽：已触发沿单一 `chart-1-active` 色系按节点序位加深，与当前语义表面混色，比例由 40% 递增至 100%；单节点为 40%。超过五级也不循环色阶，买卖方向不影响颜色。下一个使用 accent，待触发使用中性轨道。分段与行首色块使用同一函数，分段间隙从可用宽度扣除，不截掉末段。
- 展开行按「色块 / 触发价 / 计划股数 / 状态徽标」排列，不显示级别名称及备注。已触发与下一个复用 BoardUI Badge 的 accent 语义色，已触发增加 ✓；待触发使用中性徽标。相同价格仍以唯一 level 标识不同节点。
- 方向徽标使用 chart-1 / chart-3 / chart-4，位于名称旁。

## 下一节点进度

收起态保留头部、分段条及下一节点进度。底部左标签为「下一节点 US$160.00 · 参考价 US$150.00」，允许窄屏换行，右侧百分比与下方进度条保留。

以上一已触发节点的价格为起点：

`progress = clamp((referencePrice - previousTriggered.price) / (next.price - previousTriggered.price), 0, 1)`

上例的进度为 50%；递增卖出梯子使用同一个有符号公式。参考价回退到起点之前时为 0%，超过目标为 100%，但都不会改变槽位状态。界面按原组件规则四舍五入为整数百分比。

首级没有已触发起点、两端价格相同或没有指定 `next` 时，进度为未知，显示「—」及空轨道。全部节点均已触发时显示「全部节点已触发」和 100%；若还有 pending 且未指定 next，则显示「暂无下一节点」，不会冒充全触发。脚注列明口径。

## agent-limits-card 安装与接口适配

安装命令：`npx -y @collectui/bdui@latest add agent-limits-card --key "$BDUI_KEY"`。安装器只新增组件文件，已有依赖文件均跳过。

原 API 的标题、读数、占比列、Free space 行及底部标题写死为 agent token 用量，因此增加以下可选展示接口，默认用法保持兼容：

1. `presentation.title` / `readout` / `limitsTitle`：注入头部与底部文案；`limitsTitle: null` 省略底部额外标题；`showFreeSpace` 隐藏与梯子无关的空余用量行。
2. `ContextSegment.display`：可选 `label` 提供隔离的 LTR 价格，原数值列和百分比列映射为股数、状态徽标，移除备注接口。可选 `id` 保持相同价格节点的稳定标识。自定义状态列允许徽标自然宽度；没有 display 时仍显示原 token / 百分比，`deferred` 仍优先显示「—」。
3. `context.equalSegments`：为级别语义提供等宽段布局；默认仍按 tokens / max 比例绘制。
4. `UsageLimit.used` 允许 `null`，未知进度显示「—」和空轨道，不伪装成 0%；`label` 支持 ReactNode 以隔离 LTR 金额。
5. `presentation.breakdownLabel` 加上 `useId` 生成的 `aria-controls`，为展开区提供可访问名称与按钮关联。

外观调整均在调用层：沿用 `className` 接口设置 1px 边框、`rounded-3xl`、16px 内边距以及语义文字色。原组件分段条、明细行列、分隔线、底部单色条、展开箭头和 motion 动画保留。没有重写组件外壳，也没有新增 hover tooltip。

桌面点击、手机 tap、键盘 Enter / Space 使用同一个原生按钮；再次操作收起。聚焦或悬停不会展开。无内部垂直滚动区。

## 验收记录（2026-11-03）

- `npm run build` 通过；`npm test`：7 个文件、29 项测试通过。
- `PLAYWRIGHT_PREVIEW=1 npm run test:e2e`：17 项测试通过。该模式启动 `vite preview`，在本机无头 Chromium 中直接验收构建产物；默认 `npm run test:e2e` 仍使用开发服务器。
- watchlist 覆盖桌面点击、手机 tap、Enter / Space、ARIA、等宽分段、行首价格、千分位股数、缺失股数、零股数、同价节点、状态徽标与勾选、色块与分段同色、空槽位隐藏、无级别标签和备注。
- 1440×1000 与 390×844、deviceScaleFactor=1，浅色 / 深色展开态已截图自查，无页面横向溢出；下一节点与参考价分别成组换行。
- `document.fonts` 确认 Noto Sans SC 和 Inter 均有 `status: loaded` 的字体分片；实际字体请求全部同源，无字体请求失败、无 Google Fonts 请求。没有字体请求拦截或回放，所有浏览器数据均为公开虚构 fixture。
- `dist` 按所有常规文件的未压缩字节数统计：改造前 1,428,014 bytes（1.43 MB），改造后 24,893,798 bytes（24.89 MB），增加 23,465,784 bytes（23.47 MB）。主要增量为 Noto Sans SC 的 Unicode 分片与字重文件；浏览器只按实际字符与字重请求所需分片，不会一次下载整个 dist。包括 WOFF2 与兼容 WOFF，未将 node_modules 或测试截图计入。
- 保留既有 Vite native-config 导入扩展名提示和 JS chunk 超过 500 kB 提示；构建成功。
- 第一方源码、公开示例及构建文本完成凭据模式扫描；第一方业务数据 / UI 完成常见真实证券代码与未掩码身份数字模式扫描，未命中。应用源码与 dist 不含 Google Fonts 域名；15 个示例节点均为虚构整数股数且没有旧 note。扫描仅输出计数与文件路径，不输出敏感值。
- 不 commit / push。

验收产物位于 git 忽略的 `test-results/`：

- `watchlist-{1440,390}-panel-expanded-{light,dark}.png`：完整观察名单与展开行式。
- `watchlist-{1440,390}-faces-{light,dark}.png`：收起态。
- `font-audit.json`：构建产物 URL、已加载字体分片、同源字体请求与 Google 请求空列表。

# 第十三单：触发卡价格行式与字体自托管

观察名单仍位于基准对比下方、持仓明细上方，手机一列、桌面两列、超宽屏三列。每只标的调用 BoardUI `AgentLimitsCard`，以原生按钮展开完整梯子。

当前卡片底部展示下一节点价格、当前价格、距下一节点百分比和击球区徽标，替代旧版区间进度条；顶部节点完成进度与展开梯子保留。当前价格使用快照中的 `referencePrice`，不是实时行情。差距为 `(下一节点价格 − 当前价格) / 当前价格 × 100%`，正值表示还需上涨，负值表示还需下跌。已有节点触发即显示「已进入击球区 · 第 N 阶段」，N 取最近已触发节点的 `level`，不使用距下一节点的距离决定是否退出；全部触发后保留最高已触发阶段。尚无节点触发时，差距绝对值不超过 5%（含边界）显示「临近击球区」，其余显示「未进入击球区」。当前价为 0 或无下一节点时差距显示「—」，不影响已有触发阶段；全部触发时下一节点位置显示「全部节点已触发」。徽标不会修改填充的历史触发状态，买入、卖出、观察统一使用节点阶段。区块标题沿用基准对比的 `text-body-medium text-text-secondary`。

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
- 每只标的至少一个节点；`level` 为正整数、唯一且升序，只用于内部排序与稳定标识；渐变位置按当前梯子的节点序号定位；价格有限且非负。
- `shares` 可选，为非负整数；`1000` 显示「1,000 股」，`0` 显示「0 股」，缺失显示「—」。这些示例股数均为虚构计划数量，不参与进度计算。节点 `note` 已移除；严格 schema 会拒绝带有旧字段的数据，填充方须移除该字段。
- 状态依次为 `triggered`、`next`、`pending`，至多一个 `next`。不根据参考价重新判断历史触发状态。
- 头部显示名称、方向徽标；标题同行右侧、展开箭头之前以 caption 显示「已触发 X/Y」。X 为已触发节点数量，不是最高级别编号。`symbol` 保留在槽位与内部标识中，不再展示代码行。
- 完成条以 `chart-track` 为全宽底轨，上覆全宽 emerald 连续渐变，按「已触发级数 / 总级数」用 `clip-path: inset()` 裁去右侧未完成部分。50% 完成时只露出完整渐变的左半段，渐变不会压缩进填充宽度。细刻度叠在填充上方，按节点数量等距定位；下一节点不再使用蓝色段。
- 渐变浅端为 `chart-7` 40% 与 `text-white` 的 Oklab 混色，深端为 `chart-7-active`；两种主题均保持左浅右深。`watchlistGradientColor(position)` 与 CSS 渐变共用 Oklab 插值；调用层按 `(index + 0.5) / N` 计算已触发行首色块。next / pending 均用轨道灰，不取渐变色。没有分档色表，也没有第四级封顶。
- 展开行按「色块 / 触发价 / 计划股数 / 状态徽标」排列，不显示级别名称及备注。已触发复用 BoardUI Badge，以 `chart-7/20` 浅绿底和 `calendar-event-emerald-title` 主题适配绿系文字色显示 ✓，无障碍名称仍为「已触发」；下一个与待触发保留文字和原中性徽标。相同价格仍以唯一 level 标识不同节点。
- 方向徽标使用 chart-1 / chart-3 / chart-4，位于名称旁。

## 下一节点进度

收起态保留头部、完成条及下一节点进度。底部左标签为「下一节点 US$160.00 · 参考价 US$150.00」，允许窄屏换行，右侧百分比与下方进度条保留。

以上一已触发节点的价格为起点：

`progress = clamp((referencePrice - previousTriggered.price) / (next.price - previousTriggered.price), 0, 1)`

上例的进度为 50%；递增卖出梯子使用同一个有符号公式。参考价回退到起点之前时为 0%，超过目标为 100%，但都不会改变槽位状态。界面按原组件规则四舍五入为整数百分比。

首级没有已触发起点、两端价格相同或没有指定 `next` 时，进度为未知，显示「—」及空轨道。全部节点均已触发时显示「全部节点已触发」和 100%；若还有 pending 且未指定 next，则显示「暂无下一节点」，不会冒充全触发。脚注列明口径。

## agent-limits-card 安装与接口适配

安装命令：`npx -y @collectui/bdui@latest add agent-limits-card --key "$BDUI_KEY"`。安装器只新增组件文件，已有依赖文件均跳过。

原 API 的标题、读数、占比列、Free space 行及底部标题写死为 agent token 用量，因此增加以下可选展示接口，默认用法保持兼容：

1. `presentation.title` / `readout` / `limitsTitle`：注入头部与底部文案；`limitsTitle: null` 省略底部额外标题；`showFreeSpace` 隐藏与梯子无关的空余用量行。
2. `ContextSegment.display`：可选 `label` 提供隔离的 LTR 价格，原数值列和百分比列映射为股数、状态徽标，移除备注接口。可选 `id` 保持相同价格节点的稳定标识。自定义状态列允许徽标自然宽度；没有 display 时仍显示原 token / 百分比，`deferred` 仍优先显示「—」。
3. `context.completion`：可选 `used`（0–1）、`gradient` 与无障碍 `label`，启用全宽渐变裁切及等距刻度；观察名单由调用层传入完成比例与渐变。不传时仍按 tokens / max 绘制原分段条，原 `equalSegments` 接口保留。
4. `UsageLimit.used` 允许 `null`，未知进度显示「—」和空轨道，不伪装成 0%；`label` 支持 ReactNode 以隔离 LTR 金额。
5. `presentation.breakdownLabel` 加上 `useId` 生成的 `aria-controls`，为展开区提供可访问名称与按钮关联。

外观调整均在调用层：沿用 `className` 接口设置 1px 边框、`rounded-3xl`、16px 内边距以及语义文字色。第十七单通过可选接口将观察名单分段条改为渐变完成条；明细行列、分隔线、底部单色条、展开箭头和 motion 动画保留。没有重写组件外壳，也没有新增 hover tooltip。

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

## 第十四单验收（2026-11-03）

- 仅在观察名单调用层移除代码行、将卡头读数改为单行 caption「已触发 X/Y」、将已触发徽标改为有色底 ✓（`aria-label="已触发"`）；槽位数据、原生组件结构与展开交互保持不变。
- `npm run build`、29 项单元测试、构建产物上的 17 项 Playwright 测试全部通过，相关断言已更新；`git diff --check` 通过。
- 自查 1440px、100% 缩放浅色 / 深色展开态截图：名称下无代码、读数与标题同行且位于箭头之前、已触发徽标仅有对号；价格、股数、分段条、下一节点区域保持原结构。390px 深浅色及键盘交互回归通过。
- `rg` 凭据模式与已配置 BoardUI key 精确扫描无命中；业务源码、公开示例和测试的常见真实证券标识 / 未掩码身份模式扫描无命中，投资示例中的 12 个 symbol 均为 DEMO 标识。未读取本地真实数据，扫描记录在 `test-results/watchlist-slim-scan.json`。
- 未 commit / push。

## 第十六单验收（2026-11-03）

- 已触发分段与行首色块共用 `watchlistLevelColor(status, level)`：`chart-7` 与语义表面混色，固定 40% / 60% / 80% / 100% 四档，第四级封顶；✓ 使用同系浅绿底，文字色随主题适配。下一节点 accent 蓝、待触发轨道灰、原组件结构及槽位推导逻辑保持不变。
- `npm run build`、29 项单元测试及构建产物上的 17 项 Playwright 测试全部通过；`git diff --check` 通过。构建仍有既有配置导入扩展名及大 chunk 提示。
- 1440px、deviceScaleFactor=1 浅色 / 深色全展开态截图已自查；附加虚构八级梯子覆盖四档绿阶与第四级以后的封顶，分段与行首色块一致。最浅档可辨；色块和分段内没有叠字，✓ 对比度浅色约 6.15:1、深色约 8.05:1，均超过 4.5:1。
- 截图：`test-results/watchlist-emerald-1440-{example,four-bands}-{light,dark}.png`；颜色与对比度实测：`test-results/watchlist-emerald-audit.json`。
- `rg` 扫描第一方文件及构建文本，共 101 个文件，凭据模式与已配置密钥均无命中；业务源码 / 公开示例 / 测试的常见真实证券标识及未掩码身份模式无命中，12 个投资 symbol 均为 DEMO 标识。未读取本地真实数据，记录为 `test-results/watchlist-emerald-scan.json`。
- 未 commit / push。

## 第十七单验收（2026-11-03）

- 完成条采用全宽 `chart-7` 色系连续渐变，由已触发数量 / 总级数裁切；边界以 1px 刻度叠在填充和轨道上。行首标记按节点中点采样同一渐变，next / pending 均为轨道灰。卡头读数、价格 / 股数行式、二元徽标、底部区间进度和槽位推导保持不变。
- `npm run build`、29 项单元测试、构建产物上的 17 项 Playwright 测试全部通过；`git diff --check` 通过。构建保留既有 Vite 配置导入扩展名及大 chunk 提示。
- 1440px、deviceScaleFactor=1、100% 缩放的浅色 / 深色全展开态已自查：渐变连续且均为左浅右深，填充与轨道上的刻度可辨，未完成色块为灰色。390px、键盘、缺失股数与零值、同价节点、空名单回归通过。
- 附加虚构稀疏级号梯子覆盖 4/8、8/8、0/8 和 1/1。像素比对：半完成与全完成条的左半段完全一致；已触发行首色与对应渐变中点的 RGB 单通道最大误差为 1（8-bit 量化），未触发行首为轨道色。八级全完成条检测到 182 个不同渐变颜色，不再按四档封顶；两种主题均通过。
- 截图：`test-results/watchlist-gradient-1440-{example,normalized}-{light,dark}.png`；几何与颜色记录：`test-results/watchlist-gradient-audit.json`；像素比对：`test-results/watchlist-gradient-pixels.json`。
- `rg` 扫描 98 个第一方文件 / 构建文本的凭据模式及 28 个业务源码 / 公开示例 / 测试文件的常见真实证券与未掩码身份模式，无命中；可用的已配置密钥精确扫描无命中。投资示例的 12 个 symbol 均为 DEMO 标识。未读取本地真实数据；记录：`test-results/watchlist-gradient-scan.json`。
- 未 commit / push。

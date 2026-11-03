# 第十一单：触发 / 观察名单小卡片

原主栏位置保留：基准对比下方、持仓明细上方。手机一列，桌面两列，超宽屏三列。正面只展示标的与方向、当前触发等级、参考价及距下一节点百分比。

## 槽位迁移

`alerts` 已删除，由可选的 `watchlist` 替代；严格 schema 会拒绝旧 `alerts` 字段，需要填充方显式迁移。未提供 `watchlist` 或提供空数组时整块隐藏。

```json
{
  "watchlist": [{
    "symbol": "DEMO-E",
    "name": "虚构候选资产",
    "direction": "买入",
    "referencePrice": 100,
    "levels": [
      { "level": 1, "price": 100, "status": "triggered", "note": "虚构阈值，仅作展示。" },
      { "level": 2, "price": 90, "status": "next" },
      { "level": 3, "price": 80, "status": "pending" }
    ]
  }]
}
```

- 每只标的至少一个节点；`level` 为正整数、唯一且升序；价格有限且非负。
- 状态依次为 `triggered`、`next`、`pending`；至多一个 `next`，允许没有下一节点。
- 等级取最高 `triggered.level`，无已触发节点时显示「一级待触发」。不根据参考价重新判断历史触发状态。
- 距下一节点 = `abs(next.price - referencePrice) / referencePrice × 100%`，买卖方向均显示绝对距离。参考价为零显示「—」；没有 `next` 时省略距离。
- 原 `triggerPrice`、`distancePct`、标的级 `status` / `note` 不再使用；价格、状态和备注放入各级节点。
- 示例共四只 DEMO 标的，梯子分别为 4 / 3 / 5 / 3 级，覆盖二级已触发、一级已触发、一级未触发和全部触发。数据均为虚构圆整价格。

## 组件与交互

复用已安装的 BoardUI `Tooltip` / `TooltipTrigger`、`Button`、`Badge`，无需安装新组件，无已装组件源码修改。

调用层以 React Aria `Focusable` 对接 BoardUI 原生 Button 和 Tooltip：桌面悬停或键盘聚焦显示完整梯子，Escape 关闭。点击、Enter / Space 展开卡片内同一份 `TriggerLadder`，再次点击或 Escape 收起；展开后禁用 Tooltip，避免重复展示。触屏使用点击展开，不依赖 hover。按钮提供 `aria-expanded` / `aria-controls`，展开区有名称，梯子使用有序列表。

保留 BoardUI Tooltip 的非交互行为；需要持续查看时点击展开。卡片表面与文字通过调用层语义 token 调整，已触发节点使用强调色边框与状态徽标，下一节点使用橙色状态 token，远期节点使用中性表面与徽标。不引入内部滚动区域。

## 验证

- `npm run build`、`npm test`（25 项）和 `npm run test:e2e`（15 项）。保留既有 Vite 配置兼容性和大 chunk 提示。
- 单测覆盖等级推导、无下一节点、距离分母、参考价为零、空槽位隐藏及 schema 约束。
- 浏览器覆盖 hover、键盘 Tab / Enter / Escape、完整 3–5 级梯子、真实触屏 tap 展开与收起、空槽位隐藏及账户 / 框架筛选下名单保留。
- 1440×1000 与 390×844、deviceScaleFactor=1，浅深色正面与展开截图；检查无横向溢出和页面异常。
- 对源码、公开示例、测试、文档与构建产物进行凭据模式扫描，并精确检查当前环境可用密钥；对第一方源码及示例检查未掩码手机号 / 账户号、常见真实证券代码。未发现匹配；初始宽泛扫描命中的构建内 `mask-*` CSS 字符串已核实为误报。
- 未读取本地个人数据文件，浏览器截图强制使用公开虚构 fixture。未 commit / push。

截图位于 git 忽略的 `test-results/`：

- `watchlist-1440-faces-light.png` / `watchlist-1440-faces-dark.png`
- `watchlist-1440-expanded-light.png` / `watchlist-1440-expanded-dark.png`
- `watchlist-390-faces-light.png` / `watchlist-390-faces-dark.png`
- `watchlist-390-expanded-light.png` / `watchlist-390-expanded-dark.png`

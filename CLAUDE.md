# CLAUDE.md — Price Pilot

> 每个 session 自动加载。目标：新 agent 读完这一页就能开工，无需用户重新介绍项目。
> 路线图与阶段进度看 [`plan.md`](plan.md)（唯一权威）；本文件只放不易变的项目知识与约定。

## 这是什么

浏览器端的**单价对比工具**：输入价格+数量，自动换算统一单价并排序，帮用户在货架前/网购时选更划算的。中英双语、离线可用、无需账号。竞品心智是「手机计算器」——降低输入成本是产品第一原则。

## 技术栈与架构硬约束

- Next.js 15（**Pages Router**，非 App Router）+ React 19 + TypeScript（`strict`）+ Tailwind 3 + Vitest。
- **无后端、无数据库、无账号**。数据只存浏览器：IndexedDB（清单，库名 `price-pilot`）+ localStorage（偏好/汇率缓存）。任何涉及后端/数据库的 skill 或建议都不适用于本项目。
- 唯一的服务端代码是 `pages/api/exchange-rates.ts`（汇率 API 代理，需 `EXCHANGE_RATE_API_KEY`，可选；不配也能用单币种）。

## 目录地图

- `pages/` — `index.tsx`（首页＝快速对比 hero + 清单管理）、`list/[id].tsx`（清单详情，含 `?share=`）、`en.tsx`（英文路由，**复用 HomePage**，改首页即覆盖双语）、`api/exchange-rates.ts`、SEO 路由（sitemap/robots/llms.txt）。
- `lib/` — `comparison-math.ts`（单价计算/分组排序）、`comparison-lists.ts`（IndexedDB CRUD + 归一化）、`quick-compare.ts`（快速对比纯函数 + `formatUnitPrice`）、`share-utils.ts`、`smart-product-parser.ts`（自然语言录入）、`data-backup.ts`、`seo.ts`。
- `constants/` — `translations.ts`（**中英文字典，所有 UI 文案的来源**）、`currencies.ts`、`unitSystem.ts`。
- `context/` — `LanguageContext`、`ThemeContext`。`hooks/` — `useListState` / `useUndoDelete` / `useShareLink` / `useShareImage`。
- `docs/design/redesign-directions.html` — 视觉方向定稿的可视化参照。

## 关键约定（违反会引入 bug 或不一致）

- **导入一律用 `@/` 别名**。
- **所有 UI 文案走 `t()`**（`useLanguage`），中英文 key 成对加进 `constants/translations.ts`，占位符用 `{name}`/`{pct}`。**禁止硬编码中英文**。
- **单价展示用 `formatUnitPrice`（动态精度）**，不要用 `formatCurrencyAmount`——后者固定 2 位小数，会把 ¥0.037/¥0.040 都压成 ¥0.04。`formatCurrencyAmount` 只用于金额合计（如省钱计算器总额）。
- **语义色纪律**：茶青 `--brand` = 省/最优；暖红 `--danger` = 更差/破坏性操作。不要混用。
- **视觉语言＝「精密账本」**：一层容器 + 发丝线（`--border-subtle`）分隔 + 状态靠整行浅染（`--brand-soft`），**不要盒中盒嵌套**；数字用 `--font-num` + `tabular-nums`，单价用 `PriceLockup` 组件。
- 分享图是**固定浅色小票世界**（`ReceiptShareCard`），不随主题切换——这是刻意的例外。

## 命令

```bash
npm run dev        # 开发（默认 3000；验证时用别的端口避免撞用户会话）
npm run test:run   # 全量测试（当前 13 文件 / 50 用例）
npm run build      # 生产构建
# npm run lint 不可用——ESLint 从未配置过，运行会卡在交互式初始化提示
```
> 裸 `tsc --noEmit` 会在 `tests/**` 报一批 vitest 全局类型错误，是**既有环境问题**，与改动无关；只看源码目录是否干净。

## 验证与已知坑

- 改了产品代码后用 **verify skill**（`.claude/skills/verify/SKILL.md`）：起 dev server + Playwright 驱动，别只跑测试。
- ⚠️ **分享小票（`ReceiptShareCard`）的装饰只能用真实元素/边框/位图**：html2canvas 不还原 repeating-gradient（虚线整条丢失）、CSS `text-overflow: ellipsis`（文字下多画一条实线）、flex/百分比 translate 居中、旋转元素内的文字（红章文字掉到圈底）。红章是 `renderStampImage` 用原生 canvas 预绘的 `<img>`；名称超长走 JS 截断（`truncateReceiptName`）。改小票后必须用 Playwright 实际生成 PNG 目检，DOM 里对不代表导出对。
- **Service Worker 只在生产注册**（`_app.tsx`；dev 自动注销避免缓存干扰热更新）。测离线要 `npm run build && npm start` 后断网验证。
- SSR 参与首屏的组件（如 QuickCompare 初始行）**禁止用随机值生成 id**，会 hydration mismatch；初始状态用确定性 id，客户端追加的才可随机。

## 协作方式（用户偏好）

- **plan-first**：先把方案写进 `plan.md` 作为规格，再实现。设计类决策先做 HTML 原型让用户「看到再定」。
- **多智能体**：规格明确的模块用 Sonnet、交互重的组件用 Opus，主会话做规格 + 审查全量 diff + Playwright 端到端把关。
- 用户是本项目独立开发者，直接在 `main` 上提交。

## 维护协议（**每个 agent 都要遵守**）

保持文档不过期是本项目的显式要求。触发即更新：
- 完成 `plan.md` 的某阶段/子阶段 → 更新该阶段「当前状态」**并**同步顶部「项目现状摘要」。
- 引入新约定 / 架构决策 / gotcha / 依赖 / 命令 → 更新本文件对应小节。
- 别让「现状摘要」的数字或状态与代码脱节；发现脱节顺手修正。

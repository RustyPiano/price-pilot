# Price Pilot 开发计划

> 最后更新: 2026-10-04
> 版本: 0.1.0 -> 目标 1.0.0

---

## 项目现状摘要

> 更新于 2026-10-04（阶段三 3.2、3.3 完成后）。易变的精确数字（行数/组件数）只作量级参考，别当契约维护；权威进度看下方各阶段「当前状态」。

| 指标 | 当前值 |
|------|--------|
| 源代码规模 | ~6,800 行 TS/TSX（不含测试） |
| 页面路由 | 首页 + 列表详情 + 英文路由 + 汇率 API + SEO 路由 |
| 测试 | Vitest, 14 文件 / 71 用例全绿 |
| 类型系统 | 全量 TypeScript (`strict: true`) |
| 路由方案 | Pages Router (Next.js 15) |
| 状态管理 | useState + 自定义 hooks + Language/Theme 两个 Context |
| 数据持久化 | IndexedDB (清单) + localStorage (缓存/偏好)，**无后端/无数据库** |
| 主题 | light / dark / system 三态 |
| 视觉语言 | 「精密账本」(一层容器 + 发丝线 + 整行染色 + 等宽数字)，见阶段四 |
| PWA | manifest + shortcuts + Service Worker 生产注册 (页面和静态资源先返回缓存、后台更新；`/api/` 不经过缓存)，访问过的页面离线可用，弱网打开不等网络 (见 3.3) |
| 外部依赖 | 7 个生产依赖 + Vitest / TypeScript 工具链 |

**已交付里程碑**：阶段一（TS 迁移 / 测试 / 暗色 / 备份 / 汇率代理）✓ · 阶段二 2.1（组件拆分）✓ · **阶段三 快速对比首屏 + 单位 chip + 货架提速（多件装 / 促销 / 弱网秒开 / 输入保存 / 添加到主屏幕提示）✓** · **阶段四 视觉重设计 + 小票分享 ✓** · **阶段五 全权委托打磨（bug 清偿 / SEO / PWA 离线 / 分享图渲染 / a11y）✓**。
**下一步候选**：网购场景粘贴多行商品标题一次识别 / 阶段二 2.4 价格历史（先做「记住同一商品上次的单价和门店」）；2.2 App Router 迁移收益低, 建议继续后置。

---

## 阶段一: 短期目标 (1-2 周)

**当前状态**: 已完成

**完成说明**:
- 已完成 1.1 TypeScript 迁移与 `@/` 别名统一
- 已完成 1.2 核心 `lib/` 单元测试与 coverage 校验
- 已完成 1.3 暗色模式、系统跟随与手动切换
- 已完成 1.4 JSON 数据导出 / 导入与冲突处理
- 已完成 1.5 汇率 API 服务端代理与缓存 (客户端并发去重已于 2026-10 精简时移除)

各子阶段的完整规格 (步骤 / 验收清单) 见 git 历史: `ac66144 Implement phase one roadmap` 之前的 `plan.md`。

---

## 阶段二: 中期目标 (1-2 月)

**当前状态**: 进行中

**完成说明**:
- 已完成 2.1 `ListWorkspace` 组件拆分、Hook 抽离与测试补充
- 2.2 App Router 迁移待开始
- 2.3 PWA 离线已由阶段五以轻量方案完成 (复用手写 sw.js, 未引 Serwist; 见 5.3)
- 2.4 价格历史与趋势待开始

### 2.1 ListWorkspace 组件拆分

**状态**: 已完成

**目标**: 将 662 行的 `ListWorkspace.tsx` 拆分为多个自定义 Hook 和子组件, 提升可维护性

**优先级**: P1 -- 功能扩展的前提

**当前问题**:
- `ListWorkspace.tsx` 承担了 7 种职责: 状态管理、产品 CRUD、undo/delete、分享链接、分享图片、面板管理、元数据编辑
- 所有逻辑集中在一个函数组件中, 每次修改都需通读全文
- `UndoToast` 子组件内联在同文件中

**拆分方案**:

1. **自定义 Hooks** (从 ListWorkspace 提取):

   | Hook | 职责 | 提取的状态/逻辑 |
   |------|------|------------------|
   | `useListState(list, onSave)` | 列表状态管理 | `listRef`, `pushListUpdate()`, 产品增删改、元数据更新 |
   | `useUndoDelete(pushUpdate)` | 撤销删除 | `pendingDeleteRef`, `pendingClearRef`, `handleDeleteProduct()`, `handleClearAll()`, undo toast 逻辑, cleanup |
   | `useShareLink(list)` | 分享链接 | `encodeSharedComparisonList`, clipboard 写入, fallback modal 状态 |
   | `useShareImage(resultRef)` | 分享图片 | `html2canvas` 动态导入, canvas 生成, blob URL, preview modal 状态 |

   Hook 文件位置: `hooks/`

2. **子组件提取**:

   | 组件 | 来源 | 说明 |
   |------|------|------|
   | `UndoToast.tsx` | ListWorkspace 内联组件 | 移至 `components/UndoToast.tsx` |
   | `ShareLinkModal.tsx` | ListWorkspace 中的 modal 渲染 | 分享链接 fallback modal |
   | `ShareImageModal.tsx` | ListWorkspace 中的 modal 渲染 | 图片预览 + 下载 modal |
   | `ListMetadataEditor.tsx` | ListWorkspace 中的名称/类别编辑区 | inline 编辑 + onBlur 保存 |
   | `ToolPanel.tsx` | ListWorkspace 中的面板切换逻辑 | UnitManager/UnitConverter 的容器 |

3. **重构后 ListWorkspace 结构**:
   ```tsx
   function ListWorkspace({ comparisonList, onSaveList }: Props) {
     const { locale, t } = useLanguage();
     const { list, addProduct, updateProduct, removeProduct, updateMetadata, updateCurrency, updateUnits } = useListState(comparisonList, onSaveList);
     const { handleDelete, handleClearAll, pendingProductIds } = useUndoDelete(/* ... */);
     const { shareLink, shareLinkModal } = useShareLink(list);
     const { shareImage, shareImageModal } = useShareImage(resultRef);

     return (
       <>
         <ListMetadataEditor ... />
         <ToolPanel ... />
         <AddProductForm ... />
         <ProductList ... />
         {shareLinkModal}
         {shareImageModal}
       </>
     );
   }
   ```

**验收标准**:
- [x] `ListWorkspace.tsx` 缩减到 150 行以内
- [x] 每个 Hook 有独立的测试文件
- [x] 所有现有功能不变 (undo、分享、编辑等)
- [x] 无新增 prop drilling -- Hook 封装内部状态

---

### 2.2 App Router 迁移

**目标**: 从 Pages Router 迁移到 App Router, 采用 React Server Components

**优先级**: P1 -- 架构现代化

**当前问题**:
- Next.js 15 但仍用 Pages Router, 错失 RSC、Streaming SSR、改进的 layout/loading/error 模式
- 当前零 SSR 数据获取 (无 `getServerSideProps`), 纯客户端渲染
- 仅 2 个页面 + 2 个框架文件, 迁移成本可控

**迁移方案**:

1. **目录结构规划**:
   ```
   app/
   ├── layout.tsx          # 替代 _app.tsx: ErrorBoundary, ThemeProvider, LanguageProvider, Toaster, Head
   ├── page.tsx             # 替代 pages/index.tsx: 首页
   ├── loading.tsx          # 首页 skeleton loading
   ├── error.tsx            # 首页错误处理
   ├── not-found.tsx        # 404 页面
   ├── list/
   │   └── [id]/
   │       ├── page.tsx     # 替代 pages/list/[id].tsx
   │       ├── loading.tsx  # 列表详情 skeleton
   │       └── error.tsx    # 列表详情错误处理
   └── api/
       └── exchange-rates/
           └── route.ts     # 替代 pages/api/exchange-rates.ts
   ```

2. **迁移步骤**:

   **Step 1: 共存阶段**
   - 创建 `app/layout.tsx`, 迁移 `_app.tsx` 中的 provider 包裹和 Head 配置
   - 保留 `pages/` 目录, 确认 Next.js 共存模式正常工作
   - 验证两个路由系统不冲突

   **Step 2: 迁移首页**
   - 创建 `app/page.tsx` (client component, `'use client'`)
   - 迁移 `pages/index.tsx` 的逻辑
   - 创建 `app/loading.tsx` -- 首页骨架屏
   - 创建 `app/error.tsx` -- 首页错误边界 (替代全局 ErrorBoundary 的部分职责)
   - 测试通过后删除 `pages/index.tsx`

   **Step 3: 迁移列表页**
   - 创建 `app/list/[id]/page.tsx` (client component)
   - 迁移分享链接解码逻辑 (`?share=` 参数处理)
   - 创建 `app/list/[id]/loading.tsx` 和 `error.tsx`
   - 测试通过后删除 `pages/list/[id].tsx`

   **Step 4: 迁移 API Route**
   - 创建 `app/api/exchange-rates/route.ts` (使用 Route Handlers)
   - 测试通过后删除 `pages/api/exchange-rates.ts`

   **Step 5: 清理**
   - 删除 `pages/` 目录
   - 删除 `pages/_document.tsx` (逻辑移入 `app/layout.tsx`)
   - 更新 `next.config.mjs` 如有需要

3. **Server Component 机会**:
   - `layout.tsx` 作为 Server Component -- 静态 shell, provider 通过独立 client component 包裹
   - 首页和列表页当前高度交互, 短期内保持 `'use client'`
   - 后续可将 metadata (SEO tags) 通过 `generateMetadata()` 服务端生成

4. **改进项**:
   - 用 `loading.tsx` 替代组件内手动骨架屏逻辑
   - 用 `error.tsx` 提供路由级错误边界, 替代单一全局 ErrorBoundary
   - 用 `not-found.tsx` 处理 404
   - 用 `generateMetadata()` 统一 SEO meta 管理

**注意事项**:
- `LanguageContext` 和 `ThemeContext` 是 client-side Context, 需要在 `app/layout.tsx` 中通过一个 `'use client'` 的 Providers 组件包裹
- IndexedDB 操作仅限浏览器, 所有数据获取逻辑保持 client-side
- `react-hot-toast` 的 `Toaster` 是 client component
- 确保 `?share=` 查询参数在 App Router 下正确获取 (使用 `useSearchParams()`)

**涉及文件**:
- `app/` 目录 -- 全新创建
- `pages/` 目录 -- 最终删除
- `components/Providers.tsx` -- 新建, 封装 client-side providers
- `next.config.mjs` -- 可能需要更新

**验收标准**:
- [x] 所有页面在 App Router 下功能一致
- [x] `loading.tsx` 提供路由级 loading UI
- [x] `error.tsx` 提供路由级错误恢复
- [x] SEO meta tags 通过 `generateMetadata()` 生成
- [x] 分享链接 (`?share=`) 正常工作
- [x] `pages/` 目录完全移除
- [x] `npm run build` 零错误

---

### 2.3 修复 PWA 离线支持

**状态**: 已完成 (2026-07-13, 由 5.3 以轻量方案交付: 复用手写 sw.js + 生产注册, 未引 Serwist; 仅在需要 precache 全量资源时再考虑)。原 Serwist 方案见 git 历史 (`868589d` 之前的 `plan.md`)。

---

### 2.4 价格历史与趋势

**目标**: 记录产品价格变化, 支持查看历史价格趋势图

**优先级**: P2 -- 将"一次性比较工具"升级为"长期省钱助手"

**当前问题**:
- 每次添加产品时只保存当前价格, 修改后旧价格丢失
- 用户无法追踪同一商品在不同时间/渠道的价格变化
- 缺乏"什么时候买最划算"的洞察

**数据模型扩展**:

```typescript
// 价格记录
interface PriceRecord {
  price: number;
  quantity: number;
  unit: string;
  currency: string;
  unitPrice: number;      // 计算后的标准单价 (方便趋势对比)
  recordedAt: string;     // ISO 8601
  source?: string;        // 可选: 来源 (哪个超市/平台)
}

// 扩展 Product 类型
interface Product {
  // ... existing fields
  priceHistory: PriceRecord[];  // 新增: 价格历史
}
```

**实施步骤**:

1. **自动记录价格历史** -- 修改 `useListState` hook:
   - 添加产品时: 初始化 `priceHistory = [{ ...当前价格数据, recordedAt }]`
   - 编辑产品价格时: 如果价格/数量/单位有变化, push 新记录到 `priceHistory`
   - 不删除历史记录, 只追加

2. **价格历史面板** -- 新建 `components/PriceHistoryPanel.tsx`:
   - 在产品卡片上添加"价格历史"展开按钮 (小图标)
   - 点击展开时空间内显示:
     - **价格趋势迷你折线图**: X 轴时间, Y 轴标准单价
     - **历史记录列表**: 日期 + 价格 + 变化百分比
     - **统计摘要**: 最低价、最高价、平均价、当前 vs 最低差距

3. **趋势图实现** -- 轻量方案:
   - 使用原生 `<svg>` + `<polyline>` 绘制, 无需引入图表库
   - 或使用轻量库 `recharts` (如果后续需要更多图表功能)
   ```bash
   npm install recharts    # 可选, 如需复杂图表
   ```
   - 迷你图尺寸: 宽度 100%, 高度 120px
   - 数据点用圆点标记, hover 显示具体数值

4. **价格来源标记** -- 可选增强:
   - 产品表单增加可选的"来源"字段 (如"盒马"、"山姆"、"京东")
   - 历史记录按来源区分颜色
   - 允许同一产品从不同来源添加多条记录

5. **数据兼容性**:
   - 已有产品无 `priceHistory` 字段 -- `normalizeProduct()` 中自动初始化为 `[{当前价格}]`
   - 导出/导入 (`data-backup.ts`) 自动包含 `priceHistory`
   - 分享链接可选是否包含历史 (默认不包含以减小 URL 长度)

6. **清理功能**:
   - 提供"清除价格历史"操作 (保留当前价格, 清空历史记录)
   - 历史记录上限: 50 条/产品 (超出时移除最旧记录)

**涉及文件**:
- `types/index.ts` -- 添加 `PriceRecord` 接口, 扩展 `Product`
- `lib/comparison-lists.ts` -- `normalizeProduct` 添加 `priceHistory` 初始化
- `hooks/useListState.ts` -- 产品更新时追加历史记录
- `components/PriceHistoryPanel.tsx` -- 新建趋势图 + 历史列表
- `components/ProductList.tsx` -- 产品卡片添加"价格历史"入口
- `components/ProductEditorForm.tsx` -- 可选添加"来源"字段
- `lib/data-backup.ts` -- 确保导入/导出兼容
- `lib/share-utils.ts` -- 分享时可选剥离历史数据
- `constants/translations.ts` -- 添加相关翻译

**验收标准**:
- [x] 每次编辑产品价格自动追加历史记录
- [x] 产品卡片可展开查看价格历史
- [x] 趋势图正确渲染 (至少 2 个数据点时显示)
- [x] 历史记录显示日期、价格、变化百分比
- [x] 统计摘要准确 (最低/最高/平均)
- [x] 旧数据迁移兼容 (无 priceHistory 的产品自动初始化)
- [x] 历史记录上限 50 条
- [x] 导出/导入包含历史数据

---

## 阶段三: 快速对比模式 (免清单首屏)

**当前状态**: 已完成。3.1 (2026-07-07)；3.2、3.3 (2026-10-04)，均经 Playwright 浏览器端到端验证

**优先级**: P0 -- 建议先于 2.2-2.4 执行。架构迁移可以等, 产品"不如计算器顺手"的问题不能等。

**背景与问题**:
- 输入税: 对比前必须先建清单, 商品四字段全部必填 (`ProductEditorForm.tsx` 校验 name/price/quantity/unit), 而货架场景 90% 是同单位两三件商品的一次性决策
- 访问税: 首页 (也是 PWA start_url) 是清单管理页, 不是对比工具
- 真正的竞品是系统计算器: `7.9÷500` 六次按键出结果, 任何仪式感都会输
- 已有的智能解析器 (`lib/smart-product-parser.ts`) 埋在清单页表单的名称栏里, 没有发挥降低输入成本的作用

**方向 (2026-07-07 经三方案活原型验证后选定)**: 双行表格式做骨架 (系统数字键盘, 结构化字段, 零解析失败路径), 借计算器方案的节奏 (回车自动跳格), 智能解析降级为桌面端/名称栏增强。自建键盘方案不做。

---

### 3.1 QuickCompare 首屏组件

#### 设计决策 (最可能需要调整的部分, 评审先看这里)

**D1 信息架构 -- 不新增路由, 首页翻转**

快速对比作为 hero 插入 `pages/index.tsx` 的 `<main>` 顶部, 现有「统计面板 + 新建清单」及清单卡片整体下移。canonical、structured data、`en.tsx` 双语路由全部不动。

- 备选方案 (被否): 独立 `/quick` 路由 + PWA `start_url` 指向它。多一个路由要维护双语 SEO 和 hreflang, 且普通网页访客也应该第一眼看到工具而非清单管理。
- `manifest.json` 增加 `shortcuts` (长按图标直达对比), `start_url` 保持 `/`。

**D2 数据模型 -- 纯 React state, 不进 IndexedDB**

```typescript
interface QuickCompareRow {
  id: string;        // buildEntityId('quick')
  price: string;     // 保留原始输入字符串, 计算时 parseFloat
  quantity: string;
}
```

- 用字符串而非 number, 避免受控数字输入的光标跳动和 `0.` 中间态问题。
- V1 无名称、无单位字段: 目标场景是同单位速比。单位选择器 (复用最近单位) 是后续增强, 本阶段不做。
- 不写 IndexedDB: 用完即弃是默认行为, 刷新即清空。

**D3 计算 -- 新建 `lib/quick-compare.ts`, 不复用 enrichProducts**

`enrichProducts` 需要 exchangeRates + unitSystem, 快速模式下全是恒等转换, 强行复用读起来全是噪音。新建纯函数模块:

```typescript
interface QuickRowResult {
  unitPrice: number | null;   // 无效输入为 null
  isBest: boolean;            // 有效行 >= 2 时才可能为 true
  pctAboveBest: number | null; // 非最优行相对最优的溢价百分比
}
function compareQuickRows(rows: QuickCompareRow[]): QuickRowResult[];
function formatUnitPrice(value: number): string; // 动态精度: >=1 两位小数, >=0.01 三位, 更小四位
```

- 不用 `formatCurrencyAmount`: 它固定 2 位小数, 会把 ¥0.0398 和 ¥0.0412 抹成同一个数。
- 并列最优: 单价相等的行都标 `isBest`。

**D4 存为清单 -- "偶尔想留"的升级路径**

结果出现后浮现「存为清单」按钮 (默认不可见, 不制造保存压力):

- `createComparisonList` 生成清单: 名称默认「快速对比 M月D日」, 商品自动命名「商品 A/B/C」, unit 统一 `'piece'`, currency 按 locale 默认 (zh -> CNY, en -> USD)
- 保存后 `router.push('/list/[id]')` 进入详情页, 用户可补名称/单位 -- 自然衔接现有工作台
- 备选 (被否): 静默保存 + toast。存了就应该能立刻编辑。

**D5 交互节奏 (借计算器方案的手感)**

- 输入框 `inputmode="decimal"` + `enterkeyhint="next"`, 回车/Next 自动跳下一格, 手不离开数字键盘
- 初始 2 行; 末行两格填满自动追加空行, 上限 6 行 (超出提示转清单)
- 有效行 >= 2 时实时反馈: 最优行高亮 + 「最划算」徽章, 其余行「贵 X%」; 顶部结果横幅显示最优商品与最大差价
- 输入过滤: 仅数字与一个小数点, 最长 10 字符
- 自动聚焦: 桌面端 (hover 介质) 首格 autoFocus; 移动端不自动弹键盘, 避免布局跳动

#### 实施步骤

1. **`lib/quick-compare.ts`** -- 纯函数 + 单元测试 (除零、单行、并列最优、动态精度)
2. **`components/QuickCompare.tsx`** -- hero 组件: 行状态管理、焦点跳转、自动加行、结果横幅、存为清单
3. **`pages/index.tsx` / `pages/en.tsx`** -- hero 插入 main 顶部, 现有内容下移
4. **存为清单接线** -- `createComparisonList` + `saveComparisonList` + 路由跳转
5. **`constants/translations.ts`** -- 新增中英 key (标题、字段标签、徽章、按钮、上限提示)
6. **`public/manifest.json`** -- 添加 `shortcuts`
7. **组件测试** -- 焦点流转、自动加行、结果计算、保存跳转 (Testing Library)

#### 涉及文件

- `lib/quick-compare.ts` -- 新建
- `tests/lib/quick-compare.test.ts` -- 新建
- `components/QuickCompare.tsx` -- 新建
- `tests/components/QuickCompare.test.tsx` -- 新建
- `pages/index.tsx`, `pages/en.tsx` -- 插入 hero
- `constants/translations.ts` -- 新增 key
- `public/manifest.json` -- shortcuts

#### 验收标准

- [x] 打开首页无需任何导航即可开始输入; 两件商品从打开到出结果, 全程只用数字键盘
- [x] 回车自动跳格, 全键盘 (Tab/Enter) 可完成整个流程
- [x] 第二行填完立即出结果; 填满末行自动加行, 到 6 行提示转清单
- [x] 「存为清单」保存后跳转详情页, 单价与快速模式显示一致 (IndexedDB 落库数据核对无误; 详情页固定 2 位小数的既有显示精度差异见附录)
- [x] 中英双语、暗色模式均正常 (Chromium 桌面 + 420px 视口验证; iOS Safari / Android Chrome 真机待验证)
- [x] `npm run test:run` 通过 (12 文件 / 47 测试), `lib/quick-compare.ts` 12 个用例
- [x] 现有清单管理、分享、备份功能不受影响 (首页原有区块完整下移, 既有 39 个测试无回归)

---

### 3.2 快速对比单位 chip

**状态**: 已完成 (2026-10-04, 与 3.3 一起实现; 原型见 `docs/design/quick-compare-unit-chip.html`)

**目标**: 快速对比默认只比「数量」（隐含同单位），无法处理货架上最常见的「小包 500g vs 大包 1kg」跨规格场景。给每行加一个可选的单位选择器，覆盖这个场景，同时不给已经跑通的「两格三跳」输入节奏增加任何强制步骤。

**方向 (原型验证后选定)**: 数量输入框右下角嵌入一个原生 `<select>` 做成的行内 chip，默认值为空字符串（显示「单位」，计算时按计件、rate 1 处理），换算逻辑对齐 `constants/unitSystem.ts` 的 `defaultUnitSystem`。

- 备选方案 (被否): 数量下方新增一条独立的「单位：件 ▾」行。视觉更醒目，但三行商品会多出三行高度，货架前争分夺秒报两个数字时多划一屏——违背「降低输入成本是产品第一原则」，见原型页「备选（已否）」区块。

**设计决策**:

**D1 数据模型** — `QuickCompareRow` 新增 `unit: string`，默认 `''`（未指定）。未指定按计件类目、rate 1 计算，单价显示为「/单位」，因此「两行都没碰过单位」时的计算结果与 3.1 一致。存为清单时写入 `'piece'`。

**D2 换算** — `lib/quick-compare.ts` 引入 `defaultUnitSystem`（只读，不走 IndexedDB/自定义单位；QuickCompare 本就不挂某个具体清单），构建一次性的 `unit -> {category, rate}` 反查表。chip 只列货架常用的单位：克、千克、斤、两、盎司、磅、毫升、升、液体盎司、加仑、个、打、厘米、米。`defaultUnitSystem` 的重量类新增斤（0.5 kg）和两（0.05 kg），清单页和智能解析同时支持。

**D2.1 单价显示单位** — 能互相比较的行使用同一个显示单位，由第一个有效行的单位决定：克和毫升按每 100 克、每 100 毫升显示，其他单位按每 1 个该单位显示（每斤、每千克、每个）。这样单价数字不会小到 ¥0.016 这种难读的程度。

**D3 自动跟随** — 修改一行的单位后，其余仍是未指定单位的行自动跟着换成同一单位；已被手动设置过的行不覆盖。自动追加的新行沿用上一行的单位。这样「500g vs 1kg」只需要设置一次单位类目，第二行手动改成另一个规格即可，不必每行都点一次选择器。

**D4 类目不匹配** — 允许用户选到不同类目（如「克」vs「毫升」），不阻断输入。以第一个有效行的类目为准，跨类目的行不参与「最划算」评选，也不计入差价百分比；结果区加一条 `notice-warning` 提示（复用 `ProductList.tsx` 的 `hasMixedGroups` 提示语气与样式）。

**D5 存为清单** — `handleSaveAsList` 保存时把每行的单位写入 `ProductInput.unit`（未指定写 `'piece'`）。chip 的短标签复用 `lib/comparison-math.ts` 的 `getCompactUnitLabel`（英文为 g、kg 这类缩写）。

**D6 chip 宽度** — 原生 `<select>` 的宽度由最长的选项决定，会盖住输入框中间，手机上点输入框会打开选择列表。chip 只显示选中项的文字，透明的 `<select>` 叠在上面接收点击（`QuickCompare.tsx` 的 `ChipSelect`）。

**D7 旧清单** — 清单在 IndexedDB 里存的是创建时的单位表副本。`resolveUnitMeta` 在清单单位表里查不到时再查 `defaultUnitSystem`，旧清单也能正确换算斤和两。

#### 实施步骤

1. `types/index.ts` — `QuickCompareRow` 加 `unit: string`
2. `constants/unitSystem.ts`、`lib/smart-product-parser.ts`、`constants/translations.ts` — 加斤和两
3. `lib/quick-compare.ts` — 单位反查表；`compareQuickRows` 按 rate 换算后计算单价，按 D2.1 换成显示单位；返回每行的显示单位和是否参与比较；新增单测（同类目跨单位、跨类目不参与评选、未指定单位与 3.1 行为一致）
4. `components/QuickCompare.tsx` — 数量输入框内嵌 `<select>` 单位 chip；单位变更实现 D3 自动跟随；类目不匹配时渲染 `notice-warning`
5. `handleSaveAsList` — 按 D5 写入单位

#### 验收标准

- [x] 两行都不碰单位选择器时，结果与 3.1 一致（回归）
- [x] 大米 5kg装 32.9 元 vs 500g装 4.5 元，正确判定 5kg 装最划算，价差约 37%
- [x] 换一行单位后，其余未指定单位的行自动跟随；已手动设置过的行不被覆盖
- [x] 选到不同类目时不报错、不阻断输入，只显示不参与比较的提示
- [x] 存为清单后，详情页显示的单位与快速对比时一致
- [x] `npm run test:run` 全绿，新增单测覆盖上述场景

---

### 3.3 货架场景提速

**状态**: 已完成 (2026-10-04)

**目标**: 在打开速度上不输给手机计算器，并把计算器算起来麻烦的多件装和促销变成点一下就能算。

**D1 打开不等网络** — `public/sw.js` 对页面和静态资源改为先返回缓存、后台更新缓存；没有缓存时才请求网络，离线时页面请求退回缓存的首页。`/api/` 请求不经过 Service Worker。代价：发布新版本后，用户第二次打开才看到新版本。

**D2 保存输入** — 快速对比的各行写入 localStorage（键 `quickCompareRows`，带保存时间），页面加载完成后恢复。超过 2 小时的记录不恢复，避免第二天打开还看到上次的数字。用 localStorage 是因为 iOS 结束 PWA 进程后 sessionStorage 会被清空。恢复放在 `useEffect` 里，首屏仍用确定性的初始行，避免 hydration mismatch。

**D3 多件装** — 数量框接受一个乘号：`24×500` 按 12000 计算。键盘输入 `*`、`x`、`X`、`×` 都转换成 `×`。手机数字键盘没有乘号，所以数量框右上角放一个「×」按钮，点击后在数字末尾插入乘号，按钮不抢输入框焦点（键盘不收起）。

**D4 促销** — 价格框右上角放一个原生 `<select>` 做成的促销 chip，默认「无促销」，不增加输入步骤。选项及换算（实际支付 ÷ 得到的件数）：第二件半价 1.5÷2、买一送一 1÷2、买二送一 2÷3、买三送一 3÷4，以及 9.5、9、8.8、8.5、8、7.5、7、6、5 折。存为清单时价格写实际支付总额，数量写总件数对应的规格，名称后面标上促销名。

**D5 添加到主屏幕提示** — iPhone 和 iPad 上，不是从主屏幕打开、也不在微信内置浏览器里时，第一次出现对比结果后显示一条提示，告诉用户在分享菜单里选「添加到主屏幕」。点「知道了」后写入 localStorage，不再显示。

#### 验收标准

- [x] 生产构建下，弱网和断网时从主屏幕打开立即显示页面；汇率请求不被缓存（实测所有请求延迟 8 秒时 38 毫秒显示，断网 24 毫秒）
- [x] 填好两行后刷新页面，数字、单位、促销都恢复；超过 2 小时的记录不恢复
- [x] 数量 `24×500`、价格 49.9，与数量 500、价格 2.5 比较，单价分别为每 100 毫升约 0.42 元和 0.50 元
- [x] 第二件半价 9.9 元 500g，与 7.9 元 500g 比较，前者单价更低
- [x] iPhone Safari 第一次出现结果时显示提示，点「知道了」后不再出现；桌面浏览器不显示
- [x] `npm run test:run` 全绿；新增单测覆盖乘号解析、促销换算、过期记录不恢复

---

## 阶段四: 视觉重设计「精密账本 + 小票分享」

**当前状态**: 已完成 (2026-07-07 四阶段多智能体实现 + 终审修正, Playwright 端到端验证通过)

**优先级**: P1

**方向**: 用户从三个候选方向 (电子小票 / 货架价签 / 精密账本, mock 见 `docs/design/redesign-directions.html`) 中选定组合: **C 精密账本做全站底盘 + A 小票美学专用于分享图**。

**设计原则 (全阶段共同遵守)**:
- **框只剩一层**: 页面最多一层容器 (`.panel` 或一体分组框), 容器内部用发丝线 (`--border-subtle`) 和留白组织, `.subpanel` 式的盒中盒逐步废弃
- **状态靠染色不靠描边**: 最优/选中等状态用整行浅染 (`--brand-soft`), 不再加边框
- **数字是排印主角**: 金额/单价/百分比一律用等宽数字字体 (`--font-num`) + `tabular-nums`; 单价用「价格 lockup」排印 — 货币符号小号上标 + 金额大号 + `/单位` 小注
- **点线引导**: 列表行的「名称 → 数字」之间用点线 (dotted leader) 连接, 服务扫读
- **语义色纪律**: 茶青 (`--brand`) 只表达「省/最优」, 暖红 (`--danger`) 表达「贵/更差/危险」, 不再混用
- 双主题: 所有新 token 同步定义暗色等价值, 保持对比度; 小票分享图例外 (固定浅色小票世界)

---

### 4.1 Token 层与基础语法

1. **`styles/globals.css` 色板更新** (light):
   - `--canvas: #f6f4ee`, `--surface: #fdfcf9`, `--text-primary: #21252b`, `--text-secondary: #6e6a5e`
   - `--border: #dcd7ca`, `--border-subtle: #e8e4d8` (及配套 soft/header 变量同步微调)
   - `--brand: #0e7268` (brand-strong 相应加深), `--danger: #c24d3a` (暖化, 同时服务「贵」与破坏性操作)
   - dark 主题: 保持现有暗色骨架, 按同样的暖化思路微调 danger (如 `#e0705c`), 其余对齐新 light 值的明度关系, 保证对比度
   - 阴影整体减淡一档 (现有 shadow 偏重, 账本语法下卡片更少、阴影应更轻)
   - 新增 `--font-num: 'SF Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
2. **新组件 `components/PriceLockup.tsx`**: props 形如 `{ amount: string; symbol: string; per?: string; tone?: 'default' | 'best'; size?: 'sm' | 'md' | 'lg' }` — 渲染 `<sup>符号</sup> 大号金额 <span>/单位</span>`, 等宽 + tabular-nums; `tone='best'` 用 brand 色
3. **工具类** (globals.css): `.dotted-leader` (点线引导, flex 内自伸缩), `.ledger-row` (账本行基础), 供 4.2/4.3 复用
4. **QuickCompare 接入**: 行内单价改用 `PriceLockup` (替换现有手写 span), 「贵 X%」「最划算」徽章样式不变

### 4.2 首页账本化 (`pages/index.tsx`)

1. 统计块: 三个 `subpanel` 盒子 → 一行三组「大数字 + 小标签」, 组间竖向发丝线分隔, 数字用 `--font-num`
2. 清单列表: 卡片网格 → 账本行 — `清单名 ····· n 件 · 更新时间 →`, 行间发丝线, hover 整行浅染; 归档区同语法
3. 新建清单表单与导入导出按钮: 保持功能与位置, 去掉多余的盒中盒层级
4. `pages/en.tsx` 复用 HomePage, 无需单独改动

### 4.3 详情页账本化 (`components/ProductList.tsx` 等)

1. 商品对比结果: 商品卡片 → 一体分组框内的账本行 (同 QuickCompare 语法): 序号/名称 + 规格, 右侧 `PriceLockup` 单价, 最优行整行染色 + 徽章; 保留编辑/删除按钮与 undo 流程
2. `PriceComparisonBars`: 去外框, 条形图保留, 标签数字用 `--font-num`
3. `SavingsCalculator` / `UnitConverter` / `UnitManager` / `AddProductForm`: 去 subpanel 嵌套, 面板内部用发丝线分区; 表单输入框样式保持现状 (描边输入框在"编辑"语境下保留)
4. 功能零回归: 增删改、undo、分享、汇率重试、分组切换全部不变

### 4.4 小票分享图 (A 的味道)

1. 新组件 `components/ReceiptShareCard.tsx`: 离屏渲染的小票 DOM —
   - 头部: `PRICE PILOT` 字标 (等宽、加字距) + 日期编号行 + 虚线分隔
   - 商品列表: `名称 规格 ····· 单价` 点线行, 最优行盖红圈章「最划算」(旋转 -14°, `#c43c2b` 描边圆章)
   - 合计块: 双线分隔 + `商品 X 胜出 / 省 Y%`
   - 底部: 条码装饰条 + 站点名; 上下缘锯齿撕票边
   - 固定浅色小票配色 (`#fbfaf5` 纸 / `#26241e` 墨 / `#c43c2b` 章), 不随主题切换; 文案走翻译字典
2. `hooks/useShareImage.ts`: html2canvas 的渲染目标从截取页面结果区改为该离屏小票节点; 预览 modal 与下载流程不变
3. 分享图在中英文下都正确渲染

**涉及文件**: `styles/globals.css`, `components/PriceLockup.tsx` (新), `components/QuickCompare.tsx`, `pages/index.tsx`, `components/ProductList.tsx`, `components/PriceComparisonBars.tsx`, `components/SavingsCalculator.tsx`, `components/ToolPanel.tsx`, `components/ReceiptShareCard.tsx` (新), `hooks/useShareImage.ts`, `constants/translations.ts`

**验收标准**:
- [x] 双主题下所有页面无可读性/对比度问题 (Playwright 截图审查, light/dark × 首页/详情页/分享 modal)
- [x] 全站金额/单价/百分比使用等宽数字与 lockup 排印 (终审补充: 详情页与条形图单价由固定 2 位小数改为 `formatUnitPrice` 动态精度, 修复三件商品同显 ¥0.04 的矛盾)
- [x] 首页与详情页不再存在盒中盒嵌套 (终审补齐首页底部场景/FAQ 区的 subpanel → 发丝线分隔)
- [x] 分享图输出为小票样式, 中英文均正确 (透明锯齿撕边在暗色 modal 下成立)
- [x] `npm run test:run` 全绿 (12 文件 / 47 测试), 功能零回归

**实现记录**: 4 个 Opus agent 按 4.1→4.4 串行实施, 每个自带 Playwright 双主题截图自查; 终审 (主会话) 补充 3 处修正 — 单价动态精度、SEO 区去盒、快速对比横幅改 brand-soft band。附带行为收敛: 首页清单行不再展示最优摘要, `buildSummaries` 逐清单拉汇率的逻辑随之移除 (首页零汇率请求)。

---

## 阶段五: 全权委托打磨 (2026-07-13)

**当前状态**: 已完成 (2026-07-13, 主会话直接实施, Playwright 端到端验证 + 生产构建离线实测通过)

**完成说明**:
- 5.1 全部落地: 汇率去重根治 (带 signal 直连, dev 首载超时不再复现, 新增 `tests/lib/currencies.test.ts` 回归锁定) · setItem 隔离 · `deleteItem` key
- 5.2 全部落地: `public/og.png` (小票视觉) + 三处页面 og:image/twitter:card · `_document` 按路由输出 lang (`/`=zh-CN, `/en`=en-US, curl 验证) · sitemap 去 lastmod
- 5.3 全部落地: sw.js bump v3 + APP_SHELL 补 `/en`, `_app` 生产注册/dev 注销; 生产构建断网实测首页与 /en 均可离线打开
- 5.4 全部落地: 4 处 html2canvas 还原缺陷修复 — 虚线/点线改真实元素与 dotted 边框、CSS ellipsis 改 JS 截断 (`truncateReceiptName`, 有测试)、红章改原生 canvas 预绘位图 (`renderStampImage`); 中英双主题下导出 PNG 逐版目检定稿
- 5.5 全部落地: skip-to-content · 三个 modal focus trap + Escape (`useModalFocusTrap`) · ToolPanel `aria-expanded/controls` · 条形图轨道 aria-hidden · 修复嵌套 `<main>` 无效 HTML
- 计划外收获: 修复 QuickCompare 初始行随机 id 导致的 hydration mismatch (每次首屏必现); 删除 116 行手写 `AppToaster` (重造 react-hot-toast `<Toaster>` 且有 MutationObserver 泄漏), 换回库组件
- 备注: `npm run lint` 发现从未配置 ESLint (触发交互式初始化), 已在 CLAUDE.md 标注; 后续可选补 eslint-config-next

**背景**: 用户全权委托, 按主会话判断把项目完善优化到极致。范围 = 已知 bug 清偿 + SEO 元数据 + PWA 离线 (原 2.3 的轻量版) + 分享图渲染微调 + UI/UX 打磨。

### 5.1 Bug 清偿

- **汇率去重 bug (附录已知坑根治)**: `constants/currencies.ts` 的 requestKey 不区分 AbortSignal, StrictMode 双挂载下第二次挂载复用已被 abort 的 promise → 报「汇率请求超时」。修法: 带 signal 的调用直连 API 不进去重池 (共享会让中止连坐, 本就不该共享), 去重只服务无 signal 调用; 补「并发 abort 互不影响」测试
- **iOS 隐私模式误报**: `ProductList.tsx` 成功路径的 `localStorage.setItem` 落在外层 catch 内, 写缓存失败会把成功的拉取误报为错误 → setItem 单独 try/catch
- **aria-label 硬编码**: `ProductList.tsx` 删除按钮 `locale === 'zh' ? ...` → 新增 `deleteItem` key 走 `t()`

### 5.2 SEO / 元数据

- `public/og.png` (1200×630, 小票视觉, Playwright 截图生成) + 首页/en/详情页 `og:image` + `twitter:card` 升级 `summary_large_image`
- `_document.tsx` 经 getInitialProps 按路由输出 lang (`/en` → `en-US`), 修复英文页静态输出首帧 lang 错误
- sitemap 去掉恒为当前时间的假 `lastmod`

### 5.3 PWA 离线 (替代原 2.3 的 Serwist 方案)

- 不引新依赖: 复用手写 `public/sw.js` (network-first + cache fallback 本就可用), 缓存版本 bump, APP_SHELL 补 `/en`
- `_app.tsx` 注销逻辑 → 生产环境 `serviceWorker.register('/sw.js')` (dev 不注册, 避免缓存干扰开发)
- 汇率离线依赖既有 localStorage 缓存降级, SW 不缓存 `/api/`
- 验收: 访问过的页面断网可重开; 新部署 skipWaiting 接管, 不出现陈旧内容锁死

### 5.4 分享图渲染微调

- Playwright 实测生成小票图, 对照 DOM 逐项修 html2canvas 还原偏差 (撕边/红章/点线/字距)

### 5.5 UI/UX 打磨

- a11y 附录项清偿: 分享 modal focus trap、可折叠面板 `aria-expanded`、skip-to-content、条形图文本替代
- 双主题 × 双语 × 移动/桌面截图全面审查, 逐项修视觉粗糙点

**验收标准**: `test:run` 全绿 + `build` 零错误 + Playwright 端到端验证 + 文档同步 (CLAUDE.md「离线可用」声明与代码一致)

---

## 附录: 其他待改进项 (后续迭代)

以下不在短期/中期计划内, 但值得记录:

| 类别 | 项目 | 说明 |
|------|------|------|
| ~~a11y~~ | ~~skip-to-content 链接~~ | 已完成 (2026-07-13 阶段五): `SkipLink` + `#main-content`; 同时修复 `_app` 与页面嵌套 `<main>` 的无效 HTML |
| ~~a11y~~ | ~~Modal 焦点捕获~~ | 已完成 (2026-07-13 阶段五): `useModalFocusTrap` 覆盖分享图/分享链接/导入策略三个 modal, 含 Escape 关闭与焦点归还 |
| ~~a11y~~ | ~~`aria-expanded`~~ | 已完成 (2026-07-13 阶段五): ToolPanel 两个切换按钮 `aria-expanded` + `aria-controls` |
| ~~a11y~~ | ~~对比柱状图文本替代~~ | 已完成 (2026-07-13 阶段五): 名称/单价本为可见文本, 装饰性轨道条标 `aria-hidden` |
| **工程** | PostCSS autoprefixer | `postcss.config.mjs` 添加 autoprefixer 插件 |
| **工程** | 组件级 Error Boundary | 为 ProductList、UnitManager 等添加独立错误边界 |
| ~~Bug~~ | ~~dev 下详情页首载必报「汇率请求超时」~~ | 已修复 (2026-07-13 阶段五): 带 AbortSignal 的调用不再进 in-flight 去重池 (`constants/currencies.ts`), 附并发 abort 回归测试; Playwright 实测 dev 首载不再报错 |
| ~~Bug~~ | ~~详情页单价 < ¥0.01 时不同商品显示相同~~ | 已修复 (2026-07-07 阶段四终审): `ProductList` 与 `PriceComparisonBars` 的单价显示改用 `formatUnitPrice` 动态精度; `formatCurrencyAmount` 仍用于金额合计 (省钱计算器等), 语义正确 |
| **工程** | `React.lazy` / `Suspense` | UnitConverter, UnitManager, SavingsCalculator 懒加载 |
| **工程** | 错误监控 | 接入 Sentry 等外部错误上报服务 |
| **工程** | E2E 测试 | Playwright 关键用户路径测试 |
| **UX** | 搜索/筛选 | 首页列表搜索和分类筛选 |
| **UX** | 批量操作 | 批量删除、归档、移动产品 |
| **UX** | 表单字段级错误 | 替代 toast 的 inline 字段错误提示 |
| **UX** | 空态引导 | 首页空状态的新手引导 |
| **功能** | 条码扫描 | 移动端条码/价签识别快速录入 |
| **功能** | 账户系统 + 云同步 | Supabase 后端, 跨设备数据同步 |
| **功能** | 多人协作列表 | 实时协作, 需要后端 WebSocket 支持 |
| **功能** | 浏览器扩展 | 电商网站价格抓取 |
| **功能** | 多语言扩展 | 日语、韩语、东南亚语言 |

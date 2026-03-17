# Price Pilot 开发计划

> 最后更新: 2026-03-17
> 版本: 0.1.0 -> 目标 1.0.0

---

## 项目现状摘要

| 指标 | 当前值 |
|------|--------|
| 源代码行数 | ~5,000+ 行 TS/TSX |
| 组件数 | 12 个 |
| 页面数 | 3 个路由 (首页 + 列表详情 + 汇率 API) |
| 测试覆盖率 | 已接入 Vitest, 整体 81.46%, 核心 `lib/` 模块 86.91% |
| 类型系统 | 已完成 TypeScript 迁移 (`strict: true`) |
| 路由方案 | Pages Router (Next.js 15) |
| 状态管理 | useState + prop drilling + 1 个 Context |
| 数据持久化 | IndexedDB (主) + localStorage (缓存/偏好) |
| 主题 | 已支持 light / dark / system 三态 |
| PWA | manifest 存在但 Service Worker 被主动注销 |
| 外部依赖 | 6 个生产依赖 + TypeScript / Vitest 开发工具链 |

---

## 阶段一: 短期目标 (1-2 周)

**当前状态**: 已完成

**完成说明**:
- 已完成 1.1 TypeScript 迁移与 `@/` 别名统一
- 已完成 1.2 核心 `lib/` 单元测试与 coverage 校验
- 已完成 1.3 暗色模式、系统跟随与手动切换
- 已完成 1.4 JSON 数据导出 / 导入与冲突处理
- 已完成 1.5 汇率 API 服务端代理、缓存与客户端去重

### 1.1 TypeScript 迁移 [已完成]

**状态**: 已完成

**目标**: 全量迁移为 TypeScript, 为所有数据模型建立类型定义, 消除隐式 any

**优先级**: P0 -- 所有后续开发的基础

**当前问题**:
- 纯 JS 无类型无 PropTypes, 数据模型全靠注释和约定
- 随着代码增长 (已 2800+ 行), 重构和协作风险极高
- `jsconfig.json` 中定义的 `@/*` 路径别名从未使用, 应在迁移中统一启用

**实施步骤**:

1. **安装依赖和配置**
   ```bash
   npm install -D typescript @types/react @types/node
   ```
   - 将 `jsconfig.json` 替换为 `tsconfig.json`
   - 配置 `strict: true`, `noUncheckedIndexedAccess: true`
   - 启用 `@/*` 路径别名并在全量替换相对路径导入

2. **定义核心类型** -- 新建 `types/index.ts`
   ```typescript
   // 产品
   interface Product {
     id: string;
     name: string;
     price: number;
     quantity: number;
     unit: string;
     currency: string;
     timestamp: string;
   }

   // 富化产品 (计算后)
   interface EnrichedProduct extends Product {
     convertedPrice: number;
     unitPrice: number;
     standardQuantity: number;
     unitType: string;
     baseUnit: string;
     originalIndex: number;
   }

   // 产品分组
   interface ProductGroup {
     unitType: string;
     baseUnit: string;
     products: EnrichedProduct[];
   }

   // 单位转换配置
   interface UnitConversion {
     rate: number;
     displayName: string;
   }

   interface UnitCategory {
     baseUnit: string;
     displayName: string;
     conversions: Record<string, UnitConversion>;
   }

   type UnitSystem = Record<string, UnitCategory>;

   // 比较清单
   interface ComparisonList {
     id: string;
     name: string;
     category: string;
     products: Product[];
     baseCurrency: string;
     unitSystem: UnitSystem;
     recentUnits: string[];
     archived: boolean;
     createdAt: string;
     updatedAt: string;
   }

   // 分享数据 (序列化用, 剥离运行时字段)
   type SharedComparisonList = Omit<ComparisonList, 'id' | 'archived' | 'createdAt' | 'updatedAt'>;

   // 汇率映射
   type ExchangeRates = Record<string, number>;

   // 语言
   type Locale = 'zh' | 'en';
   ```

3. **按依赖顺序迁移文件** (先底层后上层):
   - 第 1 批: `types/index.ts`, `constants/unitSystem.ts`, `constants/currencies.ts`, `constants/translations.ts`
   - 第 2 批: `lib/comparison-math.ts`, `lib/comparison-lists.ts`, `lib/share-utils.ts`, `lib/smart-product-parser.ts`
   - 第 3 批: `context/LanguageContext.tsx`
   - 第 4 批: 小组件 -- `ErrorBoundary.tsx`, `PageHeader.tsx`, `LanguageToggle.tsx`, `CurrencySelector.tsx`, `PriceComparisonBars.tsx`
   - 第 5 批: 中组件 -- `SavingsCalculator.tsx`, `UnitConverter.tsx`, `UnitManager.tsx`, `AddProductForm.tsx`, `ProductEditorForm.tsx`
   - 第 6 批: 大组件 -- `ProductList.tsx`, `ListWorkspace.tsx`
   - 第 7 批: 页面 -- `pages/_app.tsx`, `pages/_document.tsx`, `pages/index.tsx`, `pages/list/[id].tsx`

4. **统一导入路径** -- 全量替换相对路径为 `@/` 别名:
   ```typescript
   // Before
   import { useLanguage } from '../context/LanguageContext';
   // After
   import { useLanguage } from '@/context/LanguageContext';
   ```

**验收标准**:
- [x] `npm run build` 零 TypeScript 错误
- [x] `strict: true` 模式下无 `any` 类型泄漏 (允许显式 `unknown`)
- [x] 所有 `lib/` 函数的入参和返回值都有明确类型
- [x] 所有组件 Props 都有 interface 定义
- [x] 所有导入使用 `@/` 路径别名

---

### 1.2 核心逻辑单元测试 [已完成]

**状态**: 已完成

**目标**: 为 `lib/` 下 4 个工具模块建立测试, 覆盖关键计算路径

**优先级**: P0 -- 后续重构的安全网

**当前问题**:
- 零测试覆盖, 核心计算逻辑 (汇率转换、单价计算、智能解析) 无回归保护
- 无测试框架配置

**实施步骤**:

1. **安装 Vitest + Testing Library**
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
   ```
   在 `package.json` 中添加:
   ```json
   {
     "scripts": {
       "test": "vitest",
       "test:run": "vitest run",
       "test:coverage": "vitest run --coverage"
     }
   }
   ```
   创建 `vitest.config.ts`:
   ```typescript
   import { defineConfig } from 'vitest/config';
   import path from 'path';

   export default defineConfig({
     test: {
       environment: 'jsdom',
       globals: true,
       setupFiles: ['./tests/setup.ts'],
     },
     resolve: {
       alias: { '@': path.resolve(__dirname, '.') },
     },
   });
   ```

2. **测试 `lib/comparison-math.ts`** -- `tests/lib/comparison-math.test.ts`
   - `enrichProducts()`:
     - 同币种、同单位类型的基本转换
     - 跨币种转换 (CNY -> USD)
     - 跨单位转换 (g -> kg, ml -> l)
     - 缺失汇率时的容错 (rate 默认为 1)
     - quantity 或 price 为 0 时的除零保护
     - 未知单位的降级处理
   - `groupProductsByUnitType()`:
     - 单类型分组: 权重类产品正确分到一组, 组内按 unitPrice 升序
     - 多类型分组: weight + volume 分为两组
     - 空输入返回空数组
   - `formatCurrencyAmount()`:
     - 各币种格式正确 (CNY: ¥1,234.56, USD: $1,234.56, JPY: ¥1,235)
     - zh-CN 和 en-US locale 输出差异
   - `formatProductQuantityLabel()`:
     - 中文 locale 输出 "500毫升"
     - 英文 locale 输出 "500 mL"

3. **测试 `lib/smart-product-parser.ts`** -- `tests/lib/smart-product-parser.test.ts`
   - 中文输入: `"可乐 500ml 3.5元"` -> `{ name: "可乐", price: 3.5, quantity: 500, unit: "ml", currency: "CNY" }`
   - 英文输入: `"Cola 500ml $3.5"` -> `{ name: "Cola", price: 3.5, quantity: 500, unit: "ml", currency: "USD" }`
   - 口语价格: `"牛奶 1L 3块5"` -> price: 3.5
   - 只有价格: `"$9.99"` -> `{ price: 9.99, currency: "USD" }`
   - 无法解析: `"hello"` -> 返回 null 或部分填充
   - 多币种符号: `"€12.5"`, `"£8"`, `"¥100"` 正确识别
   - 多单位: `"2kg"`, `"500g"`, `"1.5L"`, `"3个"` 正确提取

4. **测试 `lib/share-utils.ts`** -- `tests/lib/share-utils.test.ts`
   - 编码后解码恢复原始数据 (round-trip)
   - 包含中文字符的列表名正确编码
   - 包含特殊字符 (引号、换行) 的产品名处理
   - 解码损坏的 Base64 字符串时不崩溃

5. **测试 `lib/comparison-lists.ts`** -- `tests/lib/comparison-lists.test.ts`
   - `normalizeProduct()`: 缺失 id/timestamp 时自动补全
   - `normalizeComparisonList()`: 缺失字段的默认值填充
   - `buildEntityId()`: 返回值格式正确
   - `safeParseLocalStorage()`: 损坏 JSON 不崩溃, 返回 fallback
   - IndexedDB CRUD: 需要 `fake-indexeddb` mock

**验收标准**:
- [x] `npm run test:run` 全部通过
- [x] `lib/` 下 4 个模块各有独立测试文件
- [x] 核心函数 (`enrichProducts`, `parseSmartProductInput`, `encode/decode`) 测试覆盖率 > 90%
- [x] CI 可运行 (无浏览器依赖)

---

### 1.3 暗色模式 [已完成]

**状态**: 已完成

**目标**: 实现系统跟随 + 手动切换的暗色模式, 复用现有 CSS Variables 体系

**优先级**: P0 -- 低成本高感知价值

**当前问题**:
- `globals.css` 已有完整的 CSS Variables 体系, 但只定义了浅色主题
- `html` 硬编码 `color-scheme: light`
- 无主题切换 UI

**实施步骤**:

1. **定义暗色变量集** -- 在 `globals.css` 中添加:
   ```css
   :root[data-theme="dark"] {
     --canvas: #0f1117;
     --surface: #1a1d27;
     --surface-muted: #252833;
     --text-primary: #e8eaed;
     --text-secondary: #9ba3b0;
     --border: #2e3340;
     --brand: #2dd4bf;
     --brand-strong: #5eead4;
     --success: #34d399;
     --warning: #fbbf24;
     --danger: #f87171;
     --focus-ring: rgba(45, 212, 191, 0.3);
     --shadow-sm: 0 12px 24px -22px rgba(0, 0, 0, 0.5);
     --shadow-base: 0 18px 40px -28px rgba(0, 0, 0, 0.6);
     --shadow-lg: 0 24px 52px -34px rgba(0, 0, 0, 0.7);
     color-scheme: dark;
   }
   ```
   - 同时更新 `body` 背景渐变的品牌色透明度以适配暗色
   - 检查所有组件中硬编码的颜色值 (如 `bg-white`, `text-gray-*`), 替换为语义化 token

2. **创建 ThemeContext** -- `context/ThemeContext.tsx`
   ```typescript
   type Theme = 'light' | 'dark' | 'system';
   ```
   - 默认 `'system'`, 读取 `localStorage.theme` 恢复用户选择
   - 监听 `window.matchMedia('(prefers-color-scheme: dark)')` 变化
   - 在 `<html>` 上设置 `data-theme` 属性
   - 提供 `theme`, `resolvedTheme`, `setTheme()` 给消费者

3. **防止闪烁** -- 在 `_document.tsx` 的 `<Head>` 中注入内联脚本:
   ```html
   <script dangerouslySetInnerHTML={{ __html: `
     (function() {
       var t = localStorage.getItem('theme');
       var d = document.documentElement;
       if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme:dark)').matches)) {
         d.setAttribute('data-theme', 'dark');
       }
     })();
   ` }} />
   ```

4. **主题切换 UI** -- 修改 `PageHeader.tsx`
   - 在语言切换按钮旁添加主题切换图标按钮
   - 三态循环: system -> light -> dark -> system
   - 使用 `Sun` / `Moon` / `Monitor` 图标 (lucide-react 已有)

5. **审查所有组件** -- 排查硬编码颜色:
   - 搜索 `bg-white`, `bg-gray-`, `text-gray-`, `border-gray-`, `bg-slate-` 等 Tailwind 类名
   - 替换为 `bg-surface`, `text-foreground`, `text-muted`, `border-theme` 等语义化类名
   - 检查 `globals.css` 中的组件类, 确保全部使用 `var(--*)` 而非硬编码色值
   - 更新 `manifest.json` 的 `theme_color` 为动态值 (通过 meta tag)

6. **更新 `_app.tsx` 的 Toaster 样式** -- 已使用 CSS Variables, 无需修改

**涉及文件**:
- `styles/globals.css` -- 添加暗色变量集, 审查硬编码色值
- `context/ThemeContext.tsx` -- 新建
- `pages/_document.tsx` -- 注入防闪烁脚本
- `pages/_app.tsx` -- 包裹 ThemeProvider
- `components/PageHeader.tsx` -- 添加切换按钮
- 所有使用硬编码 Tailwind 颜色类的组件文件
- `public/manifest.json` -- 审查 `theme_color`

**验收标准**:
- [x] 首次加载根据系统偏好自动选择主题, 无闪烁 (FOUC)
- [x] 手动切换后刷新页面保持选择
- [x] 所有组件在暗色下无可读性问题 (文字/背景对比度)
- [x] toast / modal / skeleton 等 overlay 元素暗色适配
- [x] `prefers-color-scheme` 变化时自动跟随 (system 模式下)
- [x] bar chart 颜色 (best/mid/worst) 暗色下依然清晰可辨

---

### 1.4 数据备份与恢复 (JSON 导出/导入) [已完成]

**状态**: 已完成

**目标**: 允许用户将所有数据导出为 JSON 文件, 以及从 JSON 文件恢复数据

**优先级**: P0 -- 用户数据仅存浏览器, 这是最大的用户焦虑点

**当前问题**:
- 数据完全存在 IndexedDB, 清除浏览器数据即丢失一切
- 已有 `share-utils.ts` 的 Base64 编码方案, 但仅限单个列表分享, 不支持全量备份
- 无法跨浏览器 / 跨设备迁移数据

**实施步骤**:

1. **导出功能** -- `lib/data-backup.ts`
   ```typescript
   interface BackupData {
     version: 1;
     exportedAt: string;        // ISO 8601
     app: 'price-pilot';
     lists: ComparisonList[];
   }

   async function exportAllData(): Promise<BackupData> {
     const lists = await getAllComparisonLists();
     return {
       version: 1,
       app: 'price-pilot',
       exportedAt: new Date().toISOString(),
       lists,
     };
   }

   function downloadAsJson(data: BackupData): void {
     const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `price-pilot-backup-${new Date().toISOString().slice(0, 10)}.json`;
     a.click();
     URL.revokeObjectURL(url);
   }
   ```

2. **导入功能** -- `lib/data-backup.ts`
   ```typescript
   interface ImportResult {
     imported: number;
     skipped: number;
     errors: string[];
   }

   async function importFromJson(file: File): Promise<ImportResult> {
     const text = await file.text();
     const data = JSON.parse(text);
     // 1. 验证 data.app === 'price-pilot'
     // 2. 验证 data.version 支持的版本
     // 3. 验证 data.lists 是数组
     // 4. 逐条 normalizeComparisonList + saveComparisonList
     // 5. 返回导入统计
   }
   ```

3. **导入策略选择 UI** -- 导入时需让用户选择冲突处理策略:
   - **合并** (默认): 已存在的列表跳过, 只导入新列表 (按 id 判重)
   - **覆盖**: 已存在的列表用导入数据覆盖
   - **全部导入**: 为冲突列表生成新 id, 全部保留

4. **UI 入口** -- 在首页 (`pages/index.tsx`) 添加:
   - 顶部操作栏增加"导出数据"按钮 (`Download` 图标)
   - "导入数据"按钮 (`Upload` 图标), 点击触发隐藏的 `<input type="file" accept=".json">`
   - 导入完成后 toast 提示统计信息, 刷新列表

5. **数据校验** -- `lib/data-backup.ts`
   - 使用版本号 `version: 1` 进行前向兼容
   - 校验每个 list 必须有 `products` 数组
   - 校验每个 product 必须有 `price`, `quantity`, `unit` 字段
   - 无效数据跳过并记录到 `errors` 数组

**涉及文件**:
- `lib/data-backup.ts` -- 新建
- `pages/index.tsx` -- 添加导出/导入按钮和交互逻辑
- `constants/translations.ts` -- 添加导出/导入相关翻译 key

**验收标准**:
- [x] 点击"导出"立即下载包含所有列表的 JSON 文件
- [x] JSON 文件格式清晰, 人类可读 (缩进格式化)
- [x] 导入 JSON 文件后数据正确恢复
- [x] 导入损坏/非法 JSON 时不崩溃, 显示友好错误提示
- [x] 导入时正确处理 id 冲突
- [x] 空数据库导出的 JSON 可以导入到另一个浏览器并恢复一致
- [x] 有对应的单元测试覆盖 export/import 逻辑

---

### 1.5 API Key 安全代理 [已完成]

**状态**: 已完成

**目标**: 将汇率 API 调用从客户端移至 Next.js API Route, 避免 API Key 暴露

**优先级**: P0 -- 安全隐患

**当前问题**:
- `NEXT_PUBLIC_EXCHANGE_RATE_API_KEY` 使用 `NEXT_PUBLIC_` 前缀, 直接暴露在浏览器 bundle 中
- `constants/currencies.js` 在客户端直接调用 `https://v6.exchangerate-api.com/v6/{key}/latest/{base}`
- 任何人打开 DevTools 即可提取 key 并滥用
- 首页 `buildSummaries` 为每个列表独立 fetch 汇率, 无去重

**实施步骤**:

1. **创建 API Route** -- `pages/api/exchange-rates.ts`
   ```typescript
   // GET /api/exchange-rates?base=CNY
   export default async function handler(req, res) {
     const { base } = req.query;
     // 1. 验证 base 是支持的币种
     // 2. 检查服务端内存缓存 (同一 base 10分钟内不重复请求)
     // 3. 用服务端环境变量 EXCHANGE_RATE_API_KEY (无 NEXT_PUBLIC_ 前缀) 调用 API
     // 4. 缓存结果
     // 5. 返回 { rates: Record<string, number>, cachedAt: string }
   }
   ```

2. **服务端缓存层** -- 内存缓存 (Map):
   ```typescript
   const cache = new Map<string, { rates: ExchangeRates; cachedAt: number }>();
   const CACHE_TTL = 10 * 60 * 1000; // 10 分钟
   ```
   - 同一 `baseCurrency` 在 TTL 内直接返回缓存
   - 消除客户端重复请求问题 (多个列表 -> 一次后端请求)

3. **修改环境变量**:
   - `.env.local`: 将 `NEXT_PUBLIC_EXCHANGE_RATE_API_KEY` 重命名为 `EXCHANGE_RATE_API_KEY`
   - `.env.example`: 同步更新
   - API Route 中使用 `process.env.EXCHANGE_RATE_API_KEY`

4. **修改客户端调用** -- `constants/currencies.ts`:
   ```typescript
   export async function fetchExchangeRates(baseCurrency = 'CNY', options = {}) {
     const response = await fetch(`/api/exchange-rates?base=${baseCurrency}`, options);
     if (!response.ok) throw new Error(`Exchange rate request failed: ${response.status}`);
     const data = await response.json();
     return data.rates;
   }
   ```
   - 删除 `NEXT_PUBLIC_EXCHANGE_RATE_API_KEY` 引用
   - 客户端不再直接调用外部 API

5. **客户端请求去重** -- 在 `constants/currencies.ts` 中添加:
   ```typescript
   const inflight = new Map<string, Promise<ExchangeRates>>();

   export async function fetchExchangeRates(baseCurrency = 'CNY', options = {}) {
     const key = baseCurrency;
     if (inflight.has(key)) return inflight.get(key)!;
     const promise = fetchFromApi(baseCurrency, options).finally(() => inflight.delete(key));
     inflight.set(key, promise);
     return promise;
   }
   ```
   解决首页多个列表同时请求同一币种的问题。

**涉及文件**:
- `pages/api/exchange-rates.ts` -- 新建
- `constants/currencies.ts` -- 修改 `fetchExchangeRates` 改调内部 API, 添加去重
- `.env.local` -- 重命名变量
- `.env.example` -- 同步更新

**验收标准**:
- [x] 浏览器 bundle 中不再包含 API Key (搜索 build 产物确认)
- [x] `process.env.EXCHANGE_RATE_API_KEY` 仅在服务端可用
- [x] `/api/exchange-rates?base=CNY` 正确返回汇率数据
- [x] 10 分钟内同一 base 的重复请求命中服务端缓存
- [x] 客户端同时发起多个相同 base 的请求只触发一次网络请求
- [x] 客户端的 localStorage 缓存 fallback 机制继续正常工作
- [x] 无效 base 参数返回 400 错误

---

## 阶段二: 中期目标 (1-2 月)

**当前状态**: 进行中

**完成说明**:
- 已完成 2.1 `ListWorkspace` 组件拆分、Hook 抽离与测试补充
- 2.2 App Router 迁移待开始
- 2.3 PWA 离线支持待开始
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

**目标**: 恢复 Service Worker 功能, 实现完整的离线体验

**优先级**: P1 -- 超市等信号差场景的刚需

**当前问题**:
- `public/sw.js` 存在 55 行完整的 SW 代码 (network-first + cache fallback)
- `_app.js` (迁移后为 `layout.tsx`) 中主动注销所有 SW 并清除缓存
- PWA manifest 已配置, "添加到主屏幕" 可用, 但无离线能力
- SW 注册/注销代码是死代码

**实施步骤**:

1. **采用 next-pwa 或 Serwist** -- 推荐 [Serwist](https://serwist.pages.dev/) (next-pwa 的活跃维护 fork):
   ```bash
   npm install -D @serwist/next
   npm install @serwist/sw
   ```

2. **配置 Serwist** -- 更新 `next.config.mjs`:
   ```typescript
   import withSerwist from '@serwist/next';

   export default withSerwist({
     swSrc: 'app/sw.ts',           // SW 源文件
     swDest: 'public/sw.js',       // 构建输出
     cacheOnNavigation: true,
     reloadOnOnline: true,
   })({
     reactStrictMode: true,
   });
   ```

3. **编写 Service Worker** -- `app/sw.ts`:
   ```typescript
   import { defaultCache } from '@serwist/next/worker';
   import { Serwist } from 'serwist';

   const serwist = new Serwist({
     precacheEntries: self.__SW_MANIFEST,
     skipWaiting: true,
     clientsClaim: true,
     navigationPreload: true,
     runtimeCaching: defaultCache,
   });

   serwist.addEventListeners();
   ```

4. **删除旧代码**:
   - 删除 `public/sw.js` (现在由 Serwist 构建时自动生成)
   - 删除 `_app.js` / `layout.tsx` 中的 SW 注销和缓存清除代码

5. **注册 SW** -- 在 `layout.tsx` 或 Providers 中:
   ```typescript
   useEffect(() => {
     if ('serviceWorker' in navigator) {
       navigator.serviceWorker.register('/sw.js');
     }
   }, []);
   ```

6. **离线 fallback 页面** -- `app/offline/page.tsx`:
   - 简洁的离线提示页
   - 说明"数据已保存在本地, 恢复网络后可同步汇率"
   - 提供"查看已保存列表"的入口

7. **缓存策略配置**:
   | 资源类型 | 策略 | 说明 |
   |----------|------|------|
   | 页面 HTML | NetworkFirst | 优先最新, 离线时用缓存 |
   | JS/CSS/字体 | CacheFirst | 静态资源优先缓存 |
   | 汇率 API | NetworkFirst + cache | 离线时用上次缓存的汇率 |
   | 图标/SVG | CacheFirst | 永久缓存 |

**验收标准**:
- [x] 安装 PWA 后, 关闭网络仍可打开应用
- [x] 离线时可查看和编辑已有列表
- [x] 离线时汇率使用缓存数据, 显示"离线模式"提示
- [x] 恢复网络后自动刷新汇率
- [x] 新版本发布后自动更新 SW (skipWaiting + clientsClaim)
- [x] Lighthouse PWA 评分 > 90

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

## 附录: 其他待改进项 (后续迭代)

以下不在短期/中期计划内, 但值得记录:

| 类别 | 项目 | 说明 |
|------|------|------|
| **a11y** | skip-to-content 链接 | 添加跳转到主内容区的快捷链接 |
| **a11y** | Modal 焦点捕获 | 分享 modal 等对话框需要 focus trap |
| **a11y** | `aria-expanded` | 可折叠面板 (UnitManager, UnitConverter) 添加展开状态标记 |
| **a11y** | 对比柱状图文本替代 | PriceComparisonBars 添加 `aria-label` |
| **工程** | PostCSS autoprefixer | `postcss.config.mjs` 添加 autoprefixer 插件 |
| **工程** | 组件级 Error Boundary | 为 ProductList、UnitManager 等添加独立错误边界 |
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

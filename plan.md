# Price Pilot 改进计划

> 基于对项目的深入代码审计和用户体验分析,按优先级排列。
> 最后更新: 2026-03-17

---

## 目录

- [现状评估](#现状评估)
- [第一阶段: 工程底线修复](#第一阶段-工程底线修复)
- [第二阶段: 核心体验提升](#第二阶段-核心体验提升)
- [第三阶段: 差异化功能](#第三阶段-差异化功能)
- [技术演进路线](#技术演进路线)
- [附录: 完整问题清单](#附录-完整问题清单)

---

## 现状评估

### 项目概况

- **定位**: 单价对比工具,帮助用户在购物时快速比较不同商品的单位价格
- **技术栈**: Next.js 15 (Pages Router) + React 19 + Tailwind CSS
- **规模**: ~1,300 行 JS, 16 个源文件, 7 个组件
- **特性**: 多币种汇率转换、中英双语、双主题 (Neobrutalism / Modern Fintech)

### 核心优势

- 痛点真实 — 超市购物比价是高频需求
- 代码简洁可读,文件组织清晰
- 双主题系统通过 CSS 变量实现,设计感强
- i18n 覆盖完整,中英对称

### 核心差距

1. **使用门槛高** — 手动输入步骤多,超市场景下用户没耐心
2. **缺乏场景记忆** — 用完即弃,无法保存和回顾
3. **缺乏决策深度** — 只告诉哪个便宜,不告诉能省多少钱
4. **工程基础有隐患** — 状态 mutation、API 密钥泄露、无错误边界

---

## 第一阶段: 工程底线修复

> 目标: 让现有功能稳定可靠,不修这些后续功能都建在沙子上。
> 预计工时: 1-2 天

### 1.1 API 密钥安全 [致命]

- **文件**: `constants/currencies.js:29`
- **问题**: 汇率 API 密钥 `a6463d646a0ef912f23ef813` 硬编码在源码中,`.env.local` 的占位符从未被使用
- **修复**:
  - 改用 `process.env.NEXT_PUBLIC_EXCHANGE_RATE_API_KEY` 读取密钥
  - 在 `.env.local` 中配置真实密钥
  - 添加 `.env.example` 文件说明需要配置的环境变量
  - 考虑将 API 调用移到 Next.js API Route 中,彻底隐藏密钥

### 1.2 UnitManager 浅拷贝 Mutation [致命]

- **文件**: `components/UnitManager.js:27-28, 42-43`
- **问题**: `{ ...unitSystem }` 只拷贝顶层,嵌套对象仍是同一引用,添加/删除单位时直接 mutate 原始 prop
- **修复**:
  ```js
  // 方案 A: structuredClone (推荐)
  const updatedSystem = structuredClone(unitSystem);

  // 方案 B: 手动深拷贝
  const updatedSystem = {
    ...unitSystem,
    [selectedType]: {
      ...unitSystem[selectedType],
      conversions: {
        ...unitSystem[selectedType].conversions,
        [newUnit.code]: { rate: parseFloat(newUnit.rate), displayName: newUnit.displayName }
      }
    }
  };
  ```

### 1.3 localStorage 解析异常捕获 [致命]

- **文件**: `pages/index.js:25-33`
- **问题**: `JSON.parse(localStorage.getItem(...))` 无 try/catch,数据损坏时应用白屏
- **修复**:
  ```js
  const safeParse = (key, fallback) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.error(`Failed to parse localStorage key "${key}":`, e);
      localStorage.removeItem(key);
      return fallback;
    }
  };
  ```

### 1.4 修复 `t` 函数导致的 API 重复请求 [高危]

- **文件**: `context/LanguageContext.js:26-33`, `components/ProductList.js:24`
- **问题**: `t` 函数每次渲染都是新引用,导致 ProductList 的 useEffect 在切换语言时重新请求汇率 API
- **修复**:
  - 用 `useCallback` 包裹 `t` 函数,依赖 `locale`
  - 从 ProductList 的 useEffect 依赖中移除 `t`,改为只依赖 `baseCurrency`
  ```js
  // LanguageContext.js
  const t = useCallback((key) => {
    const keys = key.split('.');
    let value = translations[locale];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  }, [locale]);
  ```

### 1.5 添加 React Error Boundary [高危]

- **文件**: 新建 `components/ErrorBoundary.js`, 修改 `pages/_app.js`
- **问题**: 任何组件运行时错误导致整体白屏
- **修复**: 添加 Error Boundary 组件,捕获渲染错误并显示友好的错误页面和重试按钮

### 1.6 补全币种符号映射 [高危]

- **文件**: `components/AddProductForm.js:21`
- **问题**: 只映射了 5 种货币符号,其余 6 种显示 `undefined`
- **修复**:
  ```js
  const currencies = {
    CNY: '¥', USD: '$', EUR: '€', GBP: '£', JPY: '¥',
    AUD: 'A$', CAD: 'C$', CHF: 'CHF', HKD: 'HK$', NZD: 'NZ$', SGD: 'S$'
  };
  ```

### 1.7 除零保护 [高危]

- **文件**: `components/ProductList.js:137`
- **问题**: 最低价为 0 时百分比计算产生 Infinity/NaN
- **修复**: 添加 `if (sortedProducts[0].unitPrice === 0)` 分支处理

### 1.8 SSR 水合不匹配 [高危]

- **文件**: `context/LanguageContext.js:7-17`
- **问题**: 服务端默认 `'zh'`,客户端检测浏览器语言可能为 `'en'`
- **修复**: 初始值统一为 `'zh'`,浏览器语言检测逻辑放到 useEffect 中且仅在 localStorage 无记录时执行

### 1.9 清理死代码

| 文件 | 问题 |
|------|------|
| `pages/index.js:21` | `formRef` 赋值后从未使用,删除 |
| `pages/index.js:55-57` | `handleUpdateUnits` 中重复的 `localStorage.setItem`,删除 |
| `constants/currencies.js:23` | `export const currencies` 从未被导入,删除 |

---

## 第二阶段: 核心体验提升

> 目标: 让现有功能从"能用"变成"好用"。
> 预计工时: 3-5 天

### 2.1 支持编辑商品 [极高价值 / 中等复杂度]

- **当前问题**: 添加后发现信息有误,只能删除重新添加
- **方案**:
  - 商品卡片添加编辑按钮 (铅笔图标)
  - 点击后卡片切换为内联编辑模式,复用 AddProductForm 的字段
  - 支持 Enter 保存、Esc 取消
  - 编辑时高亮当前卡片,禁止同时编辑多个
- **涉及文件**: `components/ProductList.js`, `pages/index.js`

### 2.2 智能分组对比 [极高价值 / 中等复杂度]

- **当前问题**: 重量商品和体积商品混在一起排序,结果无意义
- **方案**:
  - 按单位类别 (重量/体积/长度/面积/个数) 自动分组
  - 每组内独立排序和标记最优
  - 跨组商品显示提示: "不同单位类别的商品无法直接比较"
  - 允许用户手动合并/拆分分组
- **涉及文件**: `components/ProductList.js`, `constants/translations.js`

### 2.3 空状态引导 + 示例数据 [高价值 / 低复杂度]

- **当前问题**: 首次打开是空白列表,不知道该做什么
- **方案**:
  - 商品列表为空时显示引导卡片:
    - 简短说明应用用途
    - "试试看" 按钮一键加载 2-3 个示例商品 (如: 可乐 500ml ¥3 vs 可乐 2L ¥8)
    - 轻量动画引导视觉焦点到输入表单
  - 示例数据根据当前语言显示中文或英文商品名
- **涉及文件**: `components/ProductList.js`, `constants/translations.js`

### 2.4 删除撤销 (Undo Toast) [高价值 / 低复杂度]

- **当前问题**: 删除后无法恢复,`confirm()` 弹窗在移动端体验差
- **方案**:
  - 移除 `confirm()` 弹窗
  - 删除商品后显示 5 秒倒计时 toast,带"撤销"按钮
  - 删除操作延迟执行,toast 消失后才真正删除
  - "清空全部" 同理,但倒计时延长到 8 秒
- **依赖**: 已使用 `react-hot-toast`,可直接实现
- **涉及文件**: `pages/index.js`, `components/ProductList.js`

### 2.5 加载状态优化 [中等价值 / 低复杂度]

- **当前问题**: 汇率请求时无反馈,失败后无重试
- **方案**:
  - 汇率加载时显示骨架屏 (skeleton),而非空白
  - 请求失败时显示错误卡片 + 重试按钮
  - 添加 AbortController 超时 (10 秒)
  - 缓存上次成功的汇率数据到 localStorage,离线时降级使用
- **涉及文件**: `components/ProductList.js`, `constants/currencies.js`

### 2.6 输入体验优化 [中等价值 / 低复杂度]

- **方案**:
  - 数字输入添加 `inputMode="decimal"`,移动端弹出数字键盘
  - 通过 `onKeyDown` 拦截非法字符 (负号、字母等)
  - 价格输入前缀显示完整币种符号 (补全全部 11 种)
  - 快捷单位选择: 根据最近使用的单位排序,常用单位置顶
- **涉及文件**: `components/AddProductForm.js`

### 2.7 无障碍修复 [中等价值 / 低复杂度]

- 移除 `user-scalable=no`,允许用户缩放
- 所有图标按钮添加 `aria-label`
- 表单字段用 `htmlFor`/`id` 关联标签
- `_document.js` 的 `lang` 属性动态跟随语言设置
- `formatPrice` / `formatNumber` 使用当前 locale 而非硬编码 `'zh-CN'`

---

## 第三阶段: 差异化功能

> 目标: 从"工具"变成"值得收藏的应用",解决更深层的用户痛点。
> 预计工时: 每个功能 2-5 天

### 3.1 比价清单 (Comparison Lists) [极高价值]

**用户痛点**: 每次购物都要重新输入,无法积累比价经验

- **功能描述**:
  - 允许创建多个独立清单 (如"牛奶比价"、"洗衣液比价"、"猫粮比价")
  - 每个清单独立保存商品、独立排序
  - 首页展示所有清单的概览卡片,显示最优商品摘要
  - 支持清单命名、归档、删除
  - 数据存储从 localStorage 迁移到 IndexedDB

- **数据模型**:
  ```js
  {
    id: string,           // UUID
    name: string,         // "牛奶比价"
    category: string,     // 可选分类
    products: Product[],
    baseCurrency: string,
    createdAt: string,
    updatedAt: string
  }
  ```

- **页面结构变化**:
  ```
  / (首页)           -> 清单列表概览
  /list/[id] (详情)  -> 当前的比价功能 (输入 + 排序)
  ```

### 3.2 节省金额计算器 [极高价值]

**用户痛点**: 知道哪个便宜,但不知道便宜多少、值不值得买大包装

- **功能描述**:
  - 比价结果下方增加"省钱计算"面板
  - 用户输入月消耗量 (如: 每月喝 10 瓶牛奶)
  - 自动计算: "选择最优商品,每月可省 ¥XX,每年可省 ¥XXX"
  - 大包装 vs 小包装的单位差价可视化
  - 考虑保质期因素: "大包装更便宜,但需在 X 天内用完"

- **展示方式**:
  ```
  ┌─────────────────────────────────────────┐
  │  💡 选择 [商品A] 而不是 [商品C]          │
  │  每月消耗: [  10  ] 瓶                   │
  │  每月节省: ¥45.00                        │
  │  每年节省: ¥540.00                       │
  │  ████████████████░░░░░ 节省 38%          │
  └─────────────────────────────────────────┘
  ```

### 3.3 比价结果可视化 [高价值]

**用户痛点**: 纯数字列表缺乏直观冲击力

- **功能描述**:
  - 水平条形图展示各商品单价对比
  - 最优商品用绿色标注,最差用红色
  - 条形宽度按比例缩放,直观显示价格差距
  - 可选: 饼图展示各商品价格占比

- **技术选型**: 纯 CSS 实现简单条形图,不引入图表库,保持轻量

### 3.4 智能输入 (降低使用门槛) [高价值]

**用户痛点**: 在超市手动输入名称、价格、数量、单位太麻烦

- **功能 A: 自然语言解析**
  - 输入 "500ml 可乐 3.5元" 或 "可乐 3块5 500毫升"
  - 自动解析出: 名称=可乐, 价格=3.5, 数量=500, 单位=ml, 货币=CNY
  - 前端正则匹配,无需后端

- **功能 B: 拍照识别价签** (长期)
  - 调用手机摄像头拍摄超市价签
  - OCR 识别价格和规格信息
  - 自动填入表单
  - 可使用 Web OCR API (如 Tesseract.js 前端方案) 或云端 API

### 3.5 分享功能 [高价值]

**用户痛点**: 比价结果无法分享给家人朋友

- **方案 A: 截图分享**
  - 使用 `html2canvas` 将比价结果渲染为图片
  - 支持保存到相册或直接分享

- **方案 B: 链接分享**
  - 将比价数据编码到 URL 参数中 (base64 压缩)
  - 接收者打开链接直接看到比价结果
  - 无需后端,数据全在 URL 中

### 3.6 PWA 支持 [高价值]

**用户痛点**: 每次都要打开浏览器输入网址

- **功能描述**:
  - 添加 `manifest.json`,支持"添加到主屏幕"
  - 添加 Service Worker,缓存静态资源
  - 离线时使用缓存的汇率数据
  - 启动画面和图标设计
- **技术**: Next.js 的 `next-pwa` 插件可快速实现

### 3.7 历史记录与价格趋势 [中高价值]

- 自动保存每次比价时间和结果
- 同一商品的价格变化曲线
- "上次买牛奶是 3 周前,当时最优价是 ¥X"
- 数据存储在 IndexedDB 中

---

## 技术演进路线

### 短期 (当前 -> 1个月)

- 保持纯前端架构
- 用 IndexedDB 替代 localStorage (支持比价清单等结构化数据)
- 引入 TypeScript (渐进式迁移,新文件用 TS 写)
- 添加基础测试 (Jest + React Testing Library)
- 保持 Pages Router

### 中期 (1-3 个月)

- 迁移到 App Router (利用 Server Components、Streaming 等特性)
- 添加 PWA 支持
- 引入 Zustand 或 Jotai 替代手动 Context + prop drilling
- 添加 E2E 测试 (Playwright)
- CI/CD 配置 (GitHub Actions)

### 长期 (3 个月+,如果产品方向验证成功)

- 后端服务 (Supabase / Firebase,支持用户系统)
- 商品价格众筹数据库
- 跨设备数据同步
- 优惠提醒推送

---

## 附录: 完整问题清单

### 致命 (Critical)

| # | 问题 | 文件:行号 |
|---|------|-----------|
| C1 | API 密钥硬编码在源码中 | `constants/currencies.js:29` |
| C2 | UnitManager 浅拷贝导致 prop mutation | `components/UnitManager.js:27-28, 42-43` |
| C3 | localStorage JSON.parse 无异常捕获 | `pages/index.js:25-33` |

### 高危 (High)

| # | 问题 | 文件:行号 |
|---|------|-----------|
| H1 | `t` 函数未 memoize 导致 API 重复请求 | `context/LanguageContext.js:26`, `components/ProductList.js:24` |
| H2 | 币种符号映射不完整 (5/11) | `components/AddProductForm.js:21` |
| H3 | 除零风险 (最低价为 0) | `components/ProductList.js:137` |
| H4 | SSR 水合不匹配 (语言检测) | `context/LanguageContext.js:7-17` |
| H5 | 无 React Error Boundary | `pages/_app.js` |

### 中等 (Medium)

| # | 问题 | 文件:行号 |
|---|------|-----------|
| M1 | HTML lang 属性硬编码 zh-cn | `pages/_document.js:5` |
| M2 | user-scalable=no 禁用缩放 (WCAG 违规) | `pages/index.js:73` |
| M3 | 图标按钮缺少 aria-label | 多处 |
| M4 | 表单字段未关联 label | `components/AddProductForm.js` |
| M5 | formatPrice/formatNumber 硬编码 zh-CN | `components/ProductList.js:54`, `components/UnitConverter.js:45` |
| M6 | 硬编码颜色不随主题变化 | `components/ProductList.js:74,105,113,116,132` |
| M7 | API 请求无超时/无响应校验/无重试 | `constants/currencies.js:28-32` |
| M8 | formRef 死代码 | `pages/index.js:21` |
| M9 | handleUpdateUnits 重复写 localStorage | `pages/index.js:55-57` |
| M10 | `export const currencies` 死代码 | `constants/currencies.js:23` |
| M11 | 无 TypeScript 无 PropTypes | 全局 |
| M12 | 零测试覆盖 | 全局 |

### 低 (Low)

| # | 问题 | 文件:行号 |
|---|------|-----------|
| L1 | "箱" (case) 换算率为 1,语义不正确 | `constants/unitSystem.js:55` |
| L2 | toggleTheme 未用 useCallback | `context/ThemeContext.js` |
| L3 | 主题切换可能有 FOIT (Flash of Incorrect Theme) | `context/ThemeContext.js:18` |
| L4 | Inter 字体只加载 Latin 子集,中文回退系统字体 | `pages/_app.js:6` |
| L5 | UnitConverter swap 按钮 rounded-full 与全局不一致 | `components/UnitConverter.js:98` |
| L6 | Tailwind 颜色 scale 映射到同一变量无实际渐变 | `tailwind.config.mjs:15-18` |
| L7 | 无暗色模式 | `styles/globals.css` |

---

## 实施建议

**如果只能做一件事**: 优先实现 **比价清单 + 节省金额计算** (3.1 + 3.2)。这两个功能组合能让工具从"用完就关"变成"值得收藏",是产品价值跃升的关键。

**推荐实施顺序**:
1. 第一阶段全部 (1-2 天) — 扫清工程隐患
2. 2.3 空状态引导 (0.5 天) — 立竿见影提升首次体验
3. 2.4 删除撤销 (0.5 天) — 消除操作焦虑
4. 2.1 支持编辑 (1 天) — 核心流程补完
5. 2.2 智能分组 (1 天) — 比价结果更准确
6. 3.1 比价清单 (2-3 天) — 产品价值飞跃
7. 3.2 节省金额 (1-2 天) — 决策深度提升
8. 3.6 PWA 支持 (1 天) — 移动端体验闭环
9. 其余功能按需推进

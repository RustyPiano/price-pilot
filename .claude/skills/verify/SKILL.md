---
name: verify
description: 启动并驱动 Price Pilot 验证改动——dev server + Playwright 浏览器驱动的配方与已知坑
---

# Price Pilot 验证配方

## 启动

```bash
npm run dev -- -p 3457   # 约 2-3s Ready；用非 3000 端口避免与用户会话冲突
```

无需数据库/账号。汇率功能需要 `.env.local` 的 `EXCHANGE_RATE_API_KEY`，本机通常未配置——见下方坑 1。

## 驱动

用 Playwright（chromium 已在 ~/Library/Caches/ms-playwright 缓存）从 scratchpad 目录跑脚本：`npm i playwright` 后 `node script.mjs`。移动视口用 420px 宽。

值得驱动的流程：
- 首页快速对比：填价格/数量 → 实时单价、最划算徽章、结果横幅；回车跳格；自动加行（上限 6）
- 存为清单 → 跳转 `/list/{id}`；用 `indexedDB.open('price-pilot')` 读 `comparisonLists` 表核对落库数据
- `/en` 为英文路由（复用 HomePage）；暗色模式用 `colorScheme: 'dark'` 上下文选项（ThemeContext 会写 `data-theme`）

## 已知坑

1. **详情页首次加载必显示「汇率请求超时了」（dev-only 既有 bug）**：StrictMode 双挂载 + `fetchExchangeRates` 的 in-flight 去重（`constants/currencies.ts`）返回第一次已被 abort 的 promise。点「重试」即恢复。mock `**/api/exchange-rates*` 也绕不过首次失败，mock 后要点重试。
2. SSR HTML 里 `inputMode`/`enterKeyHint` 是驼峰形式（React 19 序列化），grep 小写会漏；浏览器解析等价，用 DOM `el.inputMode` 断言。
3. ~~详情页单价固定 2 位小数~~ 已于 2026-07-07 阶段四修复：详情页与条形图单价均走 `formatUnitPrice` 动态精度，与快速对比 hero 一致；金额合计（省钱计算器）仍为 `formatCurrencyAmount` 两位小数，属正确语义。
4. 分享图为小票样式（`ReceiptShareCard` 离屏渲染 + html2canvas）；验证时点详情页「预览图片」等 ~2s 截 modal，透明 PNG 的锯齿撕边在暗色 modal 下应透出底色。

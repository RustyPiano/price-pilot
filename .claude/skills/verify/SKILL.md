---
name: verify
description: 启动并驱动 Price Pilot 验证改动——dev server + Playwright 浏览器驱动的配方与已知坑
---

# Price Pilot 验证配方

## 启动

```bash
npm run dev -- -p 3457   # 约 2-3s Ready；用非 3000 端口避免与用户会话冲突
```

无需数据库/账号。汇率功能需要 `.env.local` 的 `EXCHANGE_RATE_API_KEY`（2026-07 实测本机已配置且可用；若失效则详情页会走错误面板/缓存降级）。

## 驱动

用 Playwright（chromium 已在 ~/Library/Caches/ms-playwright 缓存）从 scratchpad 目录跑脚本：`npm i playwright` 后 `node script.mjs`。移动视口用 420px 宽。

值得驱动的流程：
- 首页快速对比：填价格/数量 → 实时单价、最划算徽章、结果横幅；回车跳格；自动加行（上限 6）
- 存为清单 → 跳转 `/list/{id}`；用 `indexedDB.open('price-pilot')` 读 `comparisonLists` 表核对落库数据
- `/en` 为英文路由（复用 HomePage）；暗色模式用 `colorScheme: 'dark'` 上下文选项（ThemeContext 会写 `data-theme`）

## 已知坑

1. ~~详情页首次加载必显示「汇率请求超时了」~~ 已于 2026-07-13 阶段五修复（带 signal 的请求不再共享去重）；dev 首载即应正常出结果，若复现视为回归。
2. SSR HTML 里 `inputMode`/`enterKeyHint` 是驼峰形式（React 19 序列化），grep 小写会漏；浏览器解析等价，用 DOM `el.inputMode` 断言。
3. ~~详情页单价固定 2 位小数~~ 已于 2026-07-07 阶段四修复：详情页与条形图单价均走 `formatUnitPrice` 动态精度，与快速对比 hero 一致；金额合计（省钱计算器）仍为 `formatCurrencyAmount` 两位小数，属正确语义。
4. 分享图为小票样式（`ReceiptShareCard` 离屏渲染 + html2canvas）；验证时点详情页「预览图片」等 ~2s 截 modal，透明 PNG 的锯齿撕边在暗色 modal 下应透出底色。**改小票必须提取 blob 原图目检**（`fetch(img.src)` 转 base64 落盘），DOM 预览正确不代表 html2canvas 导出正确——它不还原 repeating-gradient / CSS ellipsis / flex 居中 / 旋转内文字（详见 CLAUDE.md 已知坑）。
5. 桌面视口下首页 QuickCompare 挂载即自动聚焦首格——测 skip-link/焦点顺序要用**详情页**（无 autofocus）。
6. 测 PWA 离线要走生产构建（SW 仅生产注册）：`npm run build && npm start -- -p 3458`，`navigator.serviceWorker.ready` 后 `context.setOffline(true)` 再 reload。

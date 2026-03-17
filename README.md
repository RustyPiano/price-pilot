# Price Pilot

**比单价，选更划算的。**

一款运行在浏览器端的单价对比工具。输入商品的价格和规格，自动换算为统一单价并排序，帮你在超市货架前、网购比价时快速做出最优决策。所有数据存储在本地，无需账号，支持离线使用。

---

## 功能一览

### 核心对比
- **自动计算单价** — 输入价格 + 数量 + 单位，立即得出每克/每毫升/每平方米等单价
- **跨单位对比** — 同一类别（重量/体积/长度/面积/计件）的商品自动换算到统一基准单位后对比
- **可视化条形图** — 以比例条形图直观呈现同组商品的单价差距，最优商品高亮标注
- **省钱计算器** — 输入每月消耗量，自动换算每月/每年节省金额

### 智能输入
- **自然语言解析** — 在名称栏直接输入 `可乐 500ml 3.5元` 或 `Cola 500ml $1.5`，自动填充所有字段
- **最近单位** — 记忆最近使用的 6 个单位，快速复用

### 多货币支持
- 支持 11 种货币：CNY、USD、EUR、JPY、GBP、AUD、CAD、CHF、HKD、NZD、SGD
- 实时汇率换算（需配置 API Key）将所有商品统一到同一货币下比较

### 清单管理
- **多清单** — 创建多个对比清单（如"超市采购"、"海淘比价"）分类管理
- **分类标签** — 为清单打标签（食品、日化、3C 等）
- **归档** — 完成的清单可归档，保留历史数据
- **撤销删除** — 删除商品后 5 秒内可通过 Toast 撤销

### 分享
- **分享链接** — 将清单编码为 URL 参数，任何人打开链接即可查看（数据嵌入链接，无需服务器）
- **截图分享** — 一键将对比结果导出为图片

### 工具
- **单位换算器** — 内置独立的单位换算工具（重量、体积、长度、面积、计件）
- **自定义单位** — 添加自定义单位及换算率，适配特殊商品

### 其他
- **中英双语** — 界面完整支持中文和英文，自动检测浏览器语言
- **本地存储** — 全部数据保存在浏览器 IndexedDB，无需账号，离线可用
- **PWA** — 支持添加到主屏幕，在移动设备上像原生 App 一样使用

---

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/RustyPiano/price-pilot.git
cd price-pilot

# 安装依赖
npm install

# （可选）配置汇率 API
cp .env.example .env.local
# 编辑 .env.local，填入 EXCHANGE_RATE_API_KEY

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

### 生产构建

```bash
npm run build
npm start
```

---

## 汇率 API 配置

多货币汇率换算功能依赖 [exchangerate-api.com](https://www.exchangerate-api.com/)。

1. 前往 [exchangerate-api.com](https://www.exchangerate-api.com/) 注册，获取免费 API Key（每月 1500 次请求）
2. 在项目根目录创建 `.env.local`：

```env
EXCHANGE_RATE_API_KEY=your_api_key_here
```

> 不配置 API Key 时，多货币汇率换算不可用，但单一货币的单价对比功能不受影响。

---

## 使用说明

### 创建清单

1. 在首页点击「新建清单」
2. 输入清单名称（如"超市比价"）和分类标签
3. 点击「创建」进入清单详情页

### 添加商品

**方式一：智能解析**

在名称栏输入一段自然语言，如：
- `可乐 500ml 3.5元`
- `牛奶 1L ¥8.9`
- `Juice 2L $3.5`

系统自动识别名称、价格、数量、单位和货币。

**方式二：逐项填写**

手动填写名称、价格、数量、单位（支持克/千克/毫升/升/平方米等 20+ 种单位）。

### 查看对比结果

添加 2 个以上同类商品后，系统自动：
- 换算为相同基准单位（重量统一到 kg，体积统一到 L）
- 按单价从低到高排序，标注最优（绿色）和最差（红色）
- 显示横向条形图，直观对比价格差距

---

## 项目结构

```
price-pilot/
├── pages/
│   ├── api/exchange-rates.ts # 汇率服务端代理与缓存
│   ├── index.tsx             # 首页 - 清单管理 / 备份导入导出
│   └── list/[id].tsx         # 清单详情页（支持 ?share= 参数展示分享数据）
├── components/
│   ├── ListWorkspace.tsx     # 清单详情主容器
│   ├── ProductList.tsx       # 商品列表与对比结果
│   ├── ProductEditorForm.tsx # 商品编辑表单（新增/编辑通用）
│   ├── AddProductForm.tsx    # 新增商品的表单包装
│   ├── PriceComparisonBars.tsx # 单价对比条形图
│   ├── SavingsCalculator.tsx # 省钱计算器
│   ├── UnitConverter.tsx     # 单位换算工具
│   ├── UnitManager.tsx       # 自定义单位管理
│   ├── CurrencySelector.tsx  # 货币选择器
│   ├── LanguageToggle.tsx    # 语言切换按钮
│   ├── PageHeader.tsx        # 顶部导航栏 + 主题切换
│   └── ErrorBoundary.tsx     # 错误边界组件
├── lib/
│   ├── comparison-lists.ts   # IndexedDB CRUD 与数据迁移
│   ├── comparison-math.ts    # 单价计算与分组排序引擎
│   ├── data-backup.ts        # JSON 备份导入导出
│   ├── share-utils.ts        # 分享链接编解码（Base64）
│   └── smart-product-parser.ts # 自然语言商品输入解析
├── constants/
│   ├── currencies.ts         # 货币列表与客户端汇率请求
│   ├── translations.ts       # 中英文翻译字典
│   └── unitSystem.ts         # 内置单位系统（含换算率）
├── context/
│   ├── LanguageContext.tsx   # 全局语言状态（zh / en）
│   └── ThemeContext.tsx      # 主题状态（light / dark / system）
├── tests/
│   └── lib/*.test.ts         # 核心逻辑单元测试
└── styles/
    └── globals.css           # Tailwind 基础 + CSS 变量主题
```

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| [Next.js](https://nextjs.org/) | 15.x | React 框架（Pages Router） |
| [React](https://react.dev/) | 19.x | UI 框架 |
| [Tailwind CSS](https://tailwindcss.com/) | 3.x | 原子化样式 |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | 严格类型检查 |
| [Lucide React](https://lucide.dev/) | — | 图标库 |
| [react-hot-toast](https://react-hot-toast.com/) | — | Toast 通知 |
| [html2canvas](https://html2canvas.hertzen.com/) | — | 截图分享 |
| [Vitest](https://vitest.dev/) | 4.x | 单元测试 |
| IndexedDB | 浏览器内置 | 本地数据持久化 |

无后端、无数据库、无账号系统——一切运行在用户浏览器中。

---

## 数据说明

- **存储位置**：浏览器 IndexedDB（数据库名 `price-pilot`，表 `comparisonLists`）
- **数据安全**：数据仅存在于本地，清除浏览器数据将删除所有清单
- **分享链接**：清单数据序列化后编码到 URL 参数中，无需服务器中转

---

## 开发

```bash
npm run dev    # 开发模式（热重载）
npm run build  # 生产构建
npm run lint   # 代码检查
```

---

## 许可证

[MIT](LICENSE)

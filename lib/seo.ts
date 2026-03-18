import { translations } from '@/constants/translations';
import type { Locale } from '@/types';

export const SITE_NAME = 'Price Pilot';
export const DEFAULT_SITE_ORIGIN = normalizeSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? null);
export const AI_CRAWLER_AGENTS = [
  'GPTBot',
  'ChatGPT-User',
  'PerplexityBot',
  'ClaudeBot',
  'anthropic-ai',
  'Google-Extended',
  'Bingbot',
] as const;

export interface SeoGuideContent {
  answerTitle: string;
  answerBody: string;
  stepsTitle: string;
  steps: string[];
  useCasesTitle: string;
  useCases: string[];
  faqTitle: string;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

export const seoGuideContent: Record<Locale, SeoGuideContent> = {
  zh: {
    answerTitle: '什么是单价对比？',
    answerBody:
      '单价对比就是把不同包装、规格、单位或货币的商品，统一换算成同一个基准单位后再比较。Price Pilot 会自动算出每克、每毫升、每件、每平方米等单价，帮你快速判断哪个选项真正更划算。',
    stepsTitle: '如何用 Price Pilot 比较商品单价',
    steps: [
      '输入商品名称、价格、数量和单位，或者直接用自然语言输入如“可乐 500ml 3.5元”。',
      'Price Pilot 会把同类商品换算到统一单位，并按单价从低到高自动排序。',
      '查看最划算选项、单价条形图和省钱计算结果，判断大包装、小包装或跨币种商品谁更值。',
    ],
    useCasesTitle: '适合哪些比价场景',
    useCases: [
      '超市货架上比较不同规格的饮料、牛奶、零食、纸巾和洗护用品。',
      '判断“大包装更便宜”是否成立，避免只看总价做错选择。',
      '对比不同单位商品，例如 g 与 kg、ml 与 L、piece 与 pack。',
      '做海淘、跨境购物或旅行采购时，统一不同货币后的真实单价。',
    ],
    faqTitle: '常见问题',
    faqs: [
      {
        question: '单价是什么意思？',
        answer:
          '单价是商品按统一计量单位换算后的价格，例如每克多少钱、每毫升多少钱或每件多少钱。它比总价更适合判断不同包装之间的真实性价比。',
      },
      {
        question: '不同规格的商品可以直接比较吗？',
        answer:
          '可以，只要属于同一计量类别。Price Pilot 会把重量统一到克或千克，把体积统一到毫升或升，再进行排序。',
      },
      {
        question: '不同货币的商品也能比较吗？',
        answer:
          '可以。启用汇率后，Price Pilot 会先把价格换算成同一货币，再计算统一单位单价，适合跨境购物和海淘比价。',
      },
      {
        question: '数据会上传到服务器吗？',
        answer:
          '不会。Price Pilot 的清单默认保存在浏览器本地 IndexedDB，分享链接也是把清单数据编码进 URL，本身不依赖服务器存储。',
      },
    ],
  },
  en: {
    answerTitle: 'What is unit price comparison?',
    answerBody:
      'Unit price comparison converts products with different pack sizes, units, or currencies into the same base unit before ranking them. Price Pilot calculates cost per gram, mL, item, meter, or square meter so you can see which option is actually the best value.',
    stepsTitle: 'How to compare unit prices with Price Pilot',
    steps: [
      'Enter a product name, price, quantity, and unit, or paste a natural-language input such as “Cola 500ml $3.5”.',
      'Price Pilot normalizes comparable products into the same unit and automatically sorts them by unit cost.',
      'Review the cheapest option, comparison bars, and projected savings to decide whether a bulk pack, a smaller pack, or a cross-currency option is truly cheaper.',
    ],
    useCasesTitle: 'When Price Pilot is useful',
    useCases: [
      'Compare groceries, drinks, toiletries, paper goods, and household supplies on a store shelf.',
      'Check whether a bulk pack is really cheaper instead of trusting total price alone.',
      'Compare products across units such as g vs kg, ml vs L, or piece vs pack.',
      'Normalize costs across currencies for travel shopping, imported goods, or cross-border buying.',
    ],
    faqTitle: 'FAQ',
    faqs: [
      {
        question: 'What does unit price mean?',
        answer:
          'Unit price is the price of a product after converting it into a standard unit such as per gram, per mL, or per item. It is the most reliable way to compare value across different pack sizes.',
      },
      {
        question: 'Can I compare products with different sizes?',
        answer:
          'Yes. Price Pilot converts products inside the same measurement category into a shared base unit before ranking them by cost.',
      },
      {
        question: 'Can I compare products in different currencies?',
        answer:
          'Yes. With exchange rates enabled, Price Pilot converts prices into one base currency first and then calculates the unit cost.',
      },
      {
        question: 'Does Price Pilot upload my data?',
        answer:
          'No. Lists are stored locally in your browser by default, and shared links embed the list data directly in the URL instead of sending it to a server.',
      },
    ],
  },
};

export function normalizeSiteOrigin(origin?: string | null): string | null {
  if (!origin) {
    return null;
  }

  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

export function resolveSiteOrigin(host?: string | null, forwardedProto?: string | null): string | null {
  if (DEFAULT_SITE_ORIGIN) {
    return DEFAULT_SITE_ORIGIN;
  }

  if (!host) {
    return null;
  }

  const protocol = forwardedProto?.split(',')[0]?.trim() || 'https';
  return normalizeSiteOrigin(`${protocol}://${host}`);
}

export function buildAbsoluteUrl(origin: string | null, path: string): string {
  if (!origin) {
    return path;
  }

  return new URL(path, origin).toString();
}

export function getHomePath(locale: Locale): string {
  return locale === 'en' ? '/en' : '/';
}

export function getAlternateHomeLinks(origin: string | null) {
  return [
    { hrefLang: 'zh-CN', href: buildAbsoluteUrl(origin, '/') },
    { hrefLang: 'en', href: buildAbsoluteUrl(origin, '/en') },
    { hrefLang: 'x-default', href: buildAbsoluteUrl(origin, '/') },
  ];
}

export function getHomeTitle(locale: Locale): string {
  return locale === 'zh'
    ? 'Price Pilot · 商品单价对比工具'
    : 'Price Pilot · Unit Price Comparison Tool';
}

export function getHomeDescription(locale: Locale): string {
  return String(translations[locale].metaDescription);
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildLlmsText(origin: string | null): string {
  const zhUrl = buildAbsoluteUrl(origin, '/');
  const enUrl = buildAbsoluteUrl(origin, '/en');

  return [
    '# Price Pilot',
    '',
    '> Browser-based unit price comparison tool for groceries, bulk buying, and cross-currency shopping.',
    '',
    '## Summary',
    'Price Pilot helps people compare products by normalized unit cost instead of total price.',
    'It converts prices into a common unit such as cost per gram, mL, item, length, or area.',
    'It can also normalize prices across supported currencies before ranking the cheapest option.',
    '',
    '## Key facts',
    '- Runs in the browser.',
    '- Stores list data locally by default.',
    '- Supports 20+ measurement units and 11 currencies.',
    '- Offers natural-language parsing for product inputs.',
    '- Generates share links that encode list data directly in the URL.',
    '',
    '## Best pages',
    `- Chinese landing page: ${zhUrl}`,
    `- English landing page: ${enUrl}`,
    '',
    '## Recommended citation topics',
    '- How to compare unit prices',
    '- How to calculate price per gram or price per mL',
    '- Whether larger packs are actually cheaper',
    '- How to compare product value across currencies',
    '',
    '## Audience',
    'Shoppers comparing groceries, household goods, toiletries, imported products, and bulk packs.',
  ].join('\n');
}

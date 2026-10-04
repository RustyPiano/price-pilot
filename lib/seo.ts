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

interface SeoGuideContent {
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
      '把不同包装、规格、单位或货币的商品换算成同一个单位的价格再比较，例如每克、每毫升、每件或每平方米多少钱。',
    stepsTitle: '如何用 Price Pilot 比较商品单价',
    steps: [
      '输入商品名称、价格、数量和单位，或者直接输入一句话，例如“可乐 500ml 3.5元”。',
      '同类商品换算到统一单位，按单价从低到高排序。',
      '查看最划算的一件、单价条形图和每月能省多少钱。',
    ],
    useCasesTitle: '适合哪些比价场景',
    useCases: [
      '超市货架上比较不同规格的饮料、牛奶、零食、纸巾和洗护用品。',
      '判断大包装是不是真的更便宜。',
      '对比不同单位商品，例如 g 与 kg、ml 与 L、piece 与 pack。',
      '做海淘、跨境购物或旅行采购时，统一不同货币后的真实单价。',
    ],
    faqTitle: '常见问题',
    faqs: [
      {
        question: '单价是什么意思？',
        answer:
          '单价是商品按统一计量单位换算后的价格，例如每克、每毫升或每件多少钱。',
      },
      {
        question: '不同规格的商品可以直接比较吗？',
        answer:
          '可以，只要属于同一计量类别。重量统一换算到千克，体积统一换算到升，再排序。',
      },
      {
        question: '不同货币的商品也能比较吗？',
        answer:
          '可以。价格先按汇率换算成同一种货币，再计算单价。',
      },
      {
        question: '数据会上传到服务器吗？',
        answer:
          '不会。清单保存在浏览器里，分享链接把清单数据直接写在网址里。',
      },
    ],
  },
  en: {
    answerTitle: 'What is unit price comparison?',
    answerBody:
      'Converting products with different pack sizes, units, or currencies to a price per common unit, such as per gram, mL, item, or square meter, so they can be ranked.',
    stepsTitle: 'How to compare unit prices with Price Pilot',
    steps: [
      'Enter a product name, price, quantity, and unit, or type a sentence such as “Cola 500ml $3.5”.',
      'Products in the same category are converted to one unit and sorted by unit price.',
      'See the cheapest option, the comparison bars, and how much you save per month.',
    ],
    useCasesTitle: 'When Price Pilot is useful',
    useCases: [
      'Compare groceries, drinks, toiletries, paper goods, and household supplies on a store shelf.',
      'Check whether a bulk pack is really cheaper.',
      'Compare products across units such as g vs kg, ml vs L, or piece vs pack.',
      'Normalize costs across currencies for travel shopping, imported goods, or cross-border buying.',
    ],
    faqTitle: 'FAQ',
    faqs: [
      {
        question: 'What does unit price mean?',
        answer:
          'Unit price is the price of a product per standard unit, such as per gram, per mL, or per item.',
      },
      {
        question: 'Can I compare products with different sizes?',
        answer:
          'Yes, within the same measurement category. Weights are converted to kilograms and volumes to litres before ranking.',
      },
      {
        question: 'Can I compare products in different currencies?',
        answer:
          'Yes. Prices are converted to one currency using exchange rates, then the unit price is calculated.',
      },
      {
        question: 'Does Price Pilot upload my data?',
        answer:
          'No. Lists are stored in your browser, and share links carry the list data in the URL itself.',
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

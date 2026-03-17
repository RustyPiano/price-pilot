import type { CurrencyCode, ProductInput } from '@/types';

const unitPatterns = [
  { code: 'ml', patterns: ['ml', '毫升'] },
  { code: 'l', patterns: ['l', '升', 'liter', 'litre'] },
  { code: 'g', patterns: ['g', '克', 'gram', 'grams'] },
  { code: 'kg', patterns: ['kg', '千克', '公斤', 'kilogram', 'kilograms'] },
  { code: 'piece', patterns: ['piece', '个'] },
  { code: 'bottle', patterns: ['bottle', '瓶'] },
  { code: 'bag', patterns: ['bag', '袋'] },
  { code: 'box', patterns: ['box', '盒'] },
  { code: 'pack', patterns: ['pack', '包'] },
] as const;

const currencyTokens = new Map<string, CurrencyCode>([
  ['人民币', 'CNY'],
  ['元', 'CNY'],
  ['块', 'CNY'],
  ['rmb', 'CNY'],
  ['cny', 'CNY'],
  ['¥', 'CNY'],
  ['usd', 'USD'],
  ['$', 'USD'],
  ['美元', 'USD'],
  ['eur', 'EUR'],
  ['€', 'EUR'],
  ['欧元', 'EUR'],
  ['gbp', 'GBP'],
  ['£', 'GBP'],
  ['英镑', 'GBP'],
  ['jpy', 'JPY'],
  ['日元', 'JPY'],
  ['aud', 'AUD'],
  ['澳元', 'AUD'],
  ['cad', 'CAD'],
  ['加元', 'CAD'],
  ['chf', 'CHF'],
  ['瑞郎', 'CHF'],
  ['hkd', 'HKD'],
  ['港币', 'HKD'],
  ['nzd', 'NZD'],
  ['新西兰元', 'NZD'],
  ['sgd', 'SGD'],
  ['新加坡元', 'SGD'],
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanupInput(input: string): string {
  return input
    .replace(/(\d+)\s*(?:块|元)\s*(\d{1,2})\b/g, (_, integerPart: string, decimalPart: string) => {
      return `${integerPart}.${decimalPart}元`;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function findQuantityAndUnit(input: string): {
  quantity: number;
  unit: string;
  matchedText: string;
} | null {
  for (const unitPattern of unitPatterns) {
    for (const token of unitPattern.patterns) {
      const pattern = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${escapeRegExp(token)})`, 'i');
      const match = input.match(pattern);
      const [matchedText, quantityText] = match ?? [];
      if (matchedText && quantityText) {
        return {
          quantity: parseFloat(quantityText),
          unit: unitPattern.code,
          matchedText,
        };
      }
    }
  }

  return null;
}

function findPriceAndCurrency(
  input: string,
  fallbackCurrency: CurrencyCode
): {
  price: number;
  currency: CurrencyCode;
  matchedText: string;
} | null {
  const prefixedMatch = input.match(/([¥$€£])\s*(\d+(?:\.\d+)?)/i);
  const [prefixedText, prefixedSymbol, prefixedPrice] = prefixedMatch ?? [];
  if (prefixedText && prefixedSymbol && prefixedPrice) {
    return {
      price: parseFloat(prefixedPrice),
      currency: currencyTokens.get(prefixedSymbol) || fallbackCurrency,
      matchedText: prefixedText,
    };
  }

  const suffixedMatch = input.match(
    /(\d+(?:\.\d+)?)\s*(人民币|元|块|rmb|cny|usd|美元|eur|欧元|gbp|英镑|jpy|日元|aud|澳元|cad|加元|chf|瑞郎|hkd|港币|nzd|新西兰元|sgd|新加坡元|¥|\$|€|£)/i
  );
  const [suffixedText, suffixedPrice, suffixedCurrency] = suffixedMatch ?? [];
  if (suffixedText && suffixedPrice && suffixedCurrency) {
    return {
      price: parseFloat(suffixedPrice),
      currency: currencyTokens.get(suffixedCurrency.toLowerCase()) || fallbackCurrency,
      matchedText: suffixedText,
    };
  }

  return null;
}

function extractName(input: string, matchedParts: string[]): string {
  if (matchedParts.length === 0) {
    return input.replace(/[，,]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return input
    .replace(new RegExp(matchedParts.map(escapeRegExp).join('|'), 'gi'), ' ')
    .replace(/[，,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseSmartProductInput(
  input: string,
  fallbackCurrency: CurrencyCode = 'CNY'
): Partial<ProductInput> | null {
  const normalizedInput = cleanupInput(input);
  if (!normalizedInput) {
    return null;
  }

  const quantityMatch = findQuantityAndUnit(normalizedInput);
  const priceMatch = findPriceAndCurrency(normalizedInput, fallbackCurrency);

  if (!quantityMatch && !priceMatch) {
    return null;
  }

  const matchedParts = [quantityMatch?.matchedText, priceMatch?.matchedText].filter(
    (value): value is string => Boolean(value)
  );
  const name = extractName(normalizedInput, matchedParts);
  const parsedProduct: Partial<ProductInput> = {};

  if (name) {
    parsedProduct.name = name;
  }

  if (quantityMatch && !Number.isNaN(quantityMatch.quantity)) {
    parsedProduct.quantity = quantityMatch.quantity;
    parsedProduct.unit = quantityMatch.unit;
  }

  if (priceMatch && !Number.isNaN(priceMatch.price)) {
    parsedProduct.price = priceMatch.price;
    parsedProduct.currency = priceMatch.currency;
  }

  return Object.keys(parsedProduct).length > 0 ? parsedProduct : null;
}

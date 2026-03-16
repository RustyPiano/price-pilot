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
];

const currencyTokens = new Map([
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

const cleanupInput = (input) => input
  .replace(/(\d+)\s*(?:块|元)\s*(\d{1,2})\b/g, (_, integerPart, decimalPart) => `${integerPart}.${decimalPart}元`)
  .replace(/\s+/g, ' ')
  .trim();

const findQuantityAndUnit = (input) => {
  for (const unitPattern of unitPatterns) {
    for (const token of unitPattern.patterns) {
      const pattern = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${token})`, 'i');
      const match = input.match(pattern);
      if (match) {
        return {
          quantity: parseFloat(match[1]),
          unit: unitPattern.code,
          matchedText: match[0],
        };
      }
    }
  }

  return null;
};

const findPriceAndCurrency = (input, fallbackCurrency) => {
  const prefixedMatch = input.match(/([¥$€£])\s*(\d+(?:\.\d+)?)/i);
  if (prefixedMatch) {
    return {
      price: parseFloat(prefixedMatch[2]),
      currency: currencyTokens.get(prefixedMatch[1]) || fallbackCurrency,
      matchedText: prefixedMatch[0],
    };
  }

  const suffixedMatch = input.match(/(\d+(?:\.\d+)?)\s*(人民币|元|块|rmb|cny|usd|美元|eur|欧元|gbp|英镑|jpy|日元|aud|澳元|cad|加元|chf|瑞郎|hkd|港币|nzd|新西兰元|sgd|新加坡元|¥|\$|€|£)/i);
  if (suffixedMatch) {
    return {
      price: parseFloat(suffixedMatch[1]),
      currency: currencyTokens.get(suffixedMatch[2].toLowerCase()) || fallbackCurrency,
      matchedText: suffixedMatch[0],
    };
  }

  return null;
};

const extractName = (input, matchedParts) => input
  .replace(new RegExp(matchedParts.filter(Boolean).join('|'), 'gi'), ' ')
  .replace(/[，,]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export function parseSmartProductInput(input, fallbackCurrency = 'CNY') {
  const normalizedInput = cleanupInput(input);
  if (!normalizedInput) {
    return null;
  }

  const quantityMatch = findQuantityAndUnit(normalizedInput);
  const priceMatch = findPriceAndCurrency(normalizedInput, fallbackCurrency);

  if (!quantityMatch || !priceMatch) {
    return null;
  }

  const matchedParts = [
    quantityMatch.matchedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    priceMatch.matchedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  ];
  const name = extractName(normalizedInput, matchedParts);

  if (!name || Number.isNaN(quantityMatch.quantity) || Number.isNaN(priceMatch.price)) {
    return null;
  }

  return {
    name,
    price: priceMatch.price,
    quantity: quantityMatch.quantity,
    unit: quantityMatch.unit,
    currency: priceMatch.currency,
  };
}

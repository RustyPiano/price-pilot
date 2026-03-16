export function getNumberLocale(locale = 'zh') {
  return locale === 'zh' ? 'zh-CN' : 'en-US';
}

export function enrichProducts(products, exchangeRates, baseCurrency, unitSystem) {
  if (!exchangeRates || products.length === 0) {
    return [];
  }

  return products.map((product, originalIndex) => {
    const productRate = exchangeRates[product.currency] || 1;
    const baseRate = exchangeRates[baseCurrency] || 1;
    const convertedPrice = product.price * (baseRate / productRate);

    let unitType = 'piece';
    let conversionRate = 1;
    let baseUnit = 'piece';

    for (const [type, info] of Object.entries(unitSystem)) {
      if (info.conversions[product.unit]) {
        unitType = type;
        conversionRate = info.conversions[product.unit].rate;
        baseUnit = info.baseUnit;
        break;
      }
    }

    const standardQuantity = product.quantity * conversionRate;
    const unitPrice = convertedPrice / standardQuantity;

    return { ...product, convertedPrice, unitPrice, standardQuantity, unitType, baseUnit, originalIndex };
  });
}

export function groupProductsByUnitType(enrichedProducts) {
  const groups = new Map();

  for (const product of enrichedProducts) {
    if (!groups.has(product.unitType)) {
      groups.set(product.unitType, {
        unitType: product.unitType,
        baseUnit: product.baseUnit,
        products: [],
      });
    }

    groups.get(product.unitType).products.push(product);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      products: [...group.products].sort((left, right) => left.unitPrice - right.unitPrice),
    }))
    .sort((left, right) => left.products[0].unitPrice - right.products[0].unitPrice);
}

export function formatCurrencyAmount(value, currency, locale = 'zh') {
  return new Intl.NumberFormat(getNumberLocale(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

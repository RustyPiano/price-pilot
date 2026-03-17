export function getNumberLocale(locale = 'zh') {
  return locale === 'zh' ? 'zh-CN' : 'en-US';
}

const compactUnitLabels = {
  zh: {
    g: '克',
    kg: '千克',
    mg: '毫克',
    oz: '盎司',
    lb: '磅',
    ml: '毫升',
    l: '升',
    gal: '加仑',
    floz: '液体盎司',
    cup: '杯',
    mm: '毫米',
    cm: '厘米',
    m: '米',
    km: '千米',
    in: '英寸',
    ft: '英尺',
    m2: '平方米',
    cm2: '平方厘米',
    ft2: '平方英尺',
    piece: '件',
    pack: '包',
    bottle: '瓶',
    bag: '袋',
    box: '盒',
    dozen: '打',
    case: '箱',
  },
  en: {
    g: 'g',
    kg: 'kg',
    mg: 'mg',
    oz: 'oz',
    lb: 'lb',
    ml: 'mL',
    l: 'L',
    gal: 'gal',
    floz: 'fl oz',
    cup: 'cup',
    mm: 'mm',
    cm: 'cm',
    m: 'm',
    km: 'km',
    in: 'in',
    ft: 'ft',
    m2: 'm2',
    cm2: 'cm2',
    ft2: 'ft2',
    piece: 'pc',
    pack: 'pack',
    bottle: 'bottle',
    bag: 'bag',
    box: 'box',
    dozen: 'dozen',
    case: 'case',
  },
};

export function formatProductQuantityLabel(product, locale = 'zh') {
  const normalizedLocale = locale === 'zh' ? 'zh' : 'en';
  const unitLabel = compactUnitLabels[normalizedLocale]?.[product.unit] || product.unit;
  const quantityValue = new Intl.NumberFormat(getNumberLocale(locale), {
    minimumFractionDigits: Number.isInteger(product.quantity) ? 0 : 0,
    maximumFractionDigits: 2,
  }).format(product.quantity);

  return normalizedLocale === 'zh'
    ? `${quantityValue}${unitLabel}`
    : `${quantityValue} ${unitLabel}`;
}

export function getProductDisplayMeta(product, locale = 'zh') {
  const quantityLabel = formatProductQuantityLabel(product, locale);

  return {
    displayName: `${product.name} ${quantityLabel}`,
    quantityLabel,
    shouldShowQuantityTag: true,
  };
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

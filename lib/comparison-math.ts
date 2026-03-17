import type {
  EnrichedProduct,
  ExchangeRates,
  Locale,
  Product,
  ProductGroup,
  UnitSystem,
} from '@/types';

const compactUnitLabels: Record<Locale, Record<string, string>> = {
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

function resolveLocale(locale: Locale | string = 'zh'): Locale {
  return locale === 'en' ? 'en' : 'zh';
}

function getCurrencyFractionDigits(currency: string): number {
  return currency === 'JPY' ? 0 : 2;
}

function resolveUnitMeta(unit: string, unitSystem: UnitSystem): {
  unitType: string;
  baseUnit: string;
  conversionRate: number;
} {
  for (const [type, info] of Object.entries(unitSystem)) {
    const conversion = info.conversions[unit];
    if (conversion) {
      return {
        unitType: type,
        baseUnit: info.baseUnit,
        conversionRate: conversion.rate,
      };
    }
  }

  return {
    unitType: unit,
    baseUnit: unit,
    conversionRate: 1,
  };
}

export function getNumberLocale(locale: Locale | string = 'zh'): string {
  return resolveLocale(locale) === 'zh' ? 'zh-CN' : 'en-US';
}

export function formatProductQuantityLabel(
  product: Pick<Product, 'quantity' | 'unit'>,
  locale: Locale | string = 'zh'
): string {
  const normalizedLocale = resolveLocale(locale);
  const unitLabel = compactUnitLabels[normalizedLocale][product.unit] ?? product.unit;
  const quantityValue = new Intl.NumberFormat(getNumberLocale(normalizedLocale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(product.quantity);

  return normalizedLocale === 'zh'
    ? `${quantityValue}${unitLabel}`
    : `${quantityValue} ${unitLabel}`;
}

export function getProductDisplayMeta(
  product: Pick<Product, 'name' | 'quantity' | 'unit'>,
  locale: Locale | string = 'zh'
): {
  displayName: string;
  quantityLabel: string;
  shouldShowQuantityTag: boolean;
} {
  const quantityLabel = formatProductQuantityLabel(product, locale);

  return {
    displayName: `${product.name} ${quantityLabel}`,
    quantityLabel,
    shouldShowQuantityTag: true,
  };
}

export function enrichProducts(
  products: Product[],
  exchangeRates: ExchangeRates | null | undefined,
  baseCurrency: string,
  unitSystem: UnitSystem
): EnrichedProduct[] {
  if (!exchangeRates || products.length === 0) {
    return [];
  }

  return products.map((product, originalIndex) => {
    const productRate = exchangeRates[product.currency] ?? 1;
    const baseRate = exchangeRates[baseCurrency] ?? 1;
    const convertedPrice = product.price * (baseRate / productRate);
    const { unitType, baseUnit, conversionRate } = resolveUnitMeta(product.unit, unitSystem);
    const standardQuantity = product.quantity * conversionRate;
    const unitPrice = standardQuantity > 0 ? convertedPrice / standardQuantity : 0;

    return {
      ...product,
      convertedPrice,
      unitPrice,
      standardQuantity,
      unitType,
      baseUnit,
      originalIndex,
    };
  });
}

export function groupProductsByUnitType(enrichedProducts: EnrichedProduct[]): ProductGroup[] {
  const groups = new Map<string, ProductGroup>();

  for (const product of enrichedProducts) {
    if (!groups.has(product.unitType)) {
      groups.set(product.unitType, {
        unitType: product.unitType,
        baseUnit: product.baseUnit,
        products: [],
      });
    }

    groups.get(product.unitType)?.products.push(product);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      products: [...group.products].sort((left, right) => left.unitPrice - right.unitPrice),
    }))
    .sort((left, right) => {
      const leftPrice = left.products[0]?.unitPrice ?? Number.POSITIVE_INFINITY;
      const rightPrice = right.products[0]?.unitPrice ?? Number.POSITIVE_INFINITY;
      return leftPrice - rightPrice;
    });
}

export function formatCurrencyAmount(
  value: number,
  currency: string,
  locale: Locale | string = 'zh'
): string {
  const fractionDigits = getCurrencyFractionDigits(currency);

  return new Intl.NumberFormat(getNumberLocale(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

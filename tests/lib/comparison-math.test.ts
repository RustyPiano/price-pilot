import { describe, expect, it } from 'vitest';
import { defaultUnitSystem } from '@/constants/unitSystem';
import {
  enrichProducts,
  formatCurrencyAmount,
  formatProductQuantityLabel,
  groupProductsByUnitType,
} from '@/lib/comparison-math';
import type { ExchangeRates, Product } from '@/types';

const baseProducts: Product[] = [
  {
    id: 'cola-500',
    name: 'Cola 500ml',
    price: 3.5,
    quantity: 500,
    unit: 'ml',
    currency: 'CNY',
    timestamp: '2026-03-17T00:00:00.000Z',
  },
  {
    id: 'cola-1l',
    name: 'Cola 1L',
    price: 6.5,
    quantity: 1,
    unit: 'l',
    currency: 'CNY',
    timestamp: '2026-03-17T00:00:01.000Z',
  },
];

describe('comparison-math', () => {
  it('enriches products across currencies and unit conversions', () => {
    const exchangeRates: ExchangeRates = { CNY: 1, USD: 0.14 };
    const products: Product[] = [
      baseProducts[0],
      {
        ...baseProducts[1],
        id: 'cola-usd',
        price: 1.4,
        currency: 'USD',
      },
    ];

    const enriched = enrichProducts(products, exchangeRates, 'CNY', defaultUnitSystem);

    expect(enriched[0]?.standardQuantity).toBeCloseTo(0.5);
    expect(enriched[0]?.unitPrice).toBeCloseTo(7);
    expect(enriched[1]?.convertedPrice).toBeCloseTo(10);
    expect(enriched[1]?.unitPrice).toBeCloseTo(10);
  });

  it('falls back safely for missing rates, zero quantities, and unknown units', () => {
    const enriched = enrichProducts(
      [
        {
          id: 'mystery',
          name: 'Mystery Pack',
          price: 10,
          quantity: 0,
          unit: 'bundle',
          currency: 'SGD',
          timestamp: '2026-03-17T00:00:02.000Z',
        },
      ],
      { CNY: 1 },
      'CNY',
      defaultUnitSystem
    );

    expect(enriched[0]?.convertedPrice).toBe(10);
    expect(enriched[0]?.unitPrice).toBe(0);
    expect(enriched[0]?.unitType).toBe('bundle');
    expect(enriched[0]?.baseUnit).toBe('bundle');
  });

  it('groups by unit type and sorts by lowest unit price first', () => {
    const enriched = enrichProducts(baseProducts, { CNY: 1 }, 'CNY', defaultUnitSystem);
    const mixed = enrichProducts(
      [
        ...baseProducts,
        {
          id: 'paper',
          name: 'Paper Towels',
          price: 20,
          quantity: 10,
          unit: 'piece',
          currency: 'CNY',
          timestamp: '2026-03-17T00:00:03.000Z',
        },
      ],
      { CNY: 1 },
      'CNY',
      defaultUnitSystem
    );

    expect(groupProductsByUnitType(enriched)).toHaveLength(1);
    const grouped = groupProductsByUnitType(mixed);
    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.products[0]?.unitPrice).toBeLessThanOrEqual(grouped[1]?.products[0]?.unitPrice ?? Infinity);
  });

  it('formats currencies and quantity labels by locale', () => {
    expect(formatCurrencyAmount(1234.56, 'CNY', 'zh')).toContain('1,234.56');
    expect(formatCurrencyAmount(1234.56, 'USD', 'en')).toContain('$1,234.56');
    expect(formatCurrencyAmount(1234.56, 'JPY', 'en')).toContain('1,235');
    expect(formatProductQuantityLabel(baseProducts[0], 'zh')).toBe('500毫升');
    expect(formatProductQuantityLabel(baseProducts[0], 'en')).toBe('500 mL');
  });
});

import { describe, expect, it } from 'vitest';
import { parseSmartProductInput } from '@/lib/smart-product-parser';

describe('smart-product-parser', () => {
  it('parses Chinese and English product strings', () => {
    expect(parseSmartProductInput('可乐 500ml 3.5元')).toEqual({
      name: '可乐',
      price: 3.5,
      quantity: 500,
      unit: 'ml',
      currency: 'CNY',
    });

    expect(parseSmartProductInput('Cola 500ml $3.5', 'USD')).toEqual({
      name: 'Cola',
      price: 3.5,
      quantity: 500,
      unit: 'ml',
      currency: 'USD',
    });
  });

  it('handles colloquial Chinese prices and price-only inputs', () => {
    expect(parseSmartProductInput('牛奶 1L 3块5')).toEqual({
      name: '牛奶',
      price: 3.5,
      quantity: 1,
      unit: 'l',
      currency: 'CNY',
    });

    expect(parseSmartProductInput('$9.99', 'USD')).toEqual({
      price: 9.99,
      currency: 'USD',
    });
  });

  it('returns null for unparseable input and supports multiple currencies/units', () => {
    expect(parseSmartProductInput('hello')).toBeNull();
    expect(parseSmartProductInput('€12.5', 'EUR')).toEqual({ price: 12.5, currency: 'EUR' });
    expect(parseSmartProductInput('Rice 2kg £8', 'GBP')).toMatchObject({ quantity: 2, unit: 'kg', currency: 'GBP' });
    expect(parseSmartProductInput('Soda 500g ¥100')).toMatchObject({ quantity: 500, unit: 'g', currency: 'CNY' });
    expect(parseSmartProductInput('Juice 1.5L $3')).toMatchObject({ quantity: 1.5, unit: 'l', currency: 'USD' });
    expect(parseSmartProductInput('Apple 3个 9元')).toMatchObject({ quantity: 3, unit: 'piece', currency: 'CNY' });
  });
});

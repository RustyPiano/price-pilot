import { describe, expect, it } from 'vitest';
import {
  compareQuickRows,
  formatUnitPrice,
  parseQuickQuantity,
  restoreQuickRows,
  serializeQuickRows,
} from '@/lib/quick-compare';
import type { QuickCompareRow } from '@/types';

function row(id: string, price: string, quantity: string, unit = '', promo = ''): QuickCompareRow {
  return { id, price, quantity, unit, promo };
}

const invalid = { unitPrice: null, isBest: false, pctAboveBest: null };

describe('compareQuickRows', () => {
  it('returns an empty array for an empty input', () => {
    expect(compareQuickRows([])).toEqual([]);
  });

  it('marks every row invalid when all rows are invalid', () => {
    const rows = [row('a', '', ''), row('b', '0', '5')];
    const results = compareQuickRows(rows);

    expect(results[0]).toMatchObject(invalid);
    expect(results[1]).toMatchObject(invalid);
  });

  it('reports only the unit price for a single valid row (not enough to compare)', () => {
    const rows = [row('a', '7.9', '500'), row('b', '', '')];
    const results = compareQuickRows(rows);

    expect(results[0]).toMatchObject({ unitPrice: 7.9 / 500, isBest: false, pctAboveBest: null });
    expect(results[1]).toMatchObject(invalid);
  });

  it('picks the lower unit price as best and computes the premium for the other row', () => {
    const rows = [row('a', '10', '2'), row('b', '15', '2')];
    const results = compareQuickRows(rows);

    expect(results[0]).toMatchObject({ unitPrice: 5, isBest: true, pctAboveBest: null });
    expect(results[1]).toMatchObject({ unitPrice: 7.5, isBest: false, pctAboveBest: 50 });
  });

  it('marks all rows best when unit prices tie', () => {
    const rows = [row('a', '10', '2'), row('b', '20', '4')];
    const results = compareQuickRows(rows);

    expect(results[0]).toMatchObject({ unitPrice: 5, isBest: true, pctAboveBest: null });
    expect(results[1]).toMatchObject({ unitPrice: 5, isBest: true, pctAboveBest: null });
  });

  it('keeps the per-unit display when no unit is chosen', () => {
    const results = compareQuickRows([row('a', '10', '2'), row('b', '15', '2')]);

    expect(results[0]).toMatchObject({ displayUnit: '', displayAmount: 1, comparable: true });
  });

  it('compares units in the same category and shows prices per the first row unit', () => {
    // 大米 5kg 32.9 元 vs 500g 4.5 元: 每千克 6.58 元 vs 9 元。
    const results = compareQuickRows([row('a', '32.9', '5', 'kg'), row('b', '4.5', '500', 'g')]);

    expect(results[0]).toMatchObject({ isBest: true, displayUnit: 'kg', displayAmount: 1 });
    expect(results[0]?.unitPrice).toBeCloseTo(6.58);
    expect(results[1]).toMatchObject({ isBest: false, pctAboveBest: 37, displayUnit: 'kg' });
    expect(results[1]?.unitPrice).toBeCloseTo(9);
  });

  it('shows grams and millilitres per 100 and handles jin', () => {
    const results = compareQuickRows([row('a', '9.9', '500', 'g'), row('b', '12.8', '1', 'jin')]);

    expect(results[0]).toMatchObject({ displayUnit: 'g', displayAmount: 100, isBest: true });
    expect(results[0]?.unitPrice).toBeCloseTo(1.98);
    expect(results[1]?.unitPrice).toBeCloseTo(2.56);
  });

  it('leaves rows from another unit category out of the comparison', () => {
    const results = compareQuickRows([
      row('a', '10', '1', 'kg'),
      row('b', '20', '1', 'kg'),
      row('c', '1', '1', 'l'),
    ]);

    expect(results[0]).toMatchObject({ isBest: true, comparable: true });
    expect(results[1]).toMatchObject({ pctAboveBest: 100, comparable: true });
    expect(results[2]).toMatchObject({ unitPrice: 1, isBest: false, pctAboveBest: null, comparable: false, displayUnit: 'l' });
  });

  it('multiplies multipack quantities', () => {
    // 24 瓶 × 500ml 49.9 元 vs 500ml 2.5 元: 每 100 毫升约 0.416 元 vs 0.5 元。
    const results = compareQuickRows([row('a', '49.9', '24×500', 'ml'), row('b', '2.5', '500', 'ml')]);

    expect(results[0]?.unitPrice).toBeCloseTo(0.4158, 4);
    expect(results[1]).toMatchObject({ unitPrice: 0.5, pctAboveBest: 20 });
  });

  it('applies promotions to the pack price', () => {
    // 第二件半价 9.9 元 → 每件 7.425 元, 比 7.9 元便宜。
    const results = compareQuickRows([row('a', '9.9', '500', 'g', 'half2'), row('b', '7.9', '500', 'g')]);

    expect(results[0]).toMatchObject({ isBest: true });
    expect(results[0]?.unitPrice).toBeCloseTo(1.485);
    expect(results[1]).toMatchObject({ pctAboveBest: 6 });
  });

  it('treats zero, negative, blank, non-numeric, and Infinity inputs as invalid', () => {
    const rows = [
      row('zero-price', '0', '5'),
      row('negative-price', '-3', '5'),
      row('blank', '', '5'),
      row('nan', 'abc', '5'),
      row('infinite', 'Infinity', '5'),
      row('valid', '10', '5'),
    ];
    const results = compareQuickRows(rows);

    expect(results[0]).toMatchObject(invalid);
    expect(results[1]).toMatchObject(invalid);
    expect(results[2]).toMatchObject(invalid);
    expect(results[3]).toMatchObject(invalid);
    expect(results[4]).toMatchObject(invalid);
    // 只有一个有效行, 还构不成对比。
    expect(results[5]).toMatchObject({ unitPrice: 2, isBest: false, pctAboveBest: null });
  });

  it('rounds the premium percentage to the nearest integer', () => {
    const rows = [row('a', '3', '1'), row('b', '4', '1')];
    const results = compareQuickRows(rows);

    expect(results[0]).toMatchObject({ unitPrice: 3, isBest: true, pctAboveBest: null });
    // (4/3 - 1) * 100 = 33.333... -> 33
    expect(results[1]).toMatchObject({ unitPrice: 4, isBest: false, pctAboveBest: 33 });
  });
});

describe('parseQuickQuantity', () => {
  it('parses plain numbers and one multiplication', () => {
    expect(parseQuickQuantity('500')).toBe(500);
    expect(parseQuickQuantity('24×500')).toBe(12000);
  });

  it('rejects empty, zero, and unfinished multiplications', () => {
    expect(parseQuickQuantity('')).toBeNaN();
    expect(parseQuickQuantity('0')).toBeNaN();
    expect(parseQuickQuantity('24×')).toBeNaN();
  });
});

describe('restoreQuickRows', () => {
  const rows = [row('a', '10', '2', 'kg', 'half2')];

  it('restores rows saved within two hours', () => {
    const now = Date.now();
    expect(restoreQuickRows(serializeQuickRows(rows, now - 60 * 60 * 1000), now)).toEqual(rows);
  });

  it('ignores rows saved more than two hours ago and missing records', () => {
    const now = Date.now();
    expect(restoreQuickRows(serializeQuickRows(rows, now - 3 * 60 * 60 * 1000), now)).toBeNull();
    expect(restoreQuickRows(null, now)).toBeNull();
  });
});

describe('formatUnitPrice', () => {
  it('formats large values with one decimal place', () => {
    expect(formatUnitPrice(123.456)).toBe('123.5');
    expect(formatUnitPrice(100)).toBe('100.0');
  });

  it('formats values at or above 1 with two decimal places', () => {
    expect(formatUnitPrice(7.891)).toBe('7.89');
    expect(formatUnitPrice(1)).toBe('1.00');
  });

  it('formats values at or above 0.01 with three decimal places', () => {
    expect(formatUnitPrice(0.0412)).toBe('0.041');
    expect(formatUnitPrice(0.01)).toBe('0.010');
  });

  it('formats smaller positive values with four decimal places', () => {
    expect(formatUnitPrice(0.00398)).toBe('0.0040');
    expect(formatUnitPrice(0.00001)).toBe('0.0000');
  });

  it('returns the placeholder dash for non-finite or non-positive values', () => {
    expect(formatUnitPrice(0)).toBe('—');
    expect(formatUnitPrice(-5)).toBe('—');
    expect(formatUnitPrice(NaN)).toBe('—');
    expect(formatUnitPrice(Infinity)).toBe('—');
    expect(formatUnitPrice(-Infinity)).toBe('—');
  });
});

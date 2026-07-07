import { describe, expect, it } from 'vitest';
import { compareQuickRows, formatUnitPrice } from '@/lib/quick-compare';
import type { QuickCompareRow } from '@/types';

function row(id: string, price: string, quantity: string): QuickCompareRow {
  return { id, price, quantity };
}

describe('compareQuickRows', () => {
  it('returns an empty array for an empty input', () => {
    expect(compareQuickRows([])).toEqual([]);
  });

  it('marks every row invalid when all rows are invalid', () => {
    const rows = [row('a', '', ''), row('b', '0', '5')];
    expect(compareQuickRows(rows)).toEqual([
      { unitPrice: null, isBest: false, pctAboveBest: null },
      { unitPrice: null, isBest: false, pctAboveBest: null },
    ]);
  });

  it('reports only the unit price for a single valid row (not enough to compare)', () => {
    const rows = [row('a', '7.9', '500'), row('b', '', '')];
    const results = compareQuickRows(rows);

    expect(results[0]).toEqual({ unitPrice: 7.9 / 500, isBest: false, pctAboveBest: null });
    expect(results[1]).toEqual({ unitPrice: null, isBest: false, pctAboveBest: null });
  });

  it('picks the lower unit price as best and computes the premium for the other row', () => {
    const rows = [row('a', '10', '2'), row('b', '15', '2')];
    const results = compareQuickRows(rows);

    expect(results[0]).toEqual({ unitPrice: 5, isBest: true, pctAboveBest: null });
    expect(results[1]).toEqual({ unitPrice: 7.5, isBest: false, pctAboveBest: 50 });
  });

  it('marks all rows best when unit prices tie', () => {
    const rows = [row('a', '10', '2'), row('b', '20', '4')];
    const results = compareQuickRows(rows);

    expect(results[0]).toEqual({ unitPrice: 5, isBest: true, pctAboveBest: null });
    expect(results[1]).toEqual({ unitPrice: 5, isBest: true, pctAboveBest: null });
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

    expect(results[0]).toEqual({ unitPrice: null, isBest: false, pctAboveBest: null });
    expect(results[1]).toEqual({ unitPrice: null, isBest: false, pctAboveBest: null });
    expect(results[2]).toEqual({ unitPrice: null, isBest: false, pctAboveBest: null });
    expect(results[3]).toEqual({ unitPrice: null, isBest: false, pctAboveBest: null });
    expect(results[4]).toEqual({ unitPrice: null, isBest: false, pctAboveBest: null });
    // 只有一个有效行, 还构不成对比。
    expect(results[5]).toEqual({ unitPrice: 2, isBest: false, pctAboveBest: null });
  });

  it('rounds the premium percentage to the nearest integer', () => {
    const rows = [row('a', '3', '1'), row('b', '4', '1')];
    const results = compareQuickRows(rows);

    expect(results[0]).toEqual({ unitPrice: 3, isBest: true, pctAboveBest: null });
    // (4/3 - 1) * 100 = 33.333... -> 33
    expect(results[1]).toEqual({ unitPrice: 4, isBest: false, pctAboveBest: 33 });
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

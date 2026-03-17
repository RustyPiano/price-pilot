import { beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeSharedComparisonList, encodeSharedComparisonList } from '@/lib/share-utils';
import type { ComparisonList } from '@/types';

const baseList: ComparisonList = {
  id: 'list-1',
  name: '周末采购',
  category: '食品',
  products: [
    {
      id: 'product-1',
      name: '可乐 "经典款"\n500ml',
      price: 3.5,
      quantity: 500,
      unit: 'ml',
      currency: 'CNY',
      timestamp: '2026-03-17T00:00:00.000Z',
    },
  ],
  baseCurrency: 'CNY',
  unitSystem: {
    piece: {
      baseUnit: 'piece',
      displayName: '计件',
      conversions: {
        piece: { rate: 1, displayName: '个' },
      },
    },
  },
  recentUnits: ['ml'],
  archived: false,
  createdAt: '2026-03-17T00:00:00.000Z',
  updatedAt: '2026-03-17T00:00:00.000Z',
};

describe('share-utils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('encodes and decodes a shared list round-trip', () => {
    const encoded = encodeSharedComparisonList(baseList, 'zh');
    const decoded = decodeSharedComparisonList(encoded, 'zh');

    expect(decoded).not.toBeNull();
    expect(decoded?.name).toBe(baseList.name);
    expect(decoded?.products[0]?.name).toBe(baseList.products[0]?.name);
    expect(decoded?.baseCurrency).toBe(baseList.baseCurrency);
  });

  it('returns null instead of throwing for invalid payloads', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(decodeSharedComparisonList('not-valid-base64', 'zh')).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
  });
});

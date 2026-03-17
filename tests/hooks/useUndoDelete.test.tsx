import { act, renderHook } from '@testing-library/react';
import { normalizeComparisonList } from '@/lib/comparison-lists';
import { useUndoDelete } from '@/hooks/useUndoDelete';
import type { ComparisonList } from '@/types';

const { toast } = vi.hoisted(() => ({
  toast: {
    custom: vi.fn(),
    dismiss: vi.fn(),
    remove: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({ toast }));
vi.mock('@/components/UndoToast', () => ({ default: () => null }));

const t = ((key: string) => key) as (key: string) => string;

function createList(): ComparisonList {
  return normalizeComparisonList({
    id: 'list-1',
    name: 'Groceries',
    products: [{
      id: 'product-1',
      name: 'Milk',
      price: 10,
      quantity: 1,
      unit: 'l',
      currency: 'CNY',
      timestamp: '2026-03-17T00:00:00.000Z',
    }],
  });
}

describe('useUndoDelete', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toast.custom.mockReset();
    toast.dismiss.mockReset();
    toast.remove.mockReset();
    toast.success.mockReset();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('commits a pending product deletion after the undo window', () => {
    const listRef = { current: createList() };
    const pushListUpdate = vi.fn((patch) => {
      const nextPatch = typeof patch === 'function' ? patch(listRef.current) : patch;
      listRef.current = normalizeComparisonList({ ...listRef.current, ...nextPatch });
      return listRef.current;
    });

    const { result } = renderHook(() => useUndoDelete({
      listId: listRef.current.id,
      listRef,
      pushListUpdate,
      t,
    }));

    act(() => {
      result.current.handleDeleteProduct('product-1');
    });

    expect(result.current.pendingProductIds).toEqual(['product-1']);
    expect(toast.custom).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(pushListUpdate).toHaveBeenCalledTimes(1);
    expect(listRef.current.products).toHaveLength(0);
    expect(toast.success).toHaveBeenCalledWith('deleteCommitted');
  });

  it('clears all products after the longer undo window', () => {
    const listRef = {
      current: normalizeComparisonList({
        id: 'list-1',
        name: 'Groceries',
        products: [
          {
            id: 'product-1',
            name: 'Milk',
            price: 10,
            quantity: 1,
            unit: 'l',
            currency: 'CNY',
            timestamp: '2026-03-17T00:00:00.000Z',
          },
          {
            id: 'product-2',
            name: 'Juice',
            price: 8,
            quantity: 500,
            unit: 'ml',
            currency: 'CNY',
            timestamp: '2026-03-17T00:00:01.000Z',
          },
        ],
      }),
    };
    const pushListUpdate = vi.fn((patch) => {
      const nextPatch = typeof patch === 'function' ? patch(listRef.current) : patch;
      listRef.current = normalizeComparisonList({ ...listRef.current, ...nextPatch });
      return listRef.current;
    });

    const { result } = renderHook(() => useUndoDelete({
      listId: listRef.current.id,
      listRef,
      pushListUpdate,
      t,
    }));

    act(() => {
      result.current.handleClearAll();
    });

    expect(result.current.pendingProductIds).toEqual(['product-1', 'product-2']);

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(listRef.current.products).toHaveLength(0);
    expect(toast.success).toHaveBeenCalledWith('clearedSuccess');
  });
});

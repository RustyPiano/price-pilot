import { act, renderHook } from '@testing-library/react';
import { createComparisonList } from '@/lib/comparison-lists';
import { useListState } from '@/hooks/useListState';

describe('useListState', () => {
  it('adds and updates products while keeping recent units in sync', () => {
    const comparisonList = createComparisonList({ name: 'Groceries' });
    const onSaveList = vi.fn();
    const { result } = renderHook(() => useListState({ comparisonList, onSaveList }));

    act(() => {
      result.current.addProduct({
        name: 'Milk',
        price: 12.5,
        quantity: 1,
        unit: 'l',
        currency: 'CNY',
      });
    });

    const productId = result.current.list.products[0]?.id;
    expect(productId).toBeTruthy();
    expect(result.current.list.products).toHaveLength(1);
    expect(result.current.list.recentUnits[0]).toBe('l');

    act(() => {
      result.current.updateProduct(productId!, {
        name: 'Milk Family Pack',
        price: 20,
        quantity: 2,
        unit: 'kg',
        currency: 'CNY',
      });
    });

    expect(result.current.list.products[0]).toMatchObject({
      name: 'Milk Family Pack',
      price: 20,
      quantity: 2,
      unit: 'kg',
    });
    expect(result.current.list.recentUnits[0]).toBe('kg');
    expect(onSaveList).toHaveBeenCalledTimes(2);
  });

  it('updates metadata, currency, and units on the current list', () => {
    const comparisonList = createComparisonList({ name: 'Groceries' });
    const onSaveList = vi.fn();
    const { result } = renderHook(() => useListState({ comparisonList, onSaveList }));

    act(() => {
      result.current.updateMetadata('Weekly groceries', 'Home');
      result.current.updateCurrency('USD');
      result.current.updateUnits({
        ...result.current.list.unitSystem,
        custom: {
          baseUnit: 'pack',
          displayName: 'Pack',
          conversions: {
            pack: { rate: 1, displayName: 'Pack' },
          },
        },
      });
    });

    expect(result.current.list.name).toBe('Weekly groceries');
    expect(result.current.list.category).toBe('Home');
    expect(result.current.list.baseCurrency).toBe('USD');
    expect(result.current.list.unitSystem.custom?.baseUnit).toBe('pack');
    expect(onSaveList).toHaveBeenCalledTimes(3);
  });
});

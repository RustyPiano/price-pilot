import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeComparisonList, normalizeProduct } from '@/lib/comparison-lists';
import type { ComparisonList, ProductInput, UnitSystem } from '@/types';

export type ListPatch =
  | Partial<ComparisonList>
  | ((currentList: ComparisonList) => Partial<ComparisonList>);

interface UseListStateOptions {
  comparisonList: ComparisonList;
  onSaveList: (list: ComparisonList) => void;
}

export function useListState({ comparisonList, onSaveList }: UseListStateOptions) {
  const [list, setList] = useState(() => normalizeComparisonList(comparisonList));
  const listRef = useRef(list);

  useEffect(() => {
    const normalizedList = normalizeComparisonList(comparisonList);
    listRef.current = normalizedList;
    setList(normalizedList);
  }, [comparisonList]);

  const pushListUpdate = useCallback((patch: ListPatch) => {
    const currentList = listRef.current;
    const resolvedPatch = typeof patch === 'function' ? patch(currentList) : patch;
    const nextList = normalizeComparisonList({
      ...currentList,
      ...resolvedPatch,
      updatedAt: new Date().toISOString(),
    });

    listRef.current = nextList;
    setList(nextList);
    onSaveList(nextList);

    return nextList;
  }, [onSaveList]);

  const promoteRecentUnit = useCallback((unit: string, sourceUnits = listRef.current.recentUnits) => {
    return [unit, ...sourceUnits.filter((item) => item !== unit)].slice(0, 6);
  }, []);

  const addProduct = useCallback((product: ProductInput) => {
    const nextProduct = normalizeProduct({
      ...product,
      timestamp: product.timestamp || new Date().toISOString(),
    });

    pushListUpdate((currentList) => ({
      products: [...currentList.products, nextProduct],
      recentUnits: promoteRecentUnit(nextProduct.unit, currentList.recentUnits),
    }));
  }, [promoteRecentUnit, pushListUpdate]);

  const updateProduct = useCallback((productId: string, updatedProduct: ProductInput) => {
    pushListUpdate((currentList) => ({
      products: currentList.products.map((product) => (
        product.id === productId
          ? {
              ...product,
              ...updatedProduct,
              id: product.id,
              timestamp: product.timestamp || updatedProduct.timestamp || new Date().toISOString(),
            }
          : product
      )),
      recentUnits: promoteRecentUnit(updatedProduct.unit, currentList.recentUnits),
    }));
  }, [promoteRecentUnit, pushListUpdate]);

  const updateMetadata = useCallback((name: string, category: string) => {
    pushListUpdate({ name, category });
  }, [pushListUpdate]);

  const updateCurrency = useCallback((baseCurrency: string) => {
    pushListUpdate({ baseCurrency });
  }, [pushListUpdate]);

  const updateUnits = useCallback((unitSystem: UnitSystem) => {
    pushListUpdate({ unitSystem });
  }, [pushListUpdate]);

  return {
    list,
    listRef,
    pushListUpdate,
    promoteRecentUnit,
    addProduct,
    updateProduct,
    updateMetadata,
    updateCurrency,
    updateUnits,
  };
}

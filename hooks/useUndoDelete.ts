import { createElement, useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { toast } from 'react-hot-toast';
import UndoToast from '@/components/UndoToast';
import type { ComparisonList, Translate } from '@/types';
import type { ListPatch } from '@/hooks/useListState';

const DELETE_UNDO_DURATION = 5000;
const CLEAR_ALL_UNDO_DURATION = 8000;

interface PendingDeleteEntry {
  timeoutId: number;
  toastId: string;
}

interface PendingClearEntry extends PendingDeleteEntry {
  productIds: string[];
}

interface UseUndoDeleteOptions {
  listId: string;
  listRef: MutableRefObject<ComparisonList>;
  pushListUpdate: (patch: ListPatch) => ComparisonList;
  t: Translate;
}

export function useUndoDelete({
  listId,
  listRef,
  pushListUpdate,
  t,
}: UseUndoDeleteOptions) {
  const [pendingProductIds, setPendingProductIds] = useState<string[]>([]);
  const pendingDeleteRef = useRef<Map<string, PendingDeleteEntry>>(new Map());
  const pendingClearRef = useRef<PendingClearEntry | null>(null);

  const dismissPendingDelete = useCallback((productId: string) => {
    const pendingDelete = pendingDeleteRef.current.get(productId);
    if (!pendingDelete) return;

    window.clearTimeout(pendingDelete.timeoutId);
    toast.remove(pendingDelete.toastId);
    pendingDeleteRef.current.delete(productId);
    setPendingProductIds((prev) => prev.filter((id) => id !== productId));
  }, []);

  const cancelAllPendingDeletes = useCallback(() => {
    Array.from(pendingDeleteRef.current.keys()).forEach((productId) => {
      dismissPendingDelete(productId);
    });
  }, [dismissPendingDelete]);

  const handleDeleteProduct = useCallback((productId: string) => {
    if (pendingDeleteRef.current.has(productId)) return;

    const expiresAt = Date.now() + DELETE_UNDO_DURATION;
    const toastId = `delete-${productId}`;
    const commitDelete = () => {
      if (!pendingDeleteRef.current.has(productId)) {
        return;
      }

      pushListUpdate((currentList) => ({
        products: currentList.products.filter((product) => product.id !== productId),
      }));
      pendingDeleteRef.current.delete(productId);
      setPendingProductIds((prev) => prev.filter((id) => id !== productId));
      toast.remove(toastId);
      toast.success(t('deleteCommitted'));
    };
    const timeoutId = window.setTimeout(commitDelete, DELETE_UNDO_DURATION);

    pendingDeleteRef.current.set(productId, { timeoutId, toastId });
    setPendingProductIds((prev) => [...prev, productId]);

    toast.custom(
      () => createElement(UndoToast, {
        title: t('deletePendingTitle'),
        description: t('deletePendingDescription'),
        expiresAt,
        actionLabel: t('undoAction'),
        onAction: () => dismissPendingDelete(productId),
        onExpire: commitDelete,
      }),
      { id: toastId, duration: DELETE_UNDO_DURATION }
    );
  }, [dismissPendingDelete, pushListUpdate, t]);

  const handleClearAll = useCallback(() => {
    const products = listRef.current.products;
    if (products.length === 0) return;

    cancelAllPendingDeletes();

    const productIds = products.map((product) => product.id);
    const expiresAt = Date.now() + CLEAR_ALL_UNDO_DURATION;
    const toastId = `clear-all-${listId}`;
    const commitClearAll = () => {
      if (!pendingClearRef.current || pendingClearRef.current.toastId !== toastId) {
        return;
      }

      pushListUpdate({ products: [] });
      pendingClearRef.current = null;
      setPendingProductIds((prev) => prev.filter((id) => !productIds.includes(id)));
      toast.remove(toastId);
      toast.success(t('clearedSuccess'));
    };
    const timeoutId = window.setTimeout(commitClearAll, CLEAR_ALL_UNDO_DURATION);

    pendingClearRef.current = { timeoutId, toastId, productIds };
    setPendingProductIds(productIds);

    toast.custom(
      () => createElement(UndoToast, {
        title: t('clearPendingTitle'),
        description: t('clearPendingDescription'),
        expiresAt,
        actionLabel: t('undoAction'),
        onExpire: commitClearAll,
        onAction: () => {
          if (!pendingClearRef.current) return;

          const {
            timeoutId: currentTimeoutId,
            toastId: currentToastId,
            productIds: scheduledIds,
          } = pendingClearRef.current;

          window.clearTimeout(currentTimeoutId);
          toast.remove(currentToastId);
          pendingClearRef.current = null;
          setPendingProductIds((prev) => prev.filter((id) => !scheduledIds.includes(id)));
        },
      }),
      { id: toastId, duration: CLEAR_ALL_UNDO_DURATION }
    );
  }, [cancelAllPendingDeletes, listId, listRef, pushListUpdate, t]);

  useEffect(() => () => {
    pendingDeleteRef.current.forEach(({ timeoutId, toastId }) => {
      window.clearTimeout(timeoutId);
      toast.remove(toastId);
    });

    if (pendingClearRef.current) {
      window.clearTimeout(pendingClearRef.current.timeoutId);
      toast.remove(pendingClearRef.current.toastId);
    }
  }, []);

  return {
    pendingProductIds,
    handleDeleteProduct,
    handleClearAll,
  };
}

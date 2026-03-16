import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import AddProductForm from './AddProductForm';
import CurrencySelector from './CurrencySelector';
import ProductList from './ProductList';
import UnitManager from './UnitManager';
import UnitConverter from './UnitConverter';
import { useLanguage } from '../context/LanguageContext';
import { normalizeComparisonList, normalizeProduct } from '../lib/comparison-lists';
import { encodeSharedComparisonList } from '../lib/share-utils';
import { ArrowLeftRight, Settings, BarChart3, Plus, Trash2, Download, Share2 } from 'lucide-react';

const DELETE_UNDO_DURATION = 5000;
const CLEAR_ALL_UNDO_DURATION = 8000;

function UndoToast({ title, description, expiresAt, actionLabel, onAction, onExpire }) {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000)));
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const nextSecondsLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setSecondsLeft(nextSecondsLeft);

      if (nextSecondsLeft === 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        window.clearInterval(intervalId);
        onExpire?.();
      }
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [expiresAt, onExpire]);

  return (
    <div className="theme-card px-4 py-3 min-w-[280px] max-w-sm flex items-center justify-between gap-4">
      <div>
        <p className="font-semibold text-sm text-foreground">{title}</p>
        <p className="text-xs text-gray-500">{description} {secondsLeft}s</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="theme-btn px-3 py-2 text-xs font-semibold bg-surface whitespace-nowrap"
      >
        {actionLabel}
      </button>
    </div>
  );
}

export default function ListWorkspace({ comparisonList, onSaveList }) {
  const [activePanel, setActivePanel] = useState(null);
  const [highlightForm, setHighlightForm] = useState(false);
  const [pendingProductIds, setPendingProductIds] = useState([]);
  const [metadataDraft, setMetadataDraft] = useState({ name: comparisonList.name, category: comparisonList.category || '' });
  const [isSharingLink, setIsSharingLink] = useState(false);
  const [isSharingImage, setIsSharingImage] = useState(false);
  const pendingDeleteRef = useRef(new Map());
  const pendingClearRef = useRef(null);
  const listRef = useRef(normalizeComparisonList(comparisonList));
  const resultsCaptureRef = useRef(null);
  const { t } = useLanguage();

  const normalizedList = normalizeComparisonList(comparisonList);
  const { products, baseCurrency, unitSystem, recentUnits } = normalizedList;

  useEffect(() => {
    listRef.current = normalizedList;
  }, [normalizedList]);

  useEffect(() => {
    setMetadataDraft({ name: comparisonList.name, category: comparisonList.category || '' });
  }, [comparisonList.category, comparisonList.id, comparisonList.name]);

  useEffect(() => {
    if (!highlightForm) return undefined;

    const timeoutId = window.setTimeout(() => {
      setHighlightForm(false);
    }, 1400);

    return () => window.clearTimeout(timeoutId);
  }, [highlightForm]);

  useEffect(() => () => {
    pendingDeleteRef.current.forEach(({ timeoutId, toastId }) => {
      window.clearTimeout(timeoutId);
      toast.dismiss(toastId);
    });

    if (pendingClearRef.current) {
      window.clearTimeout(pendingClearRef.current.timeoutId);
      toast.dismiss(pendingClearRef.current.toastId);
    }
  }, []);

  const pushListUpdate = (patch) => {
    const resolvedPatch = typeof patch === 'function' ? patch(listRef.current) : patch;
    const nextList = normalizeComparisonList({
      ...listRef.current,
      ...resolvedPatch,
      updatedAt: new Date().toISOString(),
    });

    listRef.current = nextList;
    onSaveList(nextList);
  };

  const promoteRecentUnit = (unit, sourceUnits = listRef.current.recentUnits) => {
    return [unit, ...sourceUnits.filter((item) => item !== unit)].slice(0, 6);
  };

  const dismissPendingDelete = (productId) => {
    const pendingDelete = pendingDeleteRef.current.get(productId);
    if (!pendingDelete) return;

    window.clearTimeout(pendingDelete.timeoutId);
    toast.dismiss(pendingDelete.toastId);
    pendingDeleteRef.current.delete(productId);
    setPendingProductIds((prev) => prev.filter((id) => id !== productId));
  };

  const cancelAllPendingDeletes = () => {
    Array.from(pendingDeleteRef.current.keys()).forEach((productId) => {
      dismissPendingDelete(productId);
    });
  };

  const commitMetadata = () => {
    const nextName = metadataDraft.name.trim() || (t('defaultListName') || comparisonList.name);
    const nextCategory = metadataDraft.category.trim();

    if (nextName === comparisonList.name && nextCategory === (comparisonList.category || '')) {
      return;
    }

    const nextMetadata = { name: nextName, category: nextCategory };
    setMetadataDraft(nextMetadata);
    pushListUpdate(nextMetadata);
    toast.success(t('listUpdatedSuccess'));
  };

  const handleAddProduct = (product) => {
    const nextProduct = normalizeProduct({
      ...product,
      timestamp: product.timestamp || new Date().toISOString(),
    });

    pushListUpdate((currentList) => ({
      products: [...currentList.products, nextProduct],
      recentUnits: promoteRecentUnit(nextProduct.unit, currentList.recentUnits),
    }));
    toast.success(t('addedSuccess'));
  };

  const handleRemoveProduct = (productId) => {
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
      toast.dismiss(toastId);
      toast.success(t('deleteCommitted'));
    };
    const timeoutId = window.setTimeout(commitDelete, DELETE_UNDO_DURATION);

    pendingDeleteRef.current.set(productId, { timeoutId, toastId });
    setPendingProductIds((prev) => [...prev, productId]);

    toast.custom(
      () => (
        <UndoToast
          title={t('deletePendingTitle')}
          description={t('deletePendingDescription')}
          expiresAt={expiresAt}
          actionLabel={t('undoAction')}
          onAction={() => dismissPendingDelete(productId)}
          onExpire={commitDelete}
        />
      ),
      { id: toastId, duration: DELETE_UNDO_DURATION }
    );
  };

  const handleUpdateProduct = (productId, updatedProduct) => {
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
    toast.success(t('updatedSuccess'));
  };

  const handleLoadSampleData = () => {
    const sampleProducts = t('sampleProducts');
    if (!Array.isArray(sampleProducts)) return;

    pushListUpdate((currentList) => ({
      products: sampleProducts.map((product, index) => normalizeProduct({
        ...product,
        currency: baseCurrency,
        timestamp: new Date(Date.now() + index).toISOString(),
      })),
      recentUnits: ['ml', 'l', ...currentList.recentUnits.filter((unit) => unit !== 'ml' && unit !== 'l')].slice(0, 6),
    }));
    setHighlightForm(true);
    toast.success(t('sampleDataLoaded'));
  };

  const handleClearAll = () => {
    if (products.length === 0) return;

    cancelAllPendingDeletes();

    const productIds = products.map((product) => product.id);
    const expiresAt = Date.now() + CLEAR_ALL_UNDO_DURATION;
    const toastId = `clear-all-${comparisonList.id}`;
    const commitClearAll = () => {
      if (!pendingClearRef.current || pendingClearRef.current.toastId !== toastId) {
        return;
      }

      pushListUpdate({ products: [] });
      pendingClearRef.current = null;
      setPendingProductIds((prev) => prev.filter((id) => !productIds.includes(id)));
      toast.dismiss(toastId);
      toast.success(t('clearedSuccess'));
    };
    const timeoutId = window.setTimeout(commitClearAll, CLEAR_ALL_UNDO_DURATION);

    pendingClearRef.current = { timeoutId, toastId, productIds };
    setPendingProductIds(productIds);

    toast.custom(
      () => (
        <UndoToast
          title={t('clearPendingTitle')}
          description={t('clearPendingDescription')}
          expiresAt={expiresAt}
          actionLabel={t('undoAction')}
          onExpire={commitClearAll}
          onAction={() => {
            if (!pendingClearRef.current) return;

            const { timeoutId: currentTimeoutId, toastId: currentToastId, productIds: scheduledIds } = pendingClearRef.current;
            window.clearTimeout(currentTimeoutId);
            toast.dismiss(currentToastId);
            pendingClearRef.current = null;
            setPendingProductIds((prev) => prev.filter((id) => !scheduledIds.includes(id)));
          }}
        />
      ),
      { id: toastId, duration: CLEAR_ALL_UNDO_DURATION }
    );
  };

  const buildShareUrl = () => {
    const sharePayload = encodeSharedComparisonList(listRef.current);
    const sharedUrl = new URL(window.location.href);
    sharedUrl.searchParams.set('share', sharePayload);
    return sharedUrl.toString();
  };

  const handleShareLink = async () => {
    setIsSharingLink(true);

    try {
      const sharedUrl = buildShareUrl();

      if (navigator.share) {
        await navigator.share({
          title: listRef.current.name,
          text: t('shareLinkMessage').replace('{name}', listRef.current.name),
          url: sharedUrl,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sharedUrl);
      } else {
        throw new Error('Clipboard API is not available.');
      }

      toast.success(t('shareLinkSuccess'));
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Failed to share list link:', error);
        toast.error(t('shareLinkError'));
      }
    } finally {
      setIsSharingLink(false);
    }
  };

  const handleShareImage = async () => {
    if (!resultsCaptureRef.current) {
      return;
    }

    setIsSharingImage(true);

    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(resultsCaptureRef.current, {
        backgroundColor: '#fdfbf7',
        scale: 2,
        useCORS: true,
      });

      const imageBlob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
            return;
          }

          reject(new Error('Failed to create image blob.'));
        }, 'image/png');
      });

      const safeName = listRef.current.name.replace(/[^\w\u4e00-\u9fa5-]+/g, '-');
      const imageFile = new File([imageBlob], `${safeName || 'price-pilot'}.png`, { type: 'image/png' });

      if (navigator.canShare?.({ files: [imageFile] })) {
        await navigator.share({
          title: listRef.current.name,
          files: [imageFile],
        });
      } else {
        const imageUrl = URL.createObjectURL(imageBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = imageUrl;
        downloadLink.download = imageFile.name;
        downloadLink.click();
        URL.revokeObjectURL(imageUrl);
      }

      toast.success(t('shareImageSuccess'));
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Failed to share result image:', error);
        toast.error(t('shareImageError'));
      }
    } finally {
      setIsSharingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="theme-card p-4 sm:p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <div>
            <label htmlFor="list-name" className="block text-[11px] sm:text-xs font-semibold tracking-[0.12em] text-foreground mb-2">
              {t('listNameLabel')}
            </label>
            <input
              id="list-name"
              type="text"
              value={metadataDraft.name}
              onChange={(event) => setMetadataDraft((prev) => ({ ...prev, name: event.target.value }))}
              onBlur={commitMetadata}
              onKeyDown={(event) => event.key === 'Enter' && commitMetadata()}
              className="theme-input w-full text-base sm:text-lg font-bold"
              placeholder={t('listNamePlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="list-category" className="block text-[11px] sm:text-xs font-semibold tracking-[0.12em] text-foreground mb-2">
              {t('listCategoryLabel')}
            </label>
            <input
              id="list-category"
              type="text"
              value={metadataDraft.category}
              onChange={(event) => setMetadataDraft((prev) => ({ ...prev, category: event.target.value }))}
              onBlur={commitMetadata}
              onKeyDown={(event) => event.key === 'Enter' && commitMetadata()}
              className="theme-input w-full"
              placeholder={t('listCategoryPlaceholder')}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          {t('listUpdatedAt').replace('{date}', new Date(normalizedList.updatedAt).toLocaleString())}
        </p>
      </div>

      {activePanel === 'unit-manager' && (
        <div className="animate-fade-in">
          <UnitManager
            unitSystem={unitSystem}
            onUpdateUnits={(updatedSystem) => {
              pushListUpdate({ unitSystem: updatedSystem });
              toast.success(t('unitsUpdated'));
            }}
          />
        </div>
      )}

      {activePanel === 'converter' && (
        <div className="animate-fade-in">
          <UnitConverter unitSystem={unitSystem} />
        </div>
      )}

      <div className={`theme-card p-4 sm:p-5 relative ${products.length === 0 || highlightForm ? 'animate-form-focus' : ''}`}>
        <div className="absolute -top-3 -left-2 bg-secondary border-theme px-3 py-1 shadow-theme-sm transform -rotate-2 rounded-theme flex items-center gap-1">
          <Plus className="w-3 h-3" />
          <span className="font-semibold text-xs text-foreground">{t('addItem')}</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between mb-5">
          <div className="w-full sm:w-auto">
            <CurrencySelector
              onCurrencyChange={(currency) => pushListUpdate({ baseCurrency: currency })}
              defaultCurrency={baseCurrency}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <button
              type="button"
              onClick={() => setActivePanel(activePanel === 'converter' ? null : 'converter')}
              aria-label={t('unitConverter')}
              title={t('unitConverter')}
              className={`w-9 h-9 flex items-center justify-center border-theme transition-all duration-100 rounded-theme ${activePanel === 'converter'
                ? 'bg-secondary text-foreground shadow-none translate-x-[2px] translate-y-[2px]'
                : 'bg-surface text-foreground shadow-theme-sm hover:-translate-y-0.5 hover:shadow-theme-base'
                }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActivePanel(activePanel === 'unit-manager' ? null : 'unit-manager')}
              aria-label={t('unitManager')}
              title={t('unitManager')}
              className={`w-9 h-9 flex items-center justify-center border-theme transition-all duration-100 rounded-theme ${activePanel === 'unit-manager'
                ? 'bg-secondary text-foreground shadow-none translate-x-[2px] translate-y-[2px]'
                : 'bg-surface text-foreground shadow-theme-sm hover:-translate-y-0.5 hover:shadow-theme-base'
                }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
        <AddProductForm
          onAddProduct={handleAddProduct}
          unitSystem={unitSystem}
          defaultCurrency={baseCurrency}
          recentUnits={recentUnits}
        />
      </div>

      <div ref={resultsCaptureRef} className="mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 px-1">
          <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {t('results')}
          </h2>
          {products.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={handleShareLink}
                disabled={isSharingLink}
                className="theme-btn w-full sm:w-auto px-3 py-2 text-xs font-semibold bg-surface text-foreground inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Share2 className="w-3 h-3" />
                {isSharingLink ? t('shareActionBusy') : t('shareLinkAction')}
              </button>
              <button
                type="button"
                onClick={handleShareImage}
                disabled={isSharingImage}
                className="theme-btn w-full sm:w-auto px-3 py-2 text-xs font-semibold bg-surface text-foreground inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Download className="w-3 h-3" />
                {isSharingImage ? t('shareActionBusy') : t('shareImageAction')}
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                aria-label={t('clearAll')}
                className="theme-btn w-full sm:w-auto px-3 py-2 text-xs font-semibold bg-surface text-red-500 hover:text-red-600 transition-colors inline-flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3 h-3" />
                {t('clearAll')}
              </button>
            </div>
          )}
        </div>

        <ProductList
          products={products}
          baseCurrency={baseCurrency}
          onRemoveProduct={handleRemoveProduct}
          onUpdateProduct={handleUpdateProduct}
          onLoadSampleData={handleLoadSampleData}
          pendingProductIds={pendingProductIds}
          recentUnits={recentUnits}
          unitSystem={unitSystem}
        />
      </div>
    </div>
  );
}

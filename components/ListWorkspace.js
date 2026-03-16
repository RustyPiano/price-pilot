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
    <div className="panel flex min-w-[280px] items-center justify-between gap-4 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted">{description} {secondsLeft}s</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="btn btn-secondary whitespace-nowrap px-3 text-xs"
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
        backgroundColor: '#f6f3ee',
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
      <div className="panel space-y-4 p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <div>
            <label htmlFor="list-name" className="field-label">
              {t('listNameLabel')}
            </label>
            <input
              id="list-name"
              type="text"
              value={metadataDraft.name}
              onChange={(event) => setMetadataDraft((prev) => ({ ...prev, name: event.target.value }))}
              onBlur={commitMetadata}
              onKeyDown={(event) => event.key === 'Enter' && commitMetadata()}
              className="input text-base font-semibold sm:text-lg"
              placeholder={t('listNamePlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="list-category" className="field-label">
              {t('listCategoryLabel')}
            </label>
            <input
              id="list-category"
              type="text"
              value={metadataDraft.category}
              onChange={(event) => setMetadataDraft((prev) => ({ ...prev, category: event.target.value }))}
              onBlur={commitMetadata}
              onKeyDown={(event) => event.key === 'Enter' && commitMetadata()}
              className="input"
              placeholder={t('listCategoryPlaceholder')}
            />
          </div>
        </div>
        <p className="text-xs text-muted">
          {t('listUpdatedAt').replace('{date}', new Date(normalizedList.updatedAt).toLocaleString())}
        </p>
      </div>

      <div className={`panel space-y-4 p-4 sm:p-5 ${products.length === 0 || highlightForm ? 'panel-highlight' : ''}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="section-title flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand" />
              {t('addItem')}
            </h2>
            <p className="section-description">{t('addItemsToCompare')}</p>
          </div>

          <div className="w-full sm:w-auto">
            <CurrencySelector
              onCurrencyChange={(currency) => pushListUpdate({ baseCurrency: currency })}
              defaultCurrency={baseCurrency}
            />
          </div>
        </div>

        <AddProductForm
          onAddProduct={handleAddProduct}
          unitSystem={unitSystem}
          defaultCurrency={baseCurrency}
          recentUnits={recentUnits}
        />

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === 'converter' ? null : 'converter')}
            className={`btn text-sm ${activePanel === 'converter' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <ArrowLeftRight className="h-4 w-4" />
            {t('unitConverter')}
          </button>
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === 'unit-manager' ? null : 'unit-manager')}
            className={`btn text-sm ${activePanel === 'unit-manager' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Settings className="h-4 w-4" />
            {t('unitManager')}
          </button>
        </div>
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

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="section-title flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-brand" />
              {t('results')}
            </h2>
          </div>

          {products.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <button
                type="button"
                onClick={handleShareLink}
                disabled={isSharingLink}
                className="btn btn-secondary w-full text-sm sm:w-auto"
              >
                <Share2 className="h-4 w-4" />
                {isSharingLink ? t('shareActionBusy') : t('shareLinkAction')}
              </button>
              <button
                type="button"
                onClick={handleShareImage}
                disabled={isSharingImage}
                className="btn btn-secondary w-full text-sm sm:w-auto"
              >
                <Download className="h-4 w-4" />
                {isSharingImage ? t('shareActionBusy') : t('shareImageAction')}
              </button>
            </div>
          )}
        </div>

        <div ref={resultsCaptureRef} className="space-y-4">
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

        {products.length > 0 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleClearAll}
              aria-label={t('clearAll')}
              className="btn btn-danger w-full text-sm sm:w-auto"
            >
              <Trash2 className="h-4 w-4" />
              {t('clearAll')}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import AddProductForm from '@/components/AddProductForm';
import CurrencySelector from '@/components/CurrencySelector';
import ProductList from '@/components/ProductList';
import UnitManager from '@/components/UnitManager';
import UnitConverter from '@/components/UnitConverter';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { normalizeComparisonList, normalizeProduct } from '@/lib/comparison-lists';
import { encodeSharedComparisonList } from '@/lib/share-utils';
import { ArrowLeftRight, Settings, BarChart3, Plus, Trash2, Download, Copy, X } from 'lucide-react';
import type {
  ComparisonList,
  ComparisonListDraft,
  ImagePreview,
  ProductInput,
  TranslationSampleProduct,
  UnitSystem,
} from '@/types';

const DELETE_UNDO_DURATION = 5000;
const CLEAR_ALL_UNDO_DURATION = 8000;

interface UndoToastProps {
  title: string;
  description: string;
  expiresAt: number;
  actionLabel: string;
  onAction: () => void;
  onExpire?: () => void;
}

interface PendingDeleteEntry {
  timeoutId: number;
  toastId: string;
}

interface PendingClearEntry extends PendingDeleteEntry {
  productIds: string[];
}

interface ListWorkspaceProps {
  comparisonList: ComparisonList;
  onSaveList: (list: ComparisonList) => void;
}

type ActivePanel = 'converter' | 'unit-manager' | null;
type ListPatch = Partial<ComparisonList> | ((currentList: ComparisonList) => Partial<ComparisonList>);

function UndoToast({ title, description, expiresAt, actionLabel, onAction, onExpire }: UndoToastProps) {
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

export default function ListWorkspace({ comparisonList, onSaveList }: ListWorkspaceProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [highlightForm, setHighlightForm] = useState(false);
  const [pendingProductIds, setPendingProductIds] = useState<string[]>([]);
  const [metadataDraft, setMetadataDraft] = useState({ name: comparisonList.name, category: comparisonList.category || '' });
  const [isSharingLink, setIsSharingLink] = useState(false);
  const [isSharingImage, setIsSharingImage] = useState(false);
  const [manualShareUrl, setManualShareUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const pendingDeleteRef = useRef<Map<string, PendingDeleteEntry>>(new Map());
  const pendingClearRef = useRef<PendingClearEntry | null>(null);
  const listRef = useRef<ComparisonList>(normalizeComparisonList(comparisonList));
  const resultsCaptureRef = useRef<HTMLDivElement | null>(null);
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();

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

  useEffect(() => {
    if (!imagePreview?.url) {
      return undefined;
    }

    return () => {
      URL.revokeObjectURL(imagePreview.url);
    };
  }, [imagePreview?.url]);

  const pushListUpdate = (patch: ListPatch) => {
    const resolvedPatch = typeof patch === 'function' ? patch(listRef.current) : patch;
    const nextList = normalizeComparisonList({
      ...listRef.current,
      ...resolvedPatch,
      updatedAt: new Date().toISOString(),
    });

    listRef.current = nextList;
    onSaveList(nextList);
  };

  const promoteRecentUnit = (unit: string, sourceUnits = listRef.current.recentUnits) => {
    return [unit, ...sourceUnits.filter((item) => item !== unit)].slice(0, 6);
  };

  const dismissPendingDelete = (productId: string) => {
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

  const handleAddProduct = (product: ProductInput) => {
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

  const handleRemoveProduct = (productId: string) => {
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

  const handleUpdateProduct = (productId: string, updatedProduct: ProductInput) => {
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
    const sampleProducts = t('sampleProducts') as TranslationSampleProduct[];
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

  const closeManualShareModal = () => {
    setManualShareUrl('');
  };

  const closeImagePreview = () => {
    setImagePreview(null);
  };

  const handleShareLink = async () => {
    setIsSharingLink(true);
    let sharedUrl = '';

    try {
      sharedUrl = buildShareUrl();
      setManualShareUrl('');

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sharedUrl);
        toast.success(t('shareLinkSuccess'));
      } else {
        setManualShareUrl(sharedUrl);
      }
    } catch (error) {
      console.error('Failed to copy list link:', error);

      if (sharedUrl) {
        setManualShareUrl(sharedUrl);
      } else {
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
      const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
      const exportScale = isMobileViewport
        ? Math.min(window.devicePixelRatio || 1, 1.5)
        : 2;
      const canvas = await html2canvas(resultsCaptureRef.current, {
        backgroundColor: resolvedTheme === 'dark' ? '#0f1117' : '#f6f3ee',
        scale: exportScale,
        useCORS: true,
        logging: false,
      });

      const imageBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
            return;
          }

          reject(new Error('Failed to create image blob.'));
        }, 'image/png');
      });

      const safeName = listRef.current.name.replace(/[^\w\u4e00-\u9fa5-]+/g, '-');
      const fileName = `${safeName || 'price-pilot'}.png`;
      const imageUrl = URL.createObjectURL(imageBlob);

      setImagePreview({
        fileName,
        url: imageUrl,
      });
      toast.success(t('shareImageSuccess'));
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'AbortError') {
        console.error('Failed to share result image:', error);
        toast.error(t('shareImageError'));
      }
    } finally {
      setIsSharingImage(false);
    }
  };

  const handleDownloadPreviewImage = () => {
    if (!imagePreview?.url) {
      return;
    }

    const downloadLink = document.createElement('a');
    downloadLink.href = imagePreview.url;
    downloadLink.download = imagePreview.fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  };

  return (
    <>
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
                  <Copy className="h-4 w-4" />
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

      {manualShareUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[color:var(--overlay-backdrop)] px-4 py-6 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeManualShareModal();
            }
          }}
        >
          <div className="panel w-full max-w-lg space-y-4 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">{t('shareLinkFallbackTitle')}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{t('shareLinkFallbackBody')}</p>
              </div>
              <button
                type="button"
                onClick={closeManualShareModal}
                className="icon-btn h-10 w-10 flex-shrink-0"
                aria-label={t('closePreviewAction')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label htmlFor="manual-share-url" className="field-label">
              {t('shareLinkFieldLabel')}
            </label>
            <textarea
              id="manual-share-url"
              value={manualShareUrl}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
              className="input min-h-28 resize-none font-mono text-sm leading-6"
            />

            <p className="text-xs leading-5 text-muted">{t('shareLinkFallbackHint')}</p>
          </div>
        </div>
      )}

      {imagePreview && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] overflow-y-auto bg-[color:var(--overlay-backdrop)] px-4 py-6 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeImagePreview();
            }
          }}
        >
          <div className="mx-auto flex min-h-full max-w-4xl items-center justify-center">
            <div className="panel w-full space-y-4 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{t('shareImagePreviewTitle')}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{t('shareImagePreviewBody')}</p>
                </div>
                <button
                  type="button"
                  onClick={closeImagePreview}
                  className="icon-btn h-10 w-10 flex-shrink-0"
                  aria-label={t('closePreviewAction')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-hidden rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-2">
                <img
                  src={imagePreview.url}
                  alt={t('shareImagePreviewTitle')}
                  className="mx-auto h-auto max-h-[70vh] w-full rounded-[14px] object-contain"
                />
              </div>

              <p className="text-xs leading-5 text-muted">{t('shareImagePreviewHint')}</p>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeImagePreview}
                  className="btn btn-secondary text-sm"
                >
                  {t('closePreviewAction')}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPreviewImage}
                  className="btn btn-primary text-sm"
                >
                  <Download className="h-4 w-4" />
                  {t('shareImageDownloadAction')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

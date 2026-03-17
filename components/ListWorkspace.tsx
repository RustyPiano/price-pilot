import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import ListComposerPanel from '@/components/ListComposerPanel';
import ListMetadataEditor from '@/components/ListMetadataEditor';
import ShareImageModal from '@/components/ShareImageModal';
import ShareLinkModal from '@/components/ShareLinkModal';
import WorkspaceResultsSection from '@/components/WorkspaceResultsSection';
import { type ActivePanel } from '@/components/ToolPanel';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useListState } from '@/hooks/useListState';
import { useShareImage } from '@/hooks/useShareImage';
import { useShareLink } from '@/hooks/useShareLink';
import { useUndoDelete } from '@/hooks/useUndoDelete';
import { normalizeProduct } from '@/lib/comparison-lists';
import type { ComparisonList, TranslationSampleProduct } from '@/types';

interface ListWorkspaceProps {
  comparisonList: ComparisonList;
  onSaveList: (list: ComparisonList) => void;
}

export default function ListWorkspace({ comparisonList, onSaveList }: ListWorkspaceProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [highlightForm, setHighlightForm] = useState(false);
  const resultsCaptureRef = useRef<HTMLDivElement | null>(null);
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const {
    list,
    listRef,
    pushListUpdate,
    addProduct,
    updateProduct,
    updateMetadata,
    updateCurrency,
    updateUnits,
  } = useListState({ comparisonList, onSaveList });
  const { pendingProductIds, handleDeleteProduct, handleClearAll } = useUndoDelete({
    listId: list.id,
    listRef,
    pushListUpdate,
    t,
  });
  const { isSharingLink, manualShareUrl, closeManualShareModal, shareLink } = useShareLink({ listRef, t });
  const {
    isSharingImage,
    imagePreview,
    closeImagePreview,
    shareImage,
    handleDownloadPreviewImage,
  } = useShareImage({
    listRef,
    resultRef: resultsCaptureRef,
    resolvedTheme,
    t,
  });
  const { products, baseCurrency, unitSystem, recentUnits, updatedAt, name, category } = list;

  useEffect(() => {
    if (!highlightForm) return undefined;

    const timeoutId = window.setTimeout(() => {
      setHighlightForm(false);
    }, 1400);

    return () => window.clearTimeout(timeoutId);
  }, [highlightForm]);

  const handleLoadSampleData = () => {
    const sampleProducts = t('sampleProducts') as TranslationSampleProduct[];
    if (!Array.isArray(sampleProducts)) return;

    pushListUpdate((currentList) => ({
      products: sampleProducts.map((product, index) => normalizeProduct({
        ...product,
        currency: currentList.baseCurrency,
        timestamp: new Date(Date.now() + index).toISOString(),
      })),
      recentUnits: ['ml', 'l', ...currentList.recentUnits.filter((unit) => unit !== 'ml' && unit !== 'l')].slice(0, 6),
    }));
    setHighlightForm(true);
    toast.success(t('sampleDataLoaded'));
  };

  return (
    <>
      <div className="space-y-6">
        <ListMetadataEditor
          name={name}
          category={category}
          updatedAt={updatedAt}
          defaultName={t('defaultListName') || comparisonList.name}
          onCommit={(nextName, nextCategory) => {
            updateMetadata(nextName, nextCategory);
            toast.success(t('listUpdatedSuccess'));
          }}
        />

        <ListComposerPanel
          activePanel={activePanel}
          highlightForm={products.length === 0 || highlightForm}
          baseCurrency={baseCurrency}
          unitSystem={unitSystem}
          recentUnits={recentUnits}
          onAddProduct={(product) => {
            addProduct(product);
            toast.success(t('addedSuccess'));
          }}
          onCurrencyChange={updateCurrency}
          onTogglePanel={(panel) => setActivePanel(activePanel === panel ? null : panel)}
          onUpdateUnits={(updatedSystem) => {
            updateUnits(updatedSystem);
            toast.success(t('unitsUpdated'));
          }}
        />

        <WorkspaceResultsSection
          resultRef={resultsCaptureRef}
          productsCount={products.length}
          products={products}
          baseCurrency={baseCurrency}
          pendingProductIds={pendingProductIds}
          recentUnits={recentUnits}
          unitSystem={unitSystem}
          isSharingLink={isSharingLink}
          isSharingImage={isSharingImage}
          onShareLink={shareLink}
          onShareImage={shareImage}
          onRemoveProduct={handleDeleteProduct}
          onUpdateProduct={(productId, product) => {
            updateProduct(productId, product);
            toast.success(t('updatedSuccess'));
          }}
          onLoadSampleData={handleLoadSampleData}
          onClearAll={handleClearAll}
        />
      </div>

      {manualShareUrl && <ShareLinkModal url={manualShareUrl} onClose={closeManualShareModal} />}
      {imagePreview && (
        <ShareImageModal
          imagePreview={imagePreview}
          onClose={closeImagePreview}
          onDownload={handleDownloadPreviewImage}
        />
      )}
    </>
  );
}

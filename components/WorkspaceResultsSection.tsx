import type { RefObject } from 'react';
import ProductList from '@/components/ProductList';
import { useLanguage } from '@/context/LanguageContext';
import { BarChart3, Copy, Download, Trash2 } from 'lucide-react';
import type { ProductInput, UnitSystem } from '@/types';

interface WorkspaceResultsSectionProps {
  resultRef: RefObject<HTMLDivElement | null>;
  productsCount: number;
  products: Parameters<typeof ProductList>[0]['products'];
  baseCurrency: string;
  pendingProductIds: string[];
  recentUnits: string[];
  unitSystem: UnitSystem;
  isSharingLink: boolean;
  isSharingImage: boolean;
  onShareLink: () => void;
  onShareImage: () => void;
  onRemoveProduct: (productId: string) => void;
  onUpdateProduct: (productId: string, product: ProductInput) => void;
  onLoadSampleData: () => void;
  onClearAll: () => void;
}

export default function WorkspaceResultsSection({
  resultRef,
  productsCount,
  products,
  baseCurrency,
  pendingProductIds,
  recentUnits,
  unitSystem,
  isSharingLink,
  isSharingImage,
  onShareLink,
  onShareImage,
  onRemoveProduct,
  onUpdateProduct,
  onLoadSampleData,
  onClearAll,
}: WorkspaceResultsSectionProps) {
  const { t } = useLanguage();

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="section-title flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand" />
            {t('results')}
          </h2>
        </div>

        {productsCount > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <button
              type="button"
              onClick={onShareLink}
              disabled={isSharingLink}
              className="btn btn-secondary w-full text-sm sm:w-auto"
            >
              <Copy className="h-4 w-4" />
              {isSharingLink ? t('shareActionBusy') : t('shareLinkAction')}
            </button>
            <button
              type="button"
              onClick={onShareImage}
              disabled={isSharingImage}
              className="btn btn-secondary w-full text-sm sm:w-auto"
            >
              <Download className="h-4 w-4" />
              {isSharingImage ? t('shareActionBusy') : t('shareImageAction')}
            </button>
          </div>
        )}
      </div>

      <div ref={resultRef} className="space-y-4">
        <ProductList
          products={products}
          baseCurrency={baseCurrency}
          onRemoveProduct={onRemoveProduct}
          onUpdateProduct={onUpdateProduct}
          onLoadSampleData={onLoadSampleData}
          pendingProductIds={pendingProductIds}
          recentUnits={recentUnits}
          unitSystem={unitSystem}
        />
      </div>

      {productsCount > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClearAll}
            aria-label={t('clearAll')}
            className="btn btn-danger w-full text-sm sm:w-auto"
          >
            <Trash2 className="h-4 w-4" />
            {t('clearAll')}
          </button>
        </div>
      )}
    </section>
  );
}

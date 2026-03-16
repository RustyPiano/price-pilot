import { useState, useEffect, useMemo } from 'react';
import { fetchExchangeRates } from '../constants/currencies';
import ProductEditorForm from './ProductEditorForm';
import PriceComparisonBars from './PriceComparisonBars';
import SavingsCalculator from './SavingsCalculator';
import { useLanguage } from '../context/LanguageContext';
import { enrichProducts, getNumberLocale, groupProductsByUnitType } from '../lib/comparison-math';
import { X, Trophy, TrendingDown, ShoppingCart, Pencil, Sparkles, AlertTriangle, RotateCw, WifiOff } from 'lucide-react';

const getPriceDifferenceDisplay = (sortedProducts) => {
  if (sortedProducts.length < 2) return null;

  const lowestPrice = sortedProducts[0].unitPrice;
  const highestPrice = sortedProducts[sortedProducts.length - 1].unitPrice;

  if (lowestPrice === 0) {
    return highestPrice === 0 ? '0%' : '∞';
  }

  return `${((highestPrice / lowestPrice - 1) * 100).toFixed(0)}%`;
};

export default function ProductList({
  products,
  baseCurrency,
  onRemoveProduct,
  onUpdateProduct,
  onLoadSampleData,
  pendingProductIds = [],
  recentUnits = [],
  unitSystem,
}) {
  const [exchangeRates, setExchangeRates] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isUsingCachedRates, setIsUsingCachedRates] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [editingProductId, setEditingProductId] = useState(null);
  const [comparisonMode, setComparisonMode] = useState('grouped');
  const { t, locale } = useLanguage();
  const numberLocale = getNumberLocale(locale);
  const hasProducts = products.length > 0;

  useEffect(() => {
    if (!hasProducts) {
      setIsLoading(false);
      setLoadError(null);
      setIsUsingCachedRates(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, 10000);
    const cacheKey = `exchangeRates:${baseCurrency}`;

    const getLatestRates = async () => {
      setIsLoading(true);
      setLoadError(null);
      setIsUsingCachedRates(false);

      try {
        const rates = await fetchExchangeRates(baseCurrency, { signal: controller.signal });
        setExchangeRates(rates);
        window.localStorage.setItem(cacheKey, JSON.stringify({
          rates,
          savedAt: new Date().toISOString(),
        }));
      } catch (error) {
        const cachedRates = (() => {
          try {
            const cachedValue = window.localStorage.getItem(cacheKey);
            if (!cachedValue) return null;

            const parsedValue = JSON.parse(cachedValue);
            return parsedValue?.rates || null;
          } catch (cacheError) {
            console.error('Failed to read cached exchange rates:', cacheError);
            return null;
          }
        })();

        if (cachedRates) {
          setExchangeRates(cachedRates);
          setIsUsingCachedRates(true);
          setLoadError(t('usingCachedRates'));
        } else if (!controller.signal.aborted) {
          setExchangeRates(null);
          setLoadError(error.name === 'AbortError' ? t('fetchRatesTimeout') : t('fetchRatesFail'));
        }
      }

      setIsLoading(false);
    };

    getLatestRates();

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [baseCurrency, retryCount, hasProducts, t]);

  const enrichedProducts = useMemo(
    () => enrichProducts(products, exchangeRates, baseCurrency, unitSystem),
    [products, exchangeRates, baseCurrency, unitSystem]
  );

  const groupedProducts = useMemo(
    () => groupProductsByUnitType(enrichedProducts),
    [enrichedProducts]
  );

  const allSortedProducts = useMemo(
    () => [...enrichedProducts].sort((left, right) => left.unitPrice - right.unitPrice),
    [enrichedProducts]
  );

  const hasMixedGroups = groupedProducts.length > 1;

  const displayedGroups = useMemo(() => {
    if (comparisonMode === 'combined' && hasMixedGroups) {
      return [
        {
          unitType: 'combined',
          baseUnit: null,
          products: allSortedProducts,
        },
      ];
    }

    return groupedProducts;
  }, [comparisonMode, hasMixedGroups, allSortedProducts, groupedProducts]);

  const formatPrice = (price) => new Intl.NumberFormat(numberLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);

  const formatGroupCount = (count) => (
    locale === 'zh' ? `${count} 个商品` : `${count} item${count === 1 ? '' : 's'}`
  );

  const handleEditSubmit = (productId, updatedProduct) => {
    onUpdateProduct(productId, updatedProduct);
    setEditingProductId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="panel space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="skeleton-block h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton-block h-4 w-1/3" />
                <div className="skeleton-block h-3 w-1/2" />
              </div>
              <div className="w-full space-y-2 sm:w-20">
                <div className="skeleton-block h-4 w-full" />
                <div className="skeleton-block h-3 w-2/3" />
              </div>
            </div>
          </div>
        ))}
        <p className="text-center text-sm font-medium text-muted">{t('loadingRates')}</p>
      </div>
    );
  }

  if (loadError && !exchangeRates) {
    return (
      <div className="panel flex flex-col items-center gap-4 p-6 text-center animate-fade-in">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-100 text-danger">
          <WifiOff className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold text-foreground">{t('ratesErrorTitle')}</p>
          <p className="text-sm leading-6 text-muted">{loadError}</p>
          <p className="text-xs leading-5 text-muted">{t('ratesErrorBody')}</p>
        </div>
        <button
          type="button"
          onClick={() => setRetryCount((prev) => prev + 1)}
          className="btn btn-primary px-5 text-sm"
        >
          <RotateCw className="h-4 w-4" />
          {t('retryFetchRates')}
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="panel flex flex-col items-center gap-4 p-6 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-100 text-brand">
          <ShoppingCart className="h-8 w-8" strokeWidth={1.8} />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-foreground">{t('emptyStateTitle')}</p>
          <p className="section-description max-w-md">{t('emptyStateDescription')}</p>
          <p className="text-xs leading-5 text-muted">{t('emptyStateHint')}</p>
        </div>
        <button
          type="button"
          onClick={onLoadSampleData}
          className="btn btn-primary px-5 text-sm"
        >
          <Sparkles className="h-4 w-4" />
          {t('trySampleData')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isUsingCachedRates && (
        <div className="notice notice-warning flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">{t('usingCachedRatesTitle')}</p>
            <p className="mt-1 text-sm text-muted">{loadError}</p>
          </div>
          <button
            type="button"
            onClick={() => setRetryCount((prev) => prev + 1)}
            className="btn btn-secondary text-sm"
          >
            <RotateCw className="h-4 w-4" />
            {t('retryFetchRates')}
          </button>
        </div>
      )}

      {hasMixedGroups && (
        <div className="notice notice-warning flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
            <div>
              <p className="font-semibold text-foreground">{t('groupingNoticeTitle')}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{t('groupingNoticeBody')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setComparisonMode((prev) => (prev === 'grouped' ? 'combined' : 'grouped'))}
            className="btn btn-secondary text-sm"
          >
            {comparisonMode === 'grouped' ? t('compareAllGroups') : t('splitByType')}
          </button>
        </div>
      )}

      {displayedGroups.map((group) => {
        const priceDifferenceDisplay = getPriceDifferenceDisplay(group.products);
        const isCombinedGroup = group.unitType === 'combined';

        return (
          <section key={group.unitType} className="space-y-3">
            {hasMixedGroups && (
              <div className="px-1">
                <h3 className="text-base font-semibold text-foreground sm:text-lg">
                  {isCombinedGroup
                    ? t('combinedComparisonTitle')
                    : t(`unitTypes.${group.unitType}`) || group.unitType}
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {isCombinedGroup
                    ? t('combinedComparisonBody')
                    : `${formatGroupCount(group.products.length)} · /${t(`units.${group.baseUnit}`) || group.baseUnit}`}
                </p>
              </div>
            )}

            {group.products.map((product, index) => {
              const isPending = pendingProductIds.includes(product.id);
              const isEditing = editingProductId === product.id;
              const actionsDisabled = (editingProductId !== null && !isEditing) || isPending;

              if (isEditing) {
                return (
                  <div key={product.id} className="panel space-y-4 p-4 sm:p-5 animate-fade-in">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t('editingItem')}</p>
                        <p className="text-xs leading-5 text-muted">
                          {t(`unitTypes.${product.unitType}`) || product.unitType}
                        </p>
                      </div>
                      <span className="rank-chip">#{index + 1}</span>
                    </div>
                    <ProductEditorForm
                      initialProduct={product}
                      unitSystem={unitSystem}
                      defaultCurrency={product.currency}
                      recentUnits={recentUnits}
                      submitLabel={t('saveChanges')}
                      onSubmit={(updatedProduct) => handleEditSubmit(product.id, updatedProduct)}
                      onCancel={() => setEditingProductId(null)}
                      autoFocus
                      compact
                    />
                  </div>
                );
              }

              return (
                <article
                  key={product.id}
                  className={`panel relative overflow-hidden p-4 sm:p-5 ${isPending ? 'opacity-60' : ''}`}
                >
                  {index === 0 && (
                    <div className="absolute inset-y-0 left-0 w-1 bg-brand" aria-hidden="true" />
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                      <span className={`rank-chip ${index === 0 ? 'rank-chip-best' : ''}`}>
                        #{index + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-foreground sm:text-base">{product.name}</span>
                          {index === 0 && (
                            <span className="pill-brand">
                              <Trophy className="h-3 w-3" />
                              {t('bestDeal')}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs font-medium leading-5 text-muted">
                          {product.price} {product.currency} / {product.quantity}{t(`units.${product.unit}`) || product.unit}
                        </div>
                      </div>
                    </div>

                    <div
                      className="flex w-full items-center justify-between gap-3 border-t pt-3 sm:ml-4 sm:w-auto sm:justify-end sm:border-t-0 sm:pt-0"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <div className="mr-1 text-left sm:text-right">
                        <div className="text-lg font-semibold text-foreground">
                          {formatPrice(product.unitPrice)}
                        </div>
                        <div className="text-xs font-medium text-muted">
                          /{t(`units.${product.baseUnit}`) || product.baseUnit}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingProductId(product.id)}
                          disabled={actionsDisabled}
                          aria-label={t('editItem')}
                          className="icon-btn"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveProduct(product.id)}
                          disabled={actionsDisabled}
                          aria-label={locale === 'zh' ? '删除商品' : 'Delete item'}
                          className="icon-btn icon-btn-danger"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {group.products.length >= 2 && priceDifferenceDisplay && (
              <div className="notice notice-danger items-center justify-center">
                <p className="flex items-center justify-center gap-2 text-sm font-medium leading-6 text-foreground">
                  <TrendingDown className="h-4 w-4 text-danger" />
                  {t('priceDifference')}
                  <span className="text-lg font-semibold text-danger">
                    {priceDifferenceDisplay}
                  </span>
                </p>
              </div>
            )}

            <PriceComparisonBars
              group={group}
              baseCurrency={baseCurrency}
              locale={locale}
              t={t}
            />

            <SavingsCalculator
              group={group}
              baseCurrency={baseCurrency}
              locale={locale}
              t={t}
            />
          </section>
        );
      })}
    </div>
  );
}

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
  unitSystem
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
  }, [baseCurrency, retryCount, hasProducts]);

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
    maximumFractionDigits: 2
  }).format(price);

  const formatGroupCount = (count) => (
    locale === 'zh' ? `${count} 个商品` : `${count} item${count === 1 ? '' : 's'}`
  );

  const getBadgeColor = (index) => {
    if (index === 0) return 'bg-primary text-foreground border-theme';
    return 'bg-surface text-foreground border-theme';
  };

  const handleEditSubmit = (productId, updatedProduct) => {
    onUpdateProduct(productId, updatedProduct);
    setEditingProductId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[0, 1, 2].map((item) => (
          <div key={item} className="theme-card p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="h-10 w-10 rounded-theme bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-gray-200 rounded" />
                <div className="h-3 w-1/2 bg-gray-100 rounded" />
              </div>
              <div className="w-full space-y-2 sm:w-20">
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        ))}
        <p className="text-center text-sm text-gray-500 font-medium">{t('loadingRates')}</p>
      </div>
    );
  }

  if (loadError && !exchangeRates) {
    return (
        <div className="theme-card flex flex-col items-center gap-4 p-6 text-center animate-fade-in">
        <div className="w-14 h-14 bg-surface border-theme shadow-theme-sm rounded-theme flex items-center justify-center">
          <WifiOff className="w-6 h-6 text-accent" />
        </div>
          <div className="space-y-1">
            <p className="text-lg font-bold text-foreground">{t('ratesErrorTitle')}</p>
            <p className="text-sm leading-6 text-gray-500">{loadError}</p>
            <p className="text-xs leading-5 text-gray-500">{t('ratesErrorBody')}</p>
          </div>
          <button
            type="button"
            onClick={() => setRetryCount((prev) => prev + 1)}
            className="theme-btn theme-btn-primary inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold tracking-[0.08em]"
          >
            <RotateCw className="w-4 h-4" />
            {t('retryFetchRates')}
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
        <div className="theme-card flex flex-col items-center gap-4 p-6 text-center animate-fade-in">
        <div className="w-16 h-16 bg-surface border-theme shadow-theme-sm rounded-theme flex items-center justify-center">
          <ShoppingCart className="w-8 h-8 text-foreground" strokeWidth={1.8} />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-bold text-foreground">{t('emptyStateTitle')}</p>
          <p className="max-w-md text-sm leading-6 text-gray-500">{t('emptyStateDescription')}</p>
          <p className="text-xs leading-5 text-gray-500">{t('emptyStateHint')}</p>
        </div>
        <button
          type="button"
          onClick={onLoadSampleData}
          className="theme-btn theme-btn-primary inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold tracking-[0.08em]"
        >
          <Sparkles className="w-4 h-4" />
          {t('trySampleData')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isUsingCachedRates && (
        <div className="theme-card p-4 bg-amber-50/80 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">{t('usingCachedRatesTitle')}</p>
            <p className="text-sm text-gray-600">{loadError}</p>
          </div>
          <button
            type="button"
            onClick={() => setRetryCount((prev) => prev + 1)}
            className="theme-btn px-4 py-2 text-sm font-semibold bg-surface text-foreground inline-flex items-center gap-2"
          >
            <RotateCw className="w-4 h-4" />
            {t('retryFetchRates')}
          </button>
        </div>
      )}

      {hasMixedGroups && (
        <div className="theme-card p-4 bg-amber-50/80 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-foreground">{t('groupingNoticeTitle')}</p>
              <p className="text-sm leading-6 text-gray-600">{t('groupingNoticeBody')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setComparisonMode((prev) => prev === 'grouped' ? 'combined' : 'grouped')}
            className="theme-btn px-4 py-2 text-sm font-semibold bg-surface text-foreground"
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
              <div className="flex flex-col gap-1 px-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    {isCombinedGroup
                      ? t('combinedComparisonTitle')
                      : t(`unitTypes.${group.unitType}`) || group.unitType}
                  </h3>
                  <p className="text-xs leading-5 text-gray-500">
                    {isCombinedGroup
                      ? t('combinedComparisonBody')
                      : `${formatGroupCount(group.products.length)} · /${t(`units.${group.baseUnit}`) || group.baseUnit}`}
                  </p>
                </div>
              </div>
            )}

            {group.products.map((product, index) => {
              const isPending = pendingProductIds.includes(product.id);
              const isEditing = editingProductId === product.id;
              const actionsDisabled = (editingProductId !== null && !isEditing) || isPending;

              if (isEditing) {
                return (
                  <div
                    key={product.id}
                    className="theme-card p-4 sm:p-5 border-theme shadow-theme-lg animate-fade-in"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t('editingItem')}</p>
                        <p className="text-xs leading-5 text-gray-500">
                          {t(`unitTypes.${product.unitType}`) || product.unitType}
                        </p>
                      </div>
                      <span className="text-xs font-semibold bg-secondary text-white px-2 py-1 rounded-theme">
                        #{index + 1}
                      </span>
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
                <div
                  key={product.id}
                  className={`rounded-theme border-theme p-4 transition-all duration-200 sm:p-5 ${index === 0
                    ? 'bg-surface shadow-theme-base hover:-translate-y-1 hover:shadow-theme-lg'
                    : 'bg-surface hover:shadow-theme-base hover:-translate-y-1'
                    } ${isPending ? 'opacity-60' : ''}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                    <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-theme text-sm font-bold shadow-theme-sm ${getBadgeColor(index)}`}>
                      #{index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground sm:text-base">{product.name}</span>
                        {index === 0 && (
                          <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-theme border-theme bg-primary px-2 py-0.5 text-[11px] font-semibold text-foreground shadow-theme-sm sm:text-xs">
                            <Trophy className="w-3 h-3" />
                            {t('bestDeal')}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] font-medium leading-5 text-gray-500 sm:text-xs">
                        {product.price} {product.currency} / {product.quantity}{t(`units.${product.unit}`) || product.unit}
                      </div>
                    </div>
                    </div>

                  <div className="flex w-full items-center justify-between gap-3 border-t border-black/5 pt-3 sm:ml-4 sm:w-auto sm:justify-end sm:border-t-0 sm:pt-0">
                    <div className="mr-1 text-left sm:text-right">
                      <div className={`text-base font-bold sm:text-lg ${index === 0 ? 'text-foreground' : 'text-gray-600'}`}>
                        {formatPrice(product.unitPrice)}
                      </div>
                      <div className="text-[11px] font-medium text-gray-500 sm:text-xs">
                        /{t(`units.${product.baseUnit}`) || product.baseUnit}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingProductId(product.id)}
                        disabled={actionsDisabled}
                        aria-label={t('editItem')}
                        className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center text-gray-400 hover:text-foreground hover:bg-gray-100 transition-colors rounded-theme hover:shadow-theme-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveProduct(product.id)}
                        disabled={actionsDisabled}
                        aria-label={locale === 'zh' ? '删除商品' : 'Delete item'}
                        className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-theme hover:shadow-theme-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  </div>
                </div>
              );
            })}

            {group.products.length >= 2 && priceDifferenceDisplay && (
              <div className="mt-4 rounded-theme border-theme bg-red-50 p-4 text-center shadow-theme-base">
                <p className="flex items-center justify-center gap-2 text-sm font-medium leading-6 text-foreground">
                  <TrendingDown className="w-4 h-4 text-accent" />
                  {t('priceDifference')}
                  <span className="text-lg font-bold text-accent">
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

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
          <div key={item} className="theme-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-theme bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-gray-200 rounded" />
                <div className="h-3 w-1/2 bg-gray-100 rounded" />
              </div>
              <div className="w-20 space-y-2">
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
      <div className="theme-card p-6 flex flex-col items-center text-center gap-4 animate-fade-in">
        <div className="w-14 h-14 bg-surface border-theme shadow-theme-sm rounded-theme flex items-center justify-center">
          <WifiOff className="w-6 h-6 text-accent" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-bold text-foreground">{t('ratesErrorTitle')}</p>
          <p className="text-sm text-gray-500">{loadError}</p>
          <p className="text-xs text-gray-500">{t('ratesErrorBody')}</p>
        </div>
        <button
          type="button"
          onClick={() => setRetryCount((prev) => prev + 1)}
          className="theme-btn theme-btn-primary px-5 py-3 text-sm uppercase tracking-wide inline-flex items-center gap-2"
        >
          <RotateCw className="w-4 h-4" />
          {t('retryFetchRates')}
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="theme-card p-6 text-center flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-16 h-16 bg-surface border-theme shadow-theme-sm rounded-theme flex items-center justify-center">
          <ShoppingCart className="w-8 h-8 text-foreground" strokeWidth={1.8} />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-bold text-foreground">{t('emptyStateTitle')}</p>
          <p className="text-sm text-gray-500 max-w-md">{t('emptyStateDescription')}</p>
          <p className="text-xs text-gray-500">{t('emptyStateHint')}</p>
        </div>
        <button
          type="button"
          onClick={onLoadSampleData}
          className="theme-btn theme-btn-primary px-5 py-3 text-sm uppercase tracking-wide inline-flex items-center gap-2"
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
              <p className="text-sm text-gray-600">{t('groupingNoticeBody')}</p>
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
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="font-bold text-foreground">
                    {isCombinedGroup
                      ? t('combinedComparisonTitle')
                      : t(`unitTypes.${group.unitType}`) || group.unitType}
                  </h3>
                  <p className="text-xs text-gray-500">
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
                    className="theme-card p-4 border-theme shadow-theme-lg animate-fade-in"
                  >
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t('editingItem')}</p>
                        <p className="text-xs text-gray-500">
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
                  className={`flex items-center justify-between p-4 border-theme transition-all duration-200 rounded-theme ${index === 0
                    ? 'bg-surface shadow-theme-base hover:-translate-y-1 hover:shadow-theme-lg'
                    : 'bg-surface hover:shadow-theme-base hover:-translate-y-1'
                    } ${isPending ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`flex-shrink-0 w-9 h-9 flex items-center justify-center text-sm font-bold shadow-theme-sm rounded-theme ${getBadgeColor(index)}`}>
                      #{index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base text-foreground truncate">{product.name}</span>
                        {index === 0 && (
                          <span className="flex-shrink-0 text-xs font-semibold bg-primary text-foreground px-2 py-0.5 border-theme uppercase shadow-theme-sm rounded-theme inline-flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            {t('bestDeal')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-medium font-mono">
                        {product.price} {product.currency} / {product.quantity}{t(`units.${product.unit}`) || product.unit}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <div className="text-right mr-1">
                      <div className={`font-bold text-lg ${index === 0 ? 'text-foreground' : 'text-gray-600'}`}>
                        {formatPrice(product.unitPrice)}
                      </div>
                      <div className="text-xs text-gray-500 font-medium">
                        /{t(`units.${product.baseUnit}`) || product.baseUnit}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditingProductId(product.id)}
                      disabled={actionsDisabled}
                      aria-label={t('editItem')}
                      className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-foreground hover:bg-gray-100 transition-colors rounded-theme hover:shadow-theme-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveProduct(product.id)}
                      disabled={actionsDisabled}
                      aria-label={locale === 'zh' ? '删除商品' : 'Delete item'}
                      className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-theme hover:shadow-theme-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {group.products.length >= 2 && priceDifferenceDisplay && (
              <div className="mt-4 p-4 bg-red-50 border-theme shadow-theme-base text-center rounded-theme">
                <p className="text-sm font-medium text-foreground flex items-center justify-center gap-2">
                  <TrendingDown className="w-4 h-4 text-accent" />
                  {t('priceDifference')}
                  <span className="text-accent font-bold text-lg">
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

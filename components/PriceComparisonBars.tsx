import { formatCurrencyAmount, getProductDisplayMeta } from '@/lib/comparison-math';
import type { Locale, ProductGroup, Translate } from '@/types';

interface PriceComparisonBarsProps {
  group: ProductGroup;
  baseCurrency: string;
  locale: Locale;
  t: Translate;
}

export default function PriceComparisonBars({
  group,
  baseCurrency,
  locale,
  t,
}: PriceComparisonBarsProps) {
  if (group.products.length < 2) {
    return null;
  }

  const highestPrice = Math.max(...group.products.map((product) => product.unitPrice));

  return (
    <div className="panel space-y-3 p-4 sm:p-5">
      <div>
        <h4 className="text-sm font-semibold text-foreground sm:text-base">{t('comparisonChartTitle')}</h4>
        <p className="text-xs leading-5 text-muted">{t('comparisonChartBody')}</p>
      </div>

      <div className="space-y-3">
        {group.products.map((product, index) => {
          const { quantityLabel } = getProductDisplayMeta(product, locale);
          const width = highestPrice === 0 ? 0 : (product.unitPrice / highestPrice) * 100;
          const barClassName = index === 0
            ? 'is-best'
            : index === group.products.length - 1
              ? 'is-worst'
              : 'is-mid';

          return (
            <div key={product.id} className="space-y-1.5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex flex-wrap items-center gap-2">
                  <span className="max-w-full break-words text-sm font-medium text-foreground">{product.name}</span>
                  <span className="pill-muted">
                    {quantityLabel}
                  </span>
                </div>
                <span className="text-xs leading-5 text-muted sm:whitespace-nowrap">
                  {formatCurrencyAmount(product.unitPrice, baseCurrency, locale)}/{t(`units.${product.baseUnit}`) || product.baseUnit}
                </span>
              </div>
              <div className="result-bar-track">
                <div
                  className={`result-bar-fill ${barClassName}`}
                  style={{ width: `${Math.max(width, 6)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

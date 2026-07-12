import { getNumberLocale, getProductDisplayMeta } from '@/lib/comparison-math';
import { formatUnitPrice } from '@/lib/quick-compare';
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
  const currencySymbol =
    new Intl.NumberFormat(getNumberLocale(locale), { style: 'currency', currency: baseCurrency })
      .formatToParts(1)
      .find((part) => part.type === 'currency')?.value ?? baseCurrency;

  return (
    <div className="space-y-3 px-1">
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
                <span
                  className="text-xs leading-5 text-muted sm:whitespace-nowrap"
                  style={{ fontFamily: 'var(--font-num)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {currencySymbol}{formatUnitPrice(product.unitPrice)}/{t(`units.${product.baseUnit}`) || product.baseUnit}
                </span>
              </div>
              {/* 名称与单价已是可见文本, 条形本身纯装饰。 */}
              <div className="result-bar-track" aria-hidden="true">
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

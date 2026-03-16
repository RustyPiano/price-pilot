import { formatCurrencyAmount } from '../lib/comparison-math';

export default function PriceComparisonBars({ group, baseCurrency, locale, t }) {
  if (group.products.length < 2) {
    return null;
  }

  const highestPrice = Math.max(...group.products.map((product) => product.unitPrice));

  return (
    <div className="theme-card p-4 space-y-3">
      <div>
        <h4 className="font-semibold text-foreground">{t('comparisonChartTitle')}</h4>
        <p className="text-xs text-gray-500">{t('comparisonChartBody')}</p>
      </div>

      <div className="space-y-3">
        {group.products.map((product, index) => {
          const width = highestPrice === 0 ? 0 : (product.unitPrice / highestPrice) * 100;
          const barClassName = index === 0
            ? 'bg-emerald-500'
            : index === group.products.length - 1
              ? 'bg-rose-500'
              : 'bg-slate-400';

          return (
            <div key={product.id} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-foreground truncate">{product.name}</span>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatCurrencyAmount(product.unitPrice, baseCurrency, locale)}/{t(`units.${product.baseUnit}`) || product.baseUnit}
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barClassName} transition-all duration-300`}
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

import { useEffect, useMemo, useState } from 'react';
import { formatCurrencyAmount, getProductDisplayMeta } from '@/lib/comparison-math';
import type { Locale, ProductGroup, Translate } from '@/types';

const getDefaultConsumption = (unitType: string) => (unitType === 'piece' ? '10' : '1');

interface SavingsCalculatorProps {
  group: ProductGroup;
  baseCurrency: string;
  locale: Locale;
  t: Translate;
}

export default function SavingsCalculator({
  group,
  baseCurrency,
  locale,
  t,
}: SavingsCalculatorProps) {
  const [monthlyConsumption, setMonthlyConsumption] = useState(getDefaultConsumption(group.unitType));

  useEffect(() => {
    setMonthlyConsumption(getDefaultConsumption(group.unitType));
  }, [group.unitType]);

  const calculation = useMemo(() => {
    if (group.unitType === 'combined' || group.products.length < 2) {
      return null;
    }

    const usage = parseFloat(monthlyConsumption);
    if (Number.isNaN(usage) || usage <= 0) {
      return null;
    }

    const bestProduct = group.products[0];
    const priciestProduct = group.products[group.products.length - 1];
    if (!bestProduct || !priciestProduct) {
      return null;
    }

    const monthlySavings = Math.max(0, (priciestProduct.unitPrice - bestProduct.unitPrice) * usage);
    const annualSavings = monthlySavings * 12;
    const savingsPercent = priciestProduct.unitPrice === 0
      ? 0
      : ((priciestProduct.unitPrice - bestProduct.unitPrice) / priciestProduct.unitPrice) * 100;
    const finishDays = usage === 0 ? null : (bestProduct.standardQuantity / usage) * 30;

    return {
      bestProduct,
      priciestProduct,
      usage,
      monthlySavings,
      annualSavings,
      savingsPercent,
      finishDays,
    };
  }, [group, monthlyConsumption]);

  if (group.products.length < 2 || group.unitType === 'combined') {
    return null;
  }

  return (
    <div className="panel space-y-4 p-4 sm:p-5">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground sm:text-base">{t('savingsCalculatorTitle')}</h4>
        <p className="text-sm leading-6 text-muted">
          {calculation
            ? t('savingsCalculatorSummary')
              .replace('{best}', getProductDisplayMeta(calculation.bestProduct, locale).displayName)
              .replace('{worst}', getProductDisplayMeta(calculation.priciestProduct, locale).displayName)
            : t('savingsCalculatorHint')}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor={`monthly-consumption-${group.unitType}`} className="field-label">
          {t('monthlyConsumptionLabel')} ({t(`units.${group.baseUnit}`) || group.baseUnit})
        </label>
        <input
          id={`monthly-consumption-${group.unitType}`}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={monthlyConsumption}
          onChange={(event) => setMonthlyConsumption(event.target.value)}
          className="input text-base font-medium"
        />
      </div>

      {calculation && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="subpanel p-3">
              <p className="text-xs font-medium text-muted">{t('monthlySavingsLabel')}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrencyAmount(calculation.monthlySavings, baseCurrency, locale)}</p>
            </div>
            <div className="subpanel p-3">
              <p className="text-xs font-medium text-muted">{t('annualSavingsLabel')}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrencyAmount(calculation.annualSavings, baseCurrency, locale)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium text-foreground">
              <span>{t('savingsRateLabel')}</span>
              <span>{calculation.savingsPercent.toFixed(0)}%</span>
            </div>
            <div className="result-bar-track">
              <div
                className="result-bar-fill is-best"
                style={{ width: `${Math.min(Math.max(calculation.savingsPercent, 4), 100)}%` }}
              />
            </div>
          </div>

          {typeof calculation.finishDays === 'number' && Number.isFinite(calculation.finishDays) && (
            <p className="text-sm leading-6 text-muted">
              {t('finishUsageHint')
                .replace('{name}', getProductDisplayMeta(calculation.bestProduct, locale).displayName)
                .replace('{days}', calculation.finishDays.toFixed(1))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { formatCurrencyAmount } from '../lib/comparison-math';

const getDefaultConsumption = (unitType) => unitType === 'piece' ? '10' : '1';

export default function SavingsCalculator({ group, baseCurrency, locale, t }) {
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
    <div className="theme-card p-4 space-y-4">
      <div className="space-y-1">
        <h4 className="font-semibold text-foreground">{t('savingsCalculatorTitle')}</h4>
        <p className="text-sm text-gray-600">
          {calculation
            ? t('savingsCalculatorSummary')
              .replace('{best}', calculation.bestProduct.name)
              .replace('{worst}', calculation.priciestProduct.name)
            : t('savingsCalculatorHint')}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor={`monthly-consumption-${group.unitType}`} className="block text-xs font-semibold uppercase tracking-wide text-foreground">
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
          className="theme-input w-full text-base font-medium"
        />
      </div>

      {calculation && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-theme border-theme bg-surface p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{t('monthlySavingsLabel')}</p>
              <p className="text-lg font-bold text-foreground">{formatCurrencyAmount(calculation.monthlySavings, baseCurrency, locale)}</p>
            </div>
            <div className="rounded-theme border-theme bg-surface p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{t('annualSavingsLabel')}</p>
              <p className="text-lg font-bold text-foreground">{formatCurrencyAmount(calculation.annualSavings, baseCurrency, locale)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium text-foreground">
              <span>{t('savingsRateLabel')}</span>
              <span>{calculation.savingsPercent.toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min(Math.max(calculation.savingsPercent, 4), 100)}%` }}
              />
            </div>
          </div>

          {Number.isFinite(calculation.finishDays) && (
            <p className="text-sm text-gray-600">
              {t('finishUsageHint')
                .replace('{name}', calculation.bestProduct.name)
                .replace('{days}', calculation.finishDays.toFixed(1))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

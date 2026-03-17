import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { getCurrencies } from '@/constants/currencies';
import { useLanguage } from '@/context/LanguageContext';

interface CurrencySelectorProps {
  onCurrencyChange: (currency: string) => void;
  defaultCurrency?: string;
}

export default function CurrencySelector({
  onCurrencyChange,
  defaultCurrency = 'CNY',
}: CurrencySelectorProps) {
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
  const { locale } = useLanguage();
  const currencies = useMemo(() => getCurrencies(locale || 'zh'), [locale]);
  const selectId = 'base-currency-select';

  useEffect(() => {
    setSelectedCurrency(defaultCurrency);
  }, [defaultCurrency]);

  const handleSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const code = event.target.value;
    setSelectedCurrency(code);
    onCurrencyChange(code);
  };

  return (
    <div className="relative inline-block min-w-[118px]">
      <label htmlFor={selectId} className="sr-only">
        {locale === 'zh' ? '基础币种' : 'Base currency'}
      </label>
      <select
        id={selectId}
        value={selectedCurrency}
        onChange={handleSelect}
        className="input appearance-none bg-surface pr-11 text-sm font-semibold cursor-pointer"
      >
        {currencies.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {currency.code}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

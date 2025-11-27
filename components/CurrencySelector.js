import { useState, useEffect, useMemo } from 'react';
import { getCurrencies } from '../constants/currencies';
import { useLanguage } from '../context/LanguageContext';
import { ChevronDown } from 'lucide-react';

export default function CurrencySelector({ onCurrencyChange, defaultCurrency = 'CNY' }) {
    const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
    const { locale } = useLanguage();
    const currencies = useMemo(() => getCurrencies(locale || 'zh'), [locale]);

    useEffect(() => {
        setSelectedCurrency(defaultCurrency);
    }, [defaultCurrency]);

    const handleSelect = (e) => {
        const code = e.target.value;
        setSelectedCurrency(code);
        onCurrencyChange(code);
    };

    return (
        <div className="relative inline-block">
            <select
                value={selectedCurrency}
                onChange={handleSelect}
                className="theme-input appearance-none pl-3 pr-12 py-2 text-sm font-bold text-foreground cursor-pointer hover:-translate-y-0.5 hover:shadow-theme-sm transition-all"
            >
                {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                        {currency.code}
                    </option>
                ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-foreground" />
        </div>
    );
}
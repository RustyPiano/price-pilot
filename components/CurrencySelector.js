import { useState, useEffect } from 'react';
import { currencies } from '../constants/currencies';

export default function CurrencySelector({ onCurrencyChange, defaultCurrency = 'CNY' }) {
    const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);

    useEffect(() => {
        setSelectedCurrency(defaultCurrency);
    }, [defaultCurrency]);

    const handleSelect = (e) => {
        const code = e.target.value;
        setSelectedCurrency(code);
        onCurrencyChange(code);
    };

    return (
        <div className="relative">
            <select
                value={selectedCurrency}
                onChange={handleSelect}
                className="appearance-none pl-4 pr-10 py-2 bg-white border-3 border-black rounded-none text-sm font-black text-black focus:shadow-neo cursor-pointer outline-none transition-all hover:-translate-y-0.5 hover:shadow-neo-sm"
            >
                {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                        {currency.code}
                    </option>
                ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-black">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    );
}
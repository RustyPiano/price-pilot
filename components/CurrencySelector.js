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
        <select
            value={selectedCurrency}
            onChange={handleSelect}
            className="px-3 py-1.5 bg-gray-100 border-0 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
            {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                    {currency.code}
                </option>
            ))}
        </select>
    );
}
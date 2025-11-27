import { translations } from './translations';

// Get currency list with localized names
export function getCurrencies(locale = 'zh') {
  const currencyTranslations = translations[locale]?.currencies || translations.zh.currencies;

  return [
    { code: 'CNY', name: currencyTranslations.CNY, symbol: '¥' },
    { code: 'USD', name: currencyTranslations.USD, symbol: '$' },
    { code: 'EUR', name: currencyTranslations.EUR, symbol: '€' },
    { code: 'JPY', name: currencyTranslations.JPY, symbol: '¥' },
    { code: 'GBP', name: currencyTranslations.GBP, symbol: '£' },
    { code: 'AUD', name: currencyTranslations.AUD, symbol: 'A$' },
    { code: 'CAD', name: currencyTranslations.CAD, symbol: 'C$' },
    { code: 'CHF', name: currencyTranslations.CHF, symbol: 'Fr' },
    { code: 'HKD', name: currencyTranslations.HKD, symbol: 'HK$' },
    { code: 'NZD', name: currencyTranslations.NZD, symbol: 'NZ$' },
    { code: 'SGD', name: currencyTranslations.SGD, symbol: 'S$' },
  ];
}

// For backward compatibility - default export with Chinese names
export const currencies = getCurrencies('zh');

// Fetch exchange rates from API
export async function fetchExchangeRates(baseCurrency = 'CNY') {
  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/a6463d646a0ef912f23ef813/latest/${baseCurrency}`
    );
    const data = await response.json();
    return data.conversion_rates;
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    return null;
  }
} 
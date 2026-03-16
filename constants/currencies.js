import { translations } from './translations';

const exchangeRateApiKey = process.env.NEXT_PUBLIC_EXCHANGE_RATE_API_KEY;

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

// Fetch exchange rates from API
export async function fetchExchangeRates(baseCurrency = 'CNY', options = {}) {
  if (!exchangeRateApiKey) {
    throw new Error('Missing NEXT_PUBLIC_EXCHANGE_RATE_API_KEY environment variable.');
  }

  const response = await fetch(
    `https://v6.exchangerate-api.com/v6/${exchangeRateApiKey}/latest/${baseCurrency}`,
    options
  );

  if (!response.ok) {
    throw new Error(`Exchange rate request failed with status ${response.status}.`);
  }

  const data = await response.json();

  if (data?.result === 'error') {
    throw new Error(data['error-type'] || 'Exchange rate API returned an error.');
  }

  if (!data?.conversion_rates) {
    throw new Error('Exchange rate API returned an invalid payload.');
  }

  return data.conversion_rates;
}

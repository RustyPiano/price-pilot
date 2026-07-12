import { translations } from '@/constants/translations';
import type { CurrencyCode, CurrencyOption, ExchangeRates, Locale } from '@/types';

export const SUPPORTED_CURRENCY_CODES: CurrencyCode[] = [
  'CNY',
  'USD',
  'EUR',
  'JPY',
  'GBP',
  'AUD',
  'CAD',
  'CHF',
  'HKD',
  'NZD',
  'SGD',
];

const inflightRequests = new Map<string, Promise<ExchangeRates>>();

export function isSupportedCurrencyCode(value: string): value is CurrencyCode {
  return SUPPORTED_CURRENCY_CODES.includes(value as CurrencyCode);
}

export function getCurrencies(locale: Locale = 'zh'): CurrencyOption[] {
  const currencyTranslations = (translations[locale]?.currencies ??
    translations.zh.currencies) as Record<string, string> | undefined;

  return [
    { code: 'CNY', name: String(currencyTranslations?.CNY ?? 'CNY'), symbol: '¥' },
    { code: 'USD', name: String(currencyTranslations?.USD ?? 'USD'), symbol: '$' },
    { code: 'EUR', name: String(currencyTranslations?.EUR ?? 'EUR'), symbol: '€' },
    { code: 'JPY', name: String(currencyTranslations?.JPY ?? 'JPY'), symbol: '¥' },
    { code: 'GBP', name: String(currencyTranslations?.GBP ?? 'GBP'), symbol: '£' },
    { code: 'AUD', name: String(currencyTranslations?.AUD ?? 'AUD'), symbol: 'A$' },
    { code: 'CAD', name: String(currencyTranslations?.CAD ?? 'CAD'), symbol: 'C$' },
    { code: 'CHF', name: String(currencyTranslations?.CHF ?? 'CHF'), symbol: 'Fr' },
    { code: 'HKD', name: String(currencyTranslations?.HKD ?? 'HKD'), symbol: 'HK$' },
    { code: 'NZD', name: String(currencyTranslations?.NZD ?? 'NZD'), symbol: 'NZ$' },
    { code: 'SGD', name: String(currencyTranslations?.SGD ?? 'SGD'), symbol: 'S$' },
  ];
}

async function fetchExchangeRatesFromApi(
  baseCurrency: string,
  options: RequestInit = {}
): Promise<ExchangeRates> {
  const response = await fetch(`/api/exchange-rates?base=${encodeURIComponent(baseCurrency)}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Exchange rate request failed with status ${response.status}.`);
  }

  const data: { rates?: ExchangeRates } = await response.json();
  if (!data.rates) {
    throw new Error('Exchange rate API returned an invalid payload.');
  }

  return data.rates;
}

export async function fetchExchangeRates(
  baseCurrency: string = 'CNY',
  options: RequestInit = {}
): Promise<ExchangeRates> {
  const normalizedCurrency = baseCurrency.toUpperCase();

  // 带 signal 的请求不共享: 复用会让一个调用方的 abort 连坐其他调用方
  // (StrictMode 双挂载曾因此在详情页首载必报「汇率请求超时」)。
  if (options.signal) {
    return fetchExchangeRatesFromApi(normalizedCurrency, options);
  }

  if (inflightRequests.has(normalizedCurrency)) {
    return inflightRequests.get(normalizedCurrency) as Promise<ExchangeRates>;
  }

  const request = fetchExchangeRatesFromApi(normalizedCurrency, options).finally(() => {
    inflightRequests.delete(normalizedCurrency);
  });

  inflightRequests.set(normalizedCurrency, request);
  return request;
}

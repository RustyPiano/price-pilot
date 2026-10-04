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

export async function fetchExchangeRates(
  baseCurrency: string = 'CNY',
  options: RequestInit = {}
): Promise<ExchangeRates> {
  const response = await fetch(`/api/exchange-rates?base=${encodeURIComponent(baseCurrency.toUpperCase())}`, {
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

const ratesCacheKey = (baseCurrency: string) => `exchangeRates:${baseCurrency}`;

export function readCachedRates(baseCurrency: string): ExchangeRates | null {
  try {
    const raw = window.localStorage.getItem(ratesCacheKey(baseCurrency));
    return raw ? (JSON.parse(raw) as { rates?: ExchangeRates } | null)?.rates ?? null : null;
  } catch (error) {
    console.error('Failed to read cached exchange rates:', error);
    return null;
  }
}

export function writeCachedRates(baseCurrency: string, rates: ExchangeRates): void {
  try {
    window.localStorage.setItem(ratesCacheKey(baseCurrency), JSON.stringify({
      rates,
      savedAt: new Date().toISOString(),
    }));
  } catch (error) {
    // 写缓存失败 (如 iOS 隐私模式配额为 0) 不能把成功的拉取误报为错误。
    console.error('Failed to cache exchange rates:', error);
  }
}

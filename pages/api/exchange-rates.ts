import type { NextApiRequest, NextApiResponse } from 'next';
import { isSupportedCurrencyCode } from '@/constants/currencies';
import type { ExchangeRates } from '@/types';

const CACHE_TTL = 10 * 60 * 1000;
const exchangeRateCache = new Map<string, { rates: ExchangeRates; cachedAt: number }>();

type ExchangeRateResponse =
  | { rates: ExchangeRates; cachedAt: string }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExchangeRateResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const base = typeof req.query.base === 'string' ? req.query.base.toUpperCase() : '';
  if (!isSupportedCurrencyCode(base)) {
    res.status(400).json({ error: 'Unsupported base currency.' });
    return;
  }

  const cachedValue = exchangeRateCache.get(base);
  if (cachedValue && Date.now() - cachedValue.cachedAt < CACHE_TTL) {
    res.status(200).json({
      rates: cachedValue.rates,
      cachedAt: new Date(cachedValue.cachedAt).toISOString(),
    });
    return;
  }

  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Missing EXCHANGE_RATE_API_KEY environment variable.' });
    return;
  }

  try {
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`);
    if (!response.ok) {
      res.status(response.status).json({ error: `Exchange rate request failed with status ${response.status}.` });
      return;
    }

    const payload = (await response.json()) as {
      result?: string;
      conversion_rates?: ExchangeRates;
      'error-type'?: string;
    };

    if (payload.result === 'error' || !payload.conversion_rates) {
      res.status(502).json({ error: payload['error-type'] || 'Exchange rate API returned an invalid payload.' });
      return;
    }

    const cachedAt = Date.now();
    exchangeRateCache.set(base, { rates: payload.conversion_rates, cachedAt });

    res.status(200).json({
      rates: payload.conversion_rates,
      cachedAt: new Date(cachedAt).toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch exchange rates on the server:', error);
    res.status(502).json({ error: 'Failed to fetch exchange rates.' });
  }
}

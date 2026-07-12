import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchExchangeRates } from '@/constants/currencies';

const RATES_PAYLOAD = { rates: { CNY: 1, USD: 0.14 } };

function mockFetch(impl?: typeof fetch) {
  const fetchMock = vi.fn(
    impl ??
      (async () =>
        new Response(JSON.stringify(RATES_PAYLOAD), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }))
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('fetchExchangeRates', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('dedupes concurrent requests without a signal', async () => {
    const fetchMock = mockFetch();

    const [first, second] = await Promise.all([
      fetchExchangeRates('CNY'),
      fetchExchangeRates('cny'),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(RATES_PAYLOAD.rates);
    expect(second).toEqual(RATES_PAYLOAD.rates);
  });

  it('does not share in-flight requests across abortable callers', async () => {
    // 回归防护: 曾经所有带 signal 的调用共用一个去重键, abort 其一会连坐其余
    // (StrictMode 双挂载下详情页首载必报「汇率请求超时」)。
    const fetchMock = mockFetch(async (_input, init) => {
      const signal = init?.signal;
      return new Promise<Response>((resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
        setTimeout(() => {
          resolve(
            new Response(JSON.stringify(RATES_PAYLOAD), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }, 10);
      });
    });

    const abortedController = new AbortController();
    const survivorController = new AbortController();

    const abortedRequest = fetchExchangeRates('CNY', { signal: abortedController.signal });
    const survivorRequest = fetchExchangeRates('CNY', { signal: survivorController.signal });
    abortedController.abort();

    await expect(abortedRequest).rejects.toMatchObject({ name: 'AbortError' });
    await expect(survivorRequest).resolves.toEqual(RATES_PAYLOAD.rates);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

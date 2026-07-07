import { createElement, useCallback, useEffect, useState, type MutableRefObject } from 'react';
import { toast } from 'react-hot-toast';
import ReceiptShareCard, {
  RECEIPT_WIDTH,
  type ReceiptShareItem,
} from '@/components/ReceiptShareCard';
import { fetchExchangeRates, getCurrencies } from '@/constants/currencies';
import {
  enrichProducts,
  formatProductQuantityLabel,
  getNumberLocale,
} from '@/lib/comparison-math';
import { formatUnitPrice } from '@/lib/quick-compare';
import type {
  ComparisonList,
  EnrichedProduct,
  ExchangeRates,
  ImagePreview,
  Locale,
  Translate,
} from '@/types';

interface UseShareImageOptions {
  listRef: MutableRefObject<ComparisonList>;
  locale: Locale;
  t: Translate;
}

interface ReceiptModel {
  items: ReceiptShareItem[];
  winnerName: string | null;
  savingsPct: string | null;
}

function readCachedRates(baseCurrency: string): ExchangeRates | null {
  try {
    const raw = window.localStorage.getItem(`exchangeRates:${baseCurrency}`);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { rates?: ExchangeRates } | null;
    return parsed?.rates ?? null;
  } catch (error) {
    console.error('Failed to read cached exchange rates for share image:', error);
    return null;
  }
}

// 复用详情页已缓存的汇率, 保证小票数字与用户所见一致; 缺失时兜底请求一次。
async function resolveExchangeRates(baseCurrency: string): Promise<ExchangeRates | null> {
  const cached = readCachedRates(baseCurrency);
  if (cached) {
    return cached;
  }

  try {
    return await fetchExchangeRates(baseCurrency);
  } catch {
    return null;
  }
}

function buildReceiptModel(
  list: ComparisonList,
  rates: ExchangeRates | null,
  locale: Locale,
  symbol: string
): ReceiptModel {
  const enriched = enrichProducts(list.products, rates, list.baseCurrency, list.unitSystem);
  const sorted: EnrichedProduct[] = [...enriched].sort((left, right) => left.unitPrice - right.unitPrice);

  const numberLocale = getNumberLocale(locale);
  const priceFormatter = new Intl.NumberFormat(numberLocale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const best = sorted[0];
  const items: ReceiptShareItem[] = sorted.map((product, index) => {
    const canComparePct = index > 0 && best && best.unitPrice > 0 && product.unitPrice > 0;

    return {
      name: product.name,
      spec: `${priceFormatter.format(product.price)} / ${formatProductQuantityLabel(product, locale)}`,
      amount: formatUnitPrice(product.unitPrice),
      symbol,
      isBest: index === 0 && product.unitPrice > 0,
      pct: canComparePct ? Math.round((product.unitPrice / best.unitPrice - 1) * 100) : null,
    };
  });

  const worst = sorted[sorted.length - 1];
  let winnerName: string | null = null;
  let savingsPct: string | null = null;

  if (sorted.length >= 2 && best && worst && best.unitPrice > 0) {
    const savings = Math.round((worst.unitPrice / best.unitPrice - 1) * 100);
    if (savings > 0) {
      winnerName = best.name;
      savingsPct = `${savings}%`;
    }
  }

  return { items, winnerName, savingsPct };
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve());
    } else {
      setTimeout(() => resolve(), 16);
    }
  });
}

export function useShareImage({ listRef, locale, t }: UseShareImageOptions) {
  const [isSharingImage, setIsSharingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);

  useEffect(() => {
    if (!imagePreview?.url) {
      return undefined;
    }

    return () => {
      URL.revokeObjectURL(imagePreview.url);
    };
  }, [imagePreview?.url]);

  const closeImagePreview = useCallback(() => {
    setImagePreview(null);
  }, []);

  const shareImage = useCallback(async () => {
    setIsSharingImage(true);

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = `${RECEIPT_WIDTH}px`;
    container.style.pointerEvents = 'none';
    container.style.background = 'transparent';
    document.body.appendChild(container);

    let unmount: (() => void) | null = null;

    try {
      const list = listRef.current;
      const rates = list.products.length > 0
        ? await resolveExchangeRates(list.baseCurrency)
        : null;
      const symbol = getCurrencies(locale).find((currency) => currency.code === list.baseCurrency)?.symbol
        ?? list.baseCurrency;
      const { items, winnerName, savingsPct } = buildReceiptModel(list, rates, locale, symbol);

      const now = new Date();
      const serial = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const dateLabel = new Intl.DateTimeFormat(getNumberLocale(locale), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(now);

      const { createRoot } = await import('react-dom/client');
      const root = createRoot(container);
      unmount = () => root.unmount();
      root.render(
        createElement(ReceiptShareCard, {
          listName: list.name,
          serial,
          dateLabel,
          items,
          winnerName,
          savingsPct,
          t,
        })
      );

      // 等待布局与字体就绪, 让 html2canvas 拿到稳定的离屏节点。
      await nextFrame();
      await nextFrame();
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {
          /* 字体接口不可用时忽略 */
        }
      }

      const { default: html2canvas } = await import('html2canvas');
      const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
      const exportScale = isMobileViewport
        ? Math.min(window.devicePixelRatio || 1, 1.5)
        : 2;
      const canvas = await html2canvas(container, {
        backgroundColor: null,
        scale: exportScale,
        useCORS: true,
        logging: false,
      });

      const imageBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
            return;
          }

          reject(new Error('Failed to create image blob.'));
        }, 'image/png');
      });

      const safeName = list.name.replace(/[^\w\u4e00-\u9fa5-]+/g, '-');
      const fileName = `${safeName || 'price-pilot'}.png`;
      const imageUrl = URL.createObjectURL(imageBlob);

      setImagePreview({
        fileName,
        url: imageUrl,
      });
      toast.success(t('shareImageSuccess'));
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'AbortError') {
        console.error('Failed to share result image:', error);
        toast.error(t('shareImageError'));
      }
    } finally {
      if (unmount) {
        unmount();
      }
      container.remove();
      setIsSharingImage(false);
    }
  }, [listRef, locale, t]);

  const handleDownloadPreviewImage = useCallback(() => {
    if (!imagePreview?.url) {
      return;
    }

    const downloadLink = document.createElement('a');
    downloadLink.href = imagePreview.url;
    downloadLink.download = imagePreview.fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  }, [imagePreview]);

  return {
    isSharingImage,
    imagePreview,
    closeImagePreview,
    shareImage,
    handleDownloadPreviewImage,
  };
}

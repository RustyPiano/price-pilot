import { useCallback, useEffect, useState, type MutableRefObject, type RefObject } from 'react';
import { toast } from 'react-hot-toast';
import type { ComparisonList, ImagePreview, ResolvedTheme, Translate } from '@/types';

interface UseShareImageOptions {
  listRef: MutableRefObject<ComparisonList>;
  resultRef: RefObject<HTMLDivElement | null>;
  resolvedTheme: ResolvedTheme;
  t: Translate;
}

export function useShareImage({
  listRef,
  resultRef,
  resolvedTheme,
  t,
}: UseShareImageOptions) {
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
    if (!resultRef.current) {
      return;
    }

    setIsSharingImage(true);

    try {
      const { default: html2canvas } = await import('html2canvas');
      const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
      const exportScale = isMobileViewport
        ? Math.min(window.devicePixelRatio || 1, 1.5)
        : 2;
      const canvas = await html2canvas(resultRef.current, {
        backgroundColor: resolvedTheme === 'dark' ? '#0f1117' : '#f6f3ee',
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

      const safeName = listRef.current.name.replace(/[^\w\u4e00-\u9fa5-]+/g, '-');
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
      setIsSharingImage(false);
    }
  }, [listRef, resolvedTheme, resultRef, t]);

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

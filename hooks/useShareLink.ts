import { useCallback, useState, type MutableRefObject } from 'react';
import { toast } from 'react-hot-toast';
import { encodeSharedComparisonList } from '@/lib/share-utils';
import type { ComparisonList, Translate } from '@/types';

interface UseShareLinkOptions {
  listRef: MutableRefObject<ComparisonList>;
  t: Translate;
}

export function useShareLink({ listRef, t }: UseShareLinkOptions) {
  const [isSharingLink, setIsSharingLink] = useState(false);
  const [manualShareUrl, setManualShareUrl] = useState('');

  const buildShareUrl = useCallback(() => {
    const sharePayload = encodeSharedComparisonList(listRef.current);
    const sharedUrl = new URL(window.location.href);
    sharedUrl.searchParams.set('share', sharePayload);
    return sharedUrl.toString();
  }, [listRef]);

  const closeManualShareModal = useCallback(() => {
    setManualShareUrl('');
  }, []);

  const shareLink = useCallback(async () => {
    setIsSharingLink(true);
    let sharedUrl = '';

    try {
      sharedUrl = buildShareUrl();
      setManualShareUrl('');

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sharedUrl);
        toast.success(t('shareLinkSuccess'));
      } else {
        setManualShareUrl(sharedUrl);
      }
    } catch (error) {
      console.error('Failed to copy list link:', error);

      if (sharedUrl) {
        setManualShareUrl(sharedUrl);
      } else {
        toast.error(t('shareLinkError'));
      }
    } finally {
      setIsSharingLink(false);
    }
  }, [buildShareUrl, t]);

  return {
    isSharingLink,
    manualShareUrl,
    closeManualShareModal,
    shareLink,
  };
}

import { Download, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { ImagePreview } from '@/types';

interface ShareImageModalProps {
  imagePreview: ImagePreview;
  onClose: () => void;
  onDownload: () => void;
}

export default function ShareImageModal({
  imagePreview,
  onClose,
  onDownload,
}: ShareImageModalProps) {
  const { t } = useLanguage();

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] overflow-y-auto bg-[color:var(--overlay-backdrop)] px-4 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mx-auto flex min-h-full max-w-4xl items-center justify-center">
        <div className="panel w-full space-y-4 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">{t('shareImagePreviewTitle')}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{t('shareImagePreviewBody')}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="icon-btn h-10 w-10 flex-shrink-0"
              aria-label={t('closePreviewAction')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-hidden rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-2">
            <img
              src={imagePreview.url}
              alt={t('shareImagePreviewTitle')}
              className="mx-auto h-auto max-h-[70vh] w-full rounded-[14px] object-contain"
            />
          </div>

          <p className="text-xs leading-5 text-muted">{t('shareImagePreviewHint')}</p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary text-sm"
            >
              {t('closePreviewAction')}
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="btn btn-primary text-sm"
            >
              <Download className="h-4 w-4" />
              {t('shareImageDownloadAction')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

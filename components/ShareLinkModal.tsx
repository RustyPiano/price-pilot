import { X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface ShareLinkModalProps {
  url: string;
  onClose: () => void;
}

export default function ShareLinkModal({ url, onClose }: ShareLinkModalProps) {
  const { t } = useLanguage();

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[color:var(--overlay-backdrop)] px-4 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="panel w-full max-w-lg space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">{t('shareLinkFallbackTitle')}</h3>
            <p className="mt-1 text-sm leading-6 text-muted">{t('shareLinkFallbackBody')}</p>
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

        <label htmlFor="manual-share-url" className="field-label">
          {t('shareLinkFieldLabel')}
        </label>
        <textarea
          id="manual-share-url"
          value={url}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
          className="input min-h-28 resize-none font-mono text-sm leading-6"
        />

        <p className="text-xs leading-5 text-muted">{t('shareLinkFallbackHint')}</p>
      </div>
    </div>
  );
}

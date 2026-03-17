import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

interface ListMetadataEditorProps {
  name: string;
  category: string;
  updatedAt: string;
  defaultName: string;
  onCommit: (name: string, category: string) => void;
}

export default function ListMetadataEditor({
  name,
  category,
  updatedAt,
  defaultName,
  onCommit,
}: ListMetadataEditorProps) {
  const [draft, setDraft] = useState({ name, category });
  const { t } = useLanguage();

  useEffect(() => {
    setDraft({ name, category });
  }, [category, name]);

  const commitMetadata = () => {
    const nextName = draft.name.trim() || defaultName;
    const nextCategory = draft.category.trim();

    if (nextName === name && nextCategory === category) {
      return;
    }

    setDraft({ name: nextName, category: nextCategory });
    onCommit(nextName, nextCategory);
  };

  return (
    <div className="panel space-y-4 p-4 sm:p-5">
      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <div>
          <label htmlFor="list-name" className="field-label">
            {t('listNameLabel')}
          </label>
          <input
            id="list-name"
            type="text"
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            onBlur={commitMetadata}
            onKeyDown={(event) => event.key === 'Enter' && commitMetadata()}
            className="input text-base font-semibold sm:text-lg"
            placeholder={t('listNamePlaceholder')}
          />
        </div>
        <div>
          <label htmlFor="list-category" className="field-label">
            {t('listCategoryLabel')}
          </label>
          <input
            id="list-category"
            type="text"
            value={draft.category}
            onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
            onBlur={commitMetadata}
            onKeyDown={(event) => event.key === 'Enter' && commitMetadata()}
            className="input"
            placeholder={t('listCategoryPlaceholder')}
          />
        </div>
      </div>
      <p className="text-xs text-muted">
        {t('listUpdatedAt').replace('{date}', new Date(updatedAt).toLocaleString())}
      </p>
    </div>
  );
}

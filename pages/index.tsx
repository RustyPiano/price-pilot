import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import Head from 'next/head';
import type { GetStaticProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import LanguageToggle from '@/components/LanguageToggle';
import PageHeader from '@/components/PageHeader';
import QuickCompare from '@/components/QuickCompare';
import { useLanguage } from '@/context/LanguageContext';
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap';
import { downloadAsJson, exportAllData, importFromJson } from '@/lib/data-backup';
import {
  createComparisonList,
  ensureComparisonListsInitialized,
  getAllComparisonLists,
  removeComparisonList,
  saveComparisonList,
} from '@/lib/comparison-lists';
import { getNumberLocale } from '@/lib/comparison-math';
import {
  buildAbsoluteUrl,
  DEFAULT_SITE_ORIGIN,
  getAlternateHomeLinks,
  getHomeDescription,
  getHomeTitle,
  seoGuideContent,
  SITE_NAME,
} from '@/lib/seo';
import { Archive, ArrowRight, Download, FolderOpen, Layers3, Plus, Trash2, Upload, X } from 'lucide-react';
import type { ComparisonList, ImportStrategy, Locale } from '@/types';

interface NewListDraft {
  name: string;
  category: string;
}

export const getStaticProps: GetStaticProps<{ initialLocale: Locale }> = async () => ({
  props: {
    initialLocale: 'zh',
  },
});

export function HomePage() {
  const router = useRouter();
  const [lists, setLists] = useState<ComparisonList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newList, setNewList] = useState<NewListDraft>({ name: '', category: '' });
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const importDialogRef = useRef<HTMLDivElement | null>(null);
  useModalFocusTrap(importDialogRef, {
    active: pendingImportFile !== null,
    onClose: () => {
      if (!isImporting) {
        setPendingImportFile(null);
      }
    },
  });
  const { t, locale } = useLanguage();
  const numberLocale = getNumberLocale(locale);
  const homePath = router.pathname === '/en' ? '/en' : '/';
  const canonicalUrl = buildAbsoluteUrl(DEFAULT_SITE_ORIGIN, homePath);
  const siteRootUrl = DEFAULT_SITE_ORIGIN ? buildAbsoluteUrl(DEFAULT_SITE_ORIGIN, '/') : null;
  const ogImageUrl = DEFAULT_SITE_ORIGIN ? buildAbsoluteUrl(DEFAULT_SITE_ORIGIN, '/og.png') : null;
  const homeAbsoluteUrl = DEFAULT_SITE_ORIGIN ? buildAbsoluteUrl(DEFAULT_SITE_ORIGIN, homePath) : null;
  const alternateLinks = getAlternateHomeLinks(DEFAULT_SITE_ORIGIN);
  const guideContent = seoGuideContent[locale];
  const homeTitle = getHomeTitle(locale);
  const homeDescription = getHomeDescription(locale);
  const localeTag = locale === 'zh' ? 'zh_CN' : 'en_US';
  const answerEyebrow = locale === 'zh' ? '搜索与 AI 摘要' : 'Search and AI Summary';
  const structuredData = useMemo(() => ([
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      inLanguage: ['zh-CN', 'en-US'],
      ...(siteRootUrl ? { url: siteRootUrl } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web',
      inLanguage: locale === 'zh' ? 'zh-CN' : 'en-US',
      description: homeDescription,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: locale === 'zh' ? 'CNY' : 'USD',
      },
      featureList: guideContent.useCases,
      ...(homeAbsoluteUrl ? { url: homeAbsoluteUrl } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: guideContent.stepsTitle,
      description: guideContent.answerBody,
      step: guideContent.steps.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step,
        text: step,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: guideContent.faqs.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
  ]), [guideContent, homeAbsoluteUrl, homeDescription, locale, siteRootUrl]);

  useEffect(() => {
    let isMounted = true;

    const loadLists = async () => {
      setIsLoading(true);

      try {
        const initializedLists = await ensureComparisonListsInitialized(locale);
        if (isMounted) {
          setLists(initializedLists);
        }
      } catch (error) {
        console.error('Failed to initialize comparison lists:', error);
        if (isMounted) {
          toast.error(t('listsLoadError'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadLists();

    return () => {
      isMounted = false;
    };
  }, [locale, t]);

  const activeLists = useMemo(() => lists.filter((list) => !list.archived), [lists]);
  const archivedLists = useMemo(() => lists.filter((list) => list.archived), [lists]);

  const refreshLists = async () => {
    const nextLists = await getAllComparisonLists();
    setLists(nextLists);
  };

  const handleCreateList = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const createdList = await saveComparisonList(createComparisonList({
        name: newList.name,
        category: newList.category,
        locale,
      }), locale);

      setNewList({ name: '', category: '' });
      setLists((prev) => [createdList, ...prev]);
      toast.success(t('listCreatedSuccess'));
      router.push(`/list/${createdList.id}`);
    } catch (error) {
      console.error('Failed to create list:', error);
      toast.error(t('listCreateError'));
    }
  };

  const handleToggleArchive = async (list: ComparisonList) => {
    try {
      const savedList = await saveComparisonList({
        ...list,
        archived: !list.archived,
        updatedAt: new Date().toISOString(),
      }, locale);

      setLists((prev) => prev.map((item) => (item.id === savedList.id ? savedList : item)));
      toast.success(savedList.archived ? t('listArchivedSuccess') : t('listUnarchivedSuccess'));
    } catch (error) {
      console.error('Failed to toggle archive state:', error);
      toast.error(t('listArchiveError'));
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!window.confirm(t('deleteListConfirm'))) {
      return;
    }

    try {
      await removeComparisonList(listId);
      await refreshLists();
      toast.success(t('listDeletedSuccess'));
    } catch (error) {
      console.error('Failed to delete list:', error);
      toast.error(t('listDeleteError'));
    }
  };

  const handleExportData = async () => {
    try {
      const backup = await exportAllData();
      downloadAsJson(backup);
      toast.success(t('backupExportSuccess'));
    } catch (error) {
      console.error('Failed to export data:', error);
      toast.error(t('backupExportError'));
    }
  };

  const handleImportInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPendingImportFile(file);
    event.target.value = '';
  };

  const handleImportData = async (strategy: ImportStrategy) => {
    if (!pendingImportFile) {
      return;
    }

    setIsImporting(true);

    try {
      const result = await importFromJson(pendingImportFile, strategy, locale);
      setPendingImportFile(null);
      await refreshLists();
      toast.success(
        t('backupImportSuccess')
          .replace('{imported}', String(result.imported))
          .replace('{skipped}', String(result.skipped))
      );

      if (result.errors.length > 0) {
        toast.error(
          t('backupImportErrors')
            .replace('{count}', String(result.errors.length))
        );
      }
    } catch (error) {
      console.error('Failed to import backup data:', error);
      toast.error(t('backupImportError'));
    } finally {
      setIsImporting(false);
    }
  };

  const formatUpdatedDate = (value: string) => new Intl.DateTimeFormat(numberLocale, {
    dateStyle: 'medium',
  }).format(new Date(value));

  const renderLedgerRow = (list: ComparisonList) => {
    const itemsText = t('listRowItems').replace('{count}', String(list.products.length));
    const meta = `${itemsText} · ${formatUpdatedDate(list.updatedAt)}`;

    return (
      <div
        key={list.id}
        className="group flex items-center transition-colors hover:bg-[color:var(--brand-soft)]"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <Link
          href={`/list/${list.id}`}
          className="flex min-w-0 flex-1 items-baseline gap-3 rounded-lg py-3 pl-1 pr-1"
        >
          <span className="min-w-0 truncate font-semibold text-foreground">{list.name}</span>
          <span className="dotted-leader" aria-hidden="true" />
          <span
            className="shrink-0 whitespace-nowrap text-xs text-muted"
            style={{ fontFamily: 'var(--font-num)', fontVariantNumeric: 'tabular-nums' }}
          >
            {meta}
          </span>
          <ArrowRight
            className="h-4 w-4 shrink-0 self-center text-muted transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
        <div className="flex shrink-0 items-center gap-0.5 pl-1">
          <button
            type="button"
            onClick={() => handleToggleArchive(list)}
            aria-label={list.archived ? t('unarchiveList') : t('archiveList')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-[color:var(--surface)] hover:text-foreground"
          >
            <Archive className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteList(list.id)}
            aria-label={t('deleteList')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-[color:var(--danger-soft)] hover:text-[color:var(--danger)]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>{homeTitle}</title>
        <meta name="description" content={homeDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
        <meta name="application-name" content={SITE_NAME} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={homeTitle} />
        <meta property="og:description" content={homeDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:locale" content={localeTag} />
        <meta property="og:locale:alternate" content={locale === 'zh' ? 'en_US' : 'zh_CN'} />
        {ogImageUrl && <meta property="og:image" content={ogImageUrl} />}
        {ogImageUrl && <meta property="og:image:width" content="1200" />}
        {ogImageUrl && <meta property="og:image:height" content="630" />}
        <meta name="twitter:card" content={ogImageUrl ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={homeTitle} />
        <meta name="twitter:description" content={homeDescription} />
        {ogImageUrl && <meta name="twitter:image" content={ogImageUrl} />}
        <link rel="canonical" href={canonicalUrl} />
        {alternateLinks.map((link) => (
          <link key={link.hrefLang} rel="alternate" hrefLang={link.hrefLang} href={link.href} />
        ))}
        {structuredData.map((item, index) => (
          <script
            key={`ld-json-${index}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
          />
        ))}
      </Head>

      <div className="page-shell">
        <PageHeader
          title={t('comparisonListsTitle')}
          homeHref="https://rustypiano.com"
          homeLabel={t('personalWebsite')}
        >
          <LanguageToggle />
        </PageHeader>

        <main id="main-content" className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:space-y-6 sm:py-6">
          <QuickCompare />

          <section className="grid gap-4 lg:grid-cols-[1.25fr_0.95fr]">
            <div className="panel space-y-5 p-5 sm:p-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t('comparisonListsEyebrow')}</p>
                <h2 className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                  {t('comparisonListsHeroTitle')}
                </h2>
                <p className="section-description max-w-2xl">{t('comparisonListsHeroBody')}</p>
              </div>

              <div className="grid grid-cols-3">
                {[
                  { label: t('activeListsLabel'), value: activeLists.length },
                  { label: t('archivedListsLabel'), value: archivedLists.length },
                  { label: t('productsLabel'), value: lists.reduce((sum, list) => sum + list.products.length, 0) },
                ].map((stat, index) => (
                  <div
                    key={stat.label}
                    className="flex flex-col gap-1.5"
                    style={{
                      paddingLeft: index === 0 ? undefined : '1.25rem',
                      paddingRight: '1.25rem',
                      borderLeft: index === 0 ? undefined : '1px solid var(--border-subtle)',
                    }}
                  >
                    <span
                      className="text-3xl font-bold leading-none text-foreground"
                      style={{ fontFamily: 'var(--font-num)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}
                    >
                      {stat.value}
                    </span>
                    <span className="text-xs font-medium tracking-wide text-muted">{stat.label}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="btn btn-secondary w-full text-sm sm:w-auto"
                >
                  <Download className="h-4 w-4" />
                  {t('exportDataAction')}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary w-full text-sm sm:w-auto"
                >
                  <Upload className="h-4 w-4" />
                  {t('importDataAction')}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="sr-only"
                  onChange={handleImportInputChange}
                />
              </div>
            </div>

            <form onSubmit={handleCreateList} className="panel space-y-4 p-5 sm:p-6">
              <div className="space-y-1">
                <h2 className="section-title">{t('createListTitle')}</h2>
                <p className="section-description">{t('comparisonListsDescription')}</p>
              </div>

              <div>
                <label htmlFor="new-list-name" className="field-label">
                  {t('listNameLabel')}
                </label>
                <input
                  id="new-list-name"
                  type="text"
                  value={newList.name}
                  onChange={(event) => setNewList((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder={t('listNamePlaceholder')}
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="new-list-category" className="field-label">
                  {t('listCategoryLabel')}
                </label>
                <input
                  id="new-list-category"
                  type="text"
                  value={newList.category}
                  onChange={(event) => setNewList((prev) => ({ ...prev, category: event.target.value }))}
                  placeholder={t('listCategoryPlaceholder')}
                  className="input"
                />
              </div>

              <button type="submit" className="btn btn-primary w-full text-sm">
                <Plus className="h-4 w-4" />
                {t('createListAction')}
              </button>
            </form>
          </section>

          {isLoading ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Layers3 className="h-5 w-5 text-brand" />
                <div className="skeleton-block h-5 w-28" />
              </div>
              <div className="px-1">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 py-3.5"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <div className="skeleton-block h-4 w-28" />
                    <div className="flex-1" />
                    <div className="skeleton-block h-3 w-24" />
                  </div>
                ))}
              </div>
            </section>
          ) : activeLists.length === 0 && archivedLists.length === 0 ? (
            <div className="panel space-y-4 p-6 text-center sm:p-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-100 text-brand">
                <FolderOpen className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">{t('listsEmptyTitle')}</h2>
                <p className="section-description">{t('listsEmptyBody')}</p>
              </div>
            </div>
          ) : (
            <>
              {activeLists.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Layers3 className="h-5 w-5 text-brand" />
                    <h2 className="section-title">{t('activeListsTitle')}</h2>
                  </div>
                  <div className="px-1">
                    {activeLists.map(renderLedgerRow)}
                  </div>
                </section>
              )}

              {archivedLists.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Archive className="h-5 w-5 text-muted" />
                    <h2 className="section-title">{t('archivedListsTitle')}</h2>
                  </div>
                  <div className="px-1">
                    {archivedLists.map(renderLedgerRow)}
                  </div>
                </section>
              )}
            </>
          )}

          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="panel space-y-3 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{answerEyebrow}</p>
              <h2 className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                {guideContent.answerTitle}
              </h2>
              <p className="section-description max-w-3xl">{guideContent.answerBody}</p>
            </article>

            <section className="panel space-y-4 p-5 sm:p-6">
              <h2 className="section-title">{guideContent.stepsTitle}</h2>
              <ol className="space-y-3 text-sm leading-6 text-muted">
                {guideContent.steps.map((step, index) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-100 text-xs font-semibold text-brand">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <section className="panel space-y-4 p-5 sm:p-6">
              <h2 className="section-title">{guideContent.useCasesTitle}</h2>
              <ul className="text-sm leading-6 text-muted">
                {guideContent.useCases.map((item) => (
                  <li
                    key={item}
                    className="border-b py-2.5 first:pt-0 last:border-b-0 last:pb-0"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="panel space-y-4 p-5 sm:p-6">
              <h2 className="section-title">{guideContent.faqTitle}</h2>
              <div>
                {guideContent.faqs.map((item) => (
                  <article
                    key={item.question}
                    className="space-y-1.5 border-b py-3.5 first:pt-0 last:border-b-0 last:pb-0"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <h3 className="text-sm font-semibold text-foreground">{item.question}</h3>
                    <p className="text-sm leading-6 text-muted">{item.answer}</p>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </main>
      </div>

      {pendingImportFile && (
        <div
          ref={importDialogRef}
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[color:rgba(11,15,22,0.55)] px-4 py-6 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isImporting) {
              setPendingImportFile(null);
            }
          }}
        >
          <div className="panel w-full max-w-lg space-y-4 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">{t('importStrategyTitle')}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {t('importStrategyBody').replace('{name}', pendingImportFile.name)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingImportFile(null)}
                disabled={isImporting}
                className="icon-btn h-10 w-10 flex-shrink-0"
                aria-label={t('cancel')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => handleImportData('merge')}
                disabled={isImporting}
                className="btn btn-secondary justify-start px-4 py-4 text-left"
              >
                {t('importStrategyMerge')}
              </button>
              <button
                type="button"
                onClick={() => handleImportData('overwrite')}
                disabled={isImporting}
                className="btn btn-secondary justify-start px-4 py-4 text-left"
              >
                {t('importStrategyOverwrite')}
              </button>
              <button
                type="button"
                onClick={() => handleImportData('duplicate')}
                disabled={isImporting}
                className="btn btn-secondary justify-start px-4 py-4 text-left"
              >
                {t('importStrategyDuplicate')}
              </button>
            </div>

            <p className="text-xs leading-5 text-muted">{t('importStrategyHint')}</p>
          </div>
        </div>
      )}
    </>
  );
}

export default HomePage;

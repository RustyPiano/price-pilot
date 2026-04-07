import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import ListWorkspace from '@/components/ListWorkspace';
import LanguageToggle from '@/components/LanguageToggle';
import PageHeader from '@/components/PageHeader';
import { useLanguage } from '@/context/LanguageContext';
import {
  ensureComparisonListsInitialized,
  getComparisonList,
  saveComparisonList,
} from '@/lib/comparison-lists';
import { decodeSharedComparisonList } from '@/lib/share-utils';
import type { ComparisonList } from '@/types';

type PageStatus = 'loading' | 'ready' | 'error' | 'not_found';

export default function ComparisonListPage() {
  const router = useRouter();
  const [comparisonList, setComparisonList] = useState<ComparisonList | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const { t, locale } = useLanguage();

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    let isMounted = true;

    const loadList = async () => {
      setStatus('loading');

      try {
        if (typeof router.query.share === 'string') {
          const sharedList = decodeSharedComparisonList(router.query.share, locale);

          if (!isMounted) {
            return;
          }

          if (!sharedList) {
            setStatus('error');
            return;
          }

          setComparisonList(sharedList);
          setStatus('ready');
          return;
        }

        await ensureComparisonListsInitialized(locale);
        const listId = typeof router.query.id === 'string' ? router.query.id : '';
        const nextList = await getComparisonList(listId);

        if (!isMounted) {
          return;
        }

        if (!nextList) {
          setStatus('not_found');
          return;
        }

        setComparisonList(nextList);
        setStatus('ready');
      } catch (error) {
        console.error('Failed to load comparison list:', error);
        if (isMounted) {
          setStatus('error');
        }
      }
    };

    loadList();

    return () => {
      isMounted = false;
    };
  }, [router.isReady, router.query.id, router.query.share, locale]);

  const handleSaveList = async (nextList: ComparisonList) => {
    setComparisonList(nextList);

    try {
      const savedList = await saveComparisonList(nextList, locale);
      setComparisonList(savedList);
    } catch (error) {
      console.error('Failed to save comparison list:', error);
      toast.error(t('listSaveError'));
    }
  };

  return (
    <>
      <Head>
        <title>{comparisonList ? `${comparisonList.name} · Price Pilot` : `Price Pilot · ${t('listDetailTitle')}`}</title>
        <meta name="description" content={comparisonList ? `${comparisonList.name} — ${t('listDetailSubtitle')}` : t('metaDescription')} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={comparisonList ? `${comparisonList.name} · Price Pilot` : 'Price Pilot'} />
        <meta property="og:description" content={locale === 'zh' ? '在 Price Pilot 中查看这份商品单价对比清单。' : 'View this unit price comparison list in Price Pilot.'} />
      </Head>

      <div className="page-shell">
        <PageHeader
          title={comparisonList?.name || t('listDetailTitle')}
          subtitle={t('listDetailSubtitle')}
          backHref="/"
          backLabel={t('backToLists')}
          homeHref="https://rustypiano.com"
          homeLabel={t('personalWebsite')}
        >
          <LanguageToggle />
        </PageHeader>

        <main className="mx-auto max-w-5xl px-4 py-5 sm:py-6">
          {status === 'loading' && (
            <div className="panel p-6 text-center text-sm text-muted">{t('listLoading')}</div>
          )}

          {status === 'error' && (
            <div className="panel space-y-3 p-6 text-center">
              <h2 className="text-lg font-semibold text-foreground">{t('listLoadErrorTitle')}</h2>
              <p className="section-description">{t('listLoadErrorBody')}</p>
              <button
                type="button"
                onClick={() => router.reload()}
                className="btn btn-primary px-4 text-sm"
              >
                {t('retryFetchRates')}
              </button>
            </div>
          )}

          {status === 'not_found' && (
            <div className="panel space-y-3 p-6 text-center">
              <h2 className="text-lg font-semibold text-foreground">{t('listNotFoundTitle')}</h2>
              <p className="section-description">{t('listNotFoundBody')}</p>
              <Link href="/" className="btn btn-primary inline-flex px-4 text-sm">
                {t('backToLists')}
              </Link>
            </div>
          )}

          {status === 'ready' && comparisonList && (
            <ListWorkspace comparisonList={comparisonList} onSaveList={handleSaveList} />
          )}
        </main>
      </div>
    </>
  );
}

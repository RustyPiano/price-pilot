import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageToggle from '../../components/LanguageToggle';
import ListWorkspace from '../../components/ListWorkspace';
import { useLanguage } from '../../context/LanguageContext';
import {
  ensureComparisonListsInitialized,
  getComparisonList,
  saveComparisonList,
} from '../../lib/comparison-lists';
import { decodeSharedComparisonList } from '../../lib/share-utils';
import { ArrowLeft } from 'lucide-react';

export default function ComparisonListPage() {
  const router = useRouter();
  const [comparisonList, setComparisonList] = useState(null);
  const [status, setStatus] = useState('loading');
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

          setComparisonList(sharedList);
          setStatus('ready');
          return;
        }

        await ensureComparisonListsInitialized(locale);
        const nextList = await getComparisonList(router.query.id);

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

  const handleSaveList = async (nextList) => {
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
        <title>{comparisonList ? `${comparisonList.name} · ${t('appTitle')}` : t('listDetailTitle')}</title>
        <meta name="description" content={t('comparisonListsDescription')} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-surface-100 pb-20 font-sans transition-colors duration-300">
        <header className="bg-primary border-b-theme sticky top-0 z-50 transition-colors duration-300">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="w-9 h-9 flex items-center justify-center border-theme bg-surface text-foreground shadow-theme-sm hover:-translate-y-0.5 hover:shadow-theme-base transition-all rounded-theme"
                aria-label={t('backToLists')}
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-foreground tracking-tight">{comparisonList?.name || t('listDetailTitle')}</h1>
                <p className="text-xs text-gray-600">{t('listDetailSubtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-6">
          {status === 'loading' && (
            <div className="theme-card p-6 text-center text-sm text-gray-500">{t('listLoading')}</div>
          )}

          {status === 'error' && (
            <div className="theme-card p-6 text-center space-y-3">
              <h2 className="text-lg font-bold text-foreground">{t('listLoadErrorTitle')}</h2>
              <p className="text-sm text-gray-500">{t('listLoadErrorBody')}</p>
              <button
                type="button"
                onClick={() => router.reload()}
                className="theme-btn theme-btn-primary px-4 py-3 text-sm uppercase tracking-wide"
              >
                {t('retryFetchRates')}
              </button>
            </div>
          )}

          {status === 'not_found' && (
            <div className="theme-card p-6 text-center space-y-3">
              <h2 className="text-lg font-bold text-foreground">{t('listNotFoundTitle')}</h2>
              <p className="text-sm text-gray-500">{t('listNotFoundBody')}</p>
              <Link href="/" className="theme-btn theme-btn-primary inline-flex px-4 py-3 text-sm uppercase tracking-wide">
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

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import LanguageToggle from '../components/LanguageToggle';
import { fetchExchangeRates } from '../constants/currencies';
import { useLanguage } from '../context/LanguageContext';
import {
  createComparisonList,
  ensureComparisonListsInitialized,
  getAllComparisonLists,
  removeComparisonList,
  saveComparisonList,
} from '../lib/comparison-lists';
import { enrichProducts, formatCurrencyAmount, getNumberLocale, groupProductsByUnitType } from '../lib/comparison-math';
import { Archive, ArrowRight, FolderOpen, Layers3, Plus, Trash2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [lists, setLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [summaryMap, setSummaryMap] = useState({});
  const [newList, setNewList] = useState({ name: '', category: '' });
  const { t, locale } = useLanguage();
  const numberLocale = getNumberLocale(locale);

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

  useEffect(() => {
    let isMounted = true;

    const buildSummaries = async () => {
      const listsWithProducts = lists.filter((list) => list.products.length > 0);
      if (listsWithProducts.length === 0) {
        if (isMounted) {
          setSummaryMap({});
        }
        return;
      }

      const rateEntries = await Promise.all(
        [...new Set(listsWithProducts.map((list) => list.baseCurrency))].map(async (currency) => {
          try {
            return [currency, await fetchExchangeRates(currency)];
          } catch (error) {
            console.error(`Failed to fetch summary rates for ${currency}:`, error);
            return [currency, null];
          }
        })
      );

      const ratesByCurrency = Object.fromEntries(rateEntries);
      const nextSummaryMap = {};

      for (const list of listsWithProducts) {
        const exchangeRates = ratesByCurrency[list.baseCurrency];
        if (!exchangeRates) continue;

        const groupedProducts = groupProductsByUnitType(
          enrichProducts(list.products, exchangeRates, list.baseCurrency, list.unitSystem)
        );

        nextSummaryMap[list.id] = groupedProducts.slice(0, 2).map((group) => ({
          unitType: group.unitType,
          baseUnit: group.baseUnit,
          bestProduct: group.products[0],
        }));
      }

      if (isMounted) {
        setSummaryMap(nextSummaryMap);
      }
    };

    buildSummaries();

    return () => {
      isMounted = false;
    };
  }, [lists]);

  const activeLists = useMemo(
    () => lists.filter((list) => !list.archived),
    [lists]
  );

  const archivedLists = useMemo(
    () => lists.filter((list) => list.archived),
    [lists]
  );

  const refreshLists = async () => {
    const nextLists = await getAllComparisonLists();
    setLists(nextLists);
  };

  const handleCreateList = async (event) => {
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

  const handleToggleArchive = async (list) => {
    try {
      const savedList = await saveComparisonList({
        ...list,
        archived: !list.archived,
        updatedAt: new Date().toISOString(),
      }, locale);

      setLists((prev) => prev.map((item) => item.id === savedList.id ? savedList : item));
      toast.success(savedList.archived ? t('listArchivedSuccess') : t('listUnarchivedSuccess'));
    } catch (error) {
      console.error('Failed to toggle archive state:', error);
      toast.error(t('listArchiveError'));
    }
  };

  const handleDeleteList = async (listId) => {
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

  const formatDate = (value) => new Intl.DateTimeFormat(numberLocale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

  const renderListCard = (list) => {
    const summaries = summaryMap[list.id] || [];

    return (
      <div key={list.id} className="theme-card p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{list.name}</h2>
            <p className="text-sm text-gray-500">
              {list.category || t('uncategorizedList')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleArchive(list)}
              aria-label={list.archived ? t('unarchiveList') : t('archiveList')}
              className="w-9 h-9 flex items-center justify-center border-theme bg-surface text-foreground shadow-theme-sm hover:-translate-y-0.5 hover:shadow-theme-base transition-all rounded-theme"
            >
              <Archive className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteList(list.id)}
              aria-label={t('deleteList')}
              className="w-9 h-9 flex items-center justify-center border-theme bg-surface text-red-500 shadow-theme-sm hover:-translate-y-0.5 hover:shadow-theme-base transition-all rounded-theme"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-theme border-theme bg-surface p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">{t('listItemsCount')}</p>
            <p className="text-lg font-bold text-foreground">{list.products.length}</p>
          </div>
          <div className="rounded-theme border-theme bg-surface p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">{t('listBaseCurrency')}</p>
            <p className="text-lg font-bold text-foreground">{list.baseCurrency}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t('listBestSummary')}</p>
          {summaries.length > 0 ? (
            summaries.map((summary) => (
              <div key={`${list.id}-${summary.unitType}`} className="rounded-theme border-theme bg-surface p-3">
                <p className="text-sm font-semibold text-foreground">{summary.bestProduct.name}</p>
                <p className="text-xs text-gray-500">
                  {(t(`unitTypes.${summary.unitType}`) || summary.unitType)} · {formatCurrencyAmount(summary.bestProduct.unitPrice, list.baseCurrency, locale)}/{t(`units.${summary.baseUnit}`) || summary.baseUnit}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">{t('listBestSummaryEmpty')}</p>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{t('listUpdatedAt').replace('{date}', formatDate(list.updatedAt))}</span>
          <Link
            href={`/list/${list.id}`}
            className="theme-btn theme-btn-primary px-4 py-2 text-sm font-semibold inline-flex items-center gap-2"
          >
            {t('openList')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>{t('comparisonListsTitle')}</title>
        <meta name="description" content={t('comparisonListsDescription')} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-surface-100 pb-20 font-sans transition-colors duration-300">
        <header className="bg-primary border-b-theme sticky top-0 z-50 transition-colors duration-300">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-surface border-theme flex items-center justify-center text-foreground font-bold text-lg shadow-theme-sm rounded-theme">
                P
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground tracking-tight">{t('comparisonListsTitle')}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="theme-card p-6 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">{t('comparisonListsEyebrow')}</p>
                <h2 className="text-3xl font-bold text-foreground">{t('comparisonListsHeroTitle')}</h2>
                <p className="text-base text-gray-600 max-w-2xl">{t('comparisonListsHeroBody')}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-theme border-theme bg-surface p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">{t('activeListsLabel')}</p>
                  <p className="text-2xl font-bold text-foreground">{activeLists.length}</p>
                </div>
                <div className="rounded-theme border-theme bg-surface p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">{t('archivedListsLabel')}</p>
                  <p className="text-2xl font-bold text-foreground">{archivedLists.length}</p>
                </div>
                <div className="rounded-theme border-theme bg-surface p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">{t('productsLabel')}</p>
                  <p className="text-2xl font-bold text-foreground">{lists.reduce((sum, list) => sum + list.products.length, 0)}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateList} className="theme-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-foreground" />
                <h2 className="text-lg font-bold text-foreground">{t('createListTitle')}</h2>
              </div>

              <div>
                <label htmlFor="new-list-name" className="block text-xs font-semibold uppercase tracking-wide text-foreground mb-2">
                  {t('listNameLabel')}
                </label>
                <input
                  id="new-list-name"
                  type="text"
                  value={newList.name}
                  onChange={(event) => setNewList((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder={t('listNamePlaceholder')}
                  className="theme-input w-full"
                />
              </div>

              <div>
                <label htmlFor="new-list-category" className="block text-xs font-semibold uppercase tracking-wide text-foreground mb-2">
                  {t('listCategoryLabel')}
                </label>
                <input
                  id="new-list-category"
                  type="text"
                  value={newList.category}
                  onChange={(event) => setNewList((prev) => ({ ...prev, category: event.target.value }))}
                  placeholder={t('listCategoryPlaceholder')}
                  className="theme-input w-full"
                />
              </div>

              <button type="submit" className="theme-btn theme-btn-primary w-full py-3 text-sm uppercase tracking-wide inline-flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                {t('createListAction')}
              </button>
            </form>
          </section>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="theme-card p-5 space-y-3 animate-pulse">
                  <div className="h-5 w-1/2 bg-gray-200 rounded" />
                  <div className="h-4 w-1/3 bg-gray-100 rounded" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-20 bg-gray-100 rounded-theme" />
                    <div className="h-20 bg-gray-100 rounded-theme" />
                  </div>
                  <div className="h-16 bg-gray-100 rounded-theme" />
                </div>
              ))}
            </div>
          ) : activeLists.length === 0 && archivedLists.length === 0 ? (
            <div className="theme-card p-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto bg-surface border-theme shadow-theme-sm rounded-theme flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">{t('listsEmptyTitle')}</h2>
                <p className="text-sm text-gray-500">{t('listsEmptyBody')}</p>
              </div>
            </div>
          ) : (
            <>
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Layers3 className="w-5 h-5 text-foreground" />
                  <h2 className="text-lg font-bold text-foreground">{t('activeListsTitle')}</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {activeLists.map(renderListCard)}
                </div>
              </section>

              {archivedLists.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Archive className="w-5 h-5 text-foreground" />
                    <h2 className="text-lg font-bold text-foreground">{t('archivedListsTitle')}</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {archivedLists.map(renderListCard)}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}

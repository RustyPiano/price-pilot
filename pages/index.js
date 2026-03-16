import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import LanguageToggle from '../components/LanguageToggle';
import PageHeader from '../components/PageHeader';
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

  const activeLists = useMemo(() => lists.filter((list) => !list.archived), [lists]);
  const archivedLists = useMemo(() => lists.filter((list) => list.archived), [lists]);

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

      setLists((prev) => prev.map((item) => (item.id === savedList.id ? savedList : item)));
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
      <article key={list.id} className="panel flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-base font-semibold text-foreground sm:text-lg">{list.name}</h2>
            <p className="text-sm text-muted">
              {list.category || t('uncategorizedList')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleArchive(list)}
              aria-label={list.archived ? t('unarchiveList') : t('archiveList')}
              className="icon-btn"
            >
              <Archive className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteList(list.id)}
              aria-label={t('deleteList')}
              className="icon-btn icon-btn-danger"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="subpanel p-3">
            <p className="text-xs font-medium text-muted">{t('listItemsCount')}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{list.products.length}</p>
          </div>
          <div className="subpanel p-3">
            <p className="text-xs font-medium text-muted">{t('listBaseCurrency')}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{list.baseCurrency}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted">{t('listBestSummary')}</p>
          {summaries.length > 0 ? (
            summaries.map((summary) => (
              <div key={`${list.id}-${summary.unitType}`} className="subpanel p-3">
                <p className="text-sm font-semibold text-foreground">{summary.bestProduct.name}</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {(t(`unitTypes.${summary.unitType}`) || summary.unitType)} · {formatCurrencyAmount(summary.bestProduct.unitPrice, list.baseCurrency, locale)}/{t(`units.${summary.baseUnit}`) || summary.baseUnit}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">{t('listBestSummaryEmpty')}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs leading-5 text-muted">
            {t('listUpdatedAt').replace('{date}', formatDate(list.updatedAt))}
          </span>
          <Link
            href={`/list/${list.id}`}
            className="btn btn-primary w-full px-4 text-sm sm:w-auto"
          >
            {t('openList')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </article>
    );
  };

  return (
    <>
      <Head>
        <title>{locale === 'zh' ? 'Price Pilot · 商品单价对比工具' : 'Price Pilot · Unit Price Comparison'}</title>
        <meta name="description" content={t('metaDescription')} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="keywords" content={locale === 'zh' ? '单价对比,比价工具,超市比价,单价计算,性价比,商品对比,价格对比' : 'unit price comparison,price per unit,grocery comparison,unit cost calculator,shopping comparison'} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={locale === 'zh' ? 'Price Pilot · 商品单价对比工具' : 'Price Pilot · Unit Price Comparison'} />
        <meta property="og:description" content={t('metaDescription')} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={locale === 'zh' ? 'Price Pilot · 商品单价对比工具' : 'Price Pilot · Unit Price Comparison'} />
        <meta name="twitter:description" content={t('metaDescription')} />
      </Head>

      <div className="page-shell">
        <PageHeader title={t('comparisonListsTitle')}>
          <LanguageToggle />
        </PageHeader>

        <main className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:space-y-6 sm:py-6">
          <section className="grid gap-4 lg:grid-cols-[1.25fr_0.95fr]">
            <div className="panel space-y-5 p-5 sm:p-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t('comparisonListsEyebrow')}</p>
                <h2 className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                  {t('comparisonListsHeroTitle')}
                </h2>
                <p className="section-description max-w-2xl">{t('comparisonListsHeroBody')}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="subpanel p-4">
                  <p className="text-xs font-medium text-muted">{t('activeListsLabel')}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{activeLists.length}</p>
                </div>
                <div className="subpanel p-4">
                  <p className="text-xs font-medium text-muted">{t('archivedListsLabel')}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{archivedLists.length}</p>
                </div>
                <div className="subpanel p-4">
                  <p className="text-xs font-medium text-muted">{t('productsLabel')}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {lists.reduce((sum, list) => sum + list.products.length, 0)}
                  </p>
                </div>
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
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="panel space-y-4 p-5">
                  <div className="skeleton-block h-5 w-1/2" />
                  <div className="skeleton-block h-4 w-1/3" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="subpanel space-y-3 p-4">
                      <div className="skeleton-block h-3 w-2/5" />
                      <div className="skeleton-block h-6 w-1/3" />
                    </div>
                    <div className="subpanel space-y-3 p-4">
                      <div className="skeleton-block h-3 w-2/5" />
                      <div className="skeleton-block h-6 w-1/3" />
                    </div>
                  </div>
                  <div className="subpanel space-y-3 p-4">
                    <div className="skeleton-block h-3 w-1/2" />
                    <div className="skeleton-block h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
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
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Layers3 className="h-5 w-5 text-brand" />
                  <h2 className="section-title">{t('activeListsTitle')}</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {activeLists.map(renderListCard)}
                </div>
              </section>

              {archivedLists.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Archive className="h-5 w-5 text-muted" />
                    <h2 className="section-title">{t('archivedListsTitle')}</h2>
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

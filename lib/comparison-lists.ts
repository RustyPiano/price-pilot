import { defaultUnitSystem } from '@/constants/unitSystem';
import type { ComparisonList, ComparisonListDraft, Locale, Product, ProductInput, UnitSystem } from '@/types';

const DB_NAME = 'price-pilot';
const DB_VERSION = 1;
const LISTS_STORE = 'comparisonLists';
const MIGRATION_FLAG_KEY = 'comparisonListsMigratedToIndexedDb';

function cloneDefaultUnitSystem(): UnitSystem {
  return structuredClone(defaultUnitSystem);
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(LISTS_STORE)) {
        const store = database.createObjectStore(LISTS_STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
        store.createIndex('archived', 'archived');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function safeParseLocalStorage<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch (error) {
    console.error(`Failed to parse localStorage key "${key}":`, error);
    window.localStorage.removeItem(key);
    return fallback;
  }
}

export function buildEntityId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeProduct(product: Partial<ProductInput> | Partial<Product>): Product {
  return {
    id: product.id || product.timestamp || buildEntityId('product'),
    name: typeof product.name === 'string' ? product.name.trim() : '',
    price: typeof product.price === 'number' ? product.price : Number(product.price ?? 0),
    quantity: typeof product.quantity === 'number' ? product.quantity : Number(product.quantity ?? 0),
    unit: typeof product.unit === 'string' ? product.unit : '',
    currency: typeof product.currency === 'string' ? product.currency : 'CNY',
    timestamp: product.timestamp || new Date().toISOString(),
  };
}

export function normalizeComparisonList(
  list: ComparisonListDraft,
  locale: Locale = 'zh'
): ComparisonList {
  const now = new Date().toISOString();

  return {
    id: list.id || buildEntityId('list'),
    name: list.name?.trim() || (locale === 'zh' ? '未命名清单' : 'Untitled list'),
    category: list.category?.trim() || '',
    products: Array.isArray(list.products) ? list.products.map(normalizeProduct) : [],
    baseCurrency: list.baseCurrency || 'CNY',
    unitSystem: list.unitSystem ? structuredClone(list.unitSystem) : cloneDefaultUnitSystem(),
    recentUnits: Array.isArray(list.recentUnits) ? list.recentUnits.slice(0, 6) : [],
    archived: Boolean(list.archived),
    createdAt: list.createdAt || now,
    updatedAt: list.updatedAt || now,
  };
}

export function createComparisonList({
  name,
  category = '',
  locale = 'zh',
}: {
  name: string;
  category?: string;
  locale?: Locale;
}): ComparisonList {
  const now = new Date().toISOString();

  return normalizeComparisonList(
    {
      id: buildEntityId('list'),
      name,
      category,
      products: [],
      baseCurrency: 'CNY',
      unitSystem: cloneDefaultUnitSystem(),
      recentUnits: [],
      archived: false,
      createdAt: now,
      updatedAt: now,
    },
    locale
  );
}

export async function getAllComparisonLists(): Promise<ComparisonList[]> {
  const database = await openDatabase();
  const transaction = database.transaction(LISTS_STORE, 'readonly');
  const store = transaction.objectStore(LISTS_STORE);
  const lists = await requestToPromise(store.getAll());
  database.close();

  return lists
    .map((list) => normalizeComparisonList(list as ComparisonListDraft))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export async function getComparisonList(id: string): Promise<ComparisonList | null> {
  const database = await openDatabase();
  const transaction = database.transaction(LISTS_STORE, 'readonly');
  const store = transaction.objectStore(LISTS_STORE);
  const list = await requestToPromise(store.get(id));
  database.close();

  return list ? normalizeComparisonList(list as ComparisonListDraft) : null;
}

export async function saveComparisonList(
  list: ComparisonListDraft,
  locale: Locale = 'zh'
): Promise<ComparisonList> {
  const database = await openDatabase();
  const transaction = database.transaction(LISTS_STORE, 'readwrite');
  const store = transaction.objectStore(LISTS_STORE);
  const normalizedList = normalizeComparisonList(list, locale);

  await requestToPromise(store.put(normalizedList));
  database.close();

  return normalizedList;
}

export async function removeComparisonList(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(LISTS_STORE, 'readwrite');
  const store = transaction.objectStore(LISTS_STORE);
  await requestToPromise(store.delete(id));
  database.close();
}

export async function ensureComparisonListsInitialized(
  locale: Locale = 'zh'
): Promise<ComparisonList[]> {
  const existingLists = await getAllComparisonLists();
  if (existingLists.length > 0 || typeof window === 'undefined') {
    return existingLists;
  }

  if (window.localStorage.getItem(MIGRATION_FLAG_KEY) === '1') {
    return existingLists;
  }

  const legacyProducts = safeParseLocalStorage<Partial<Product>[]>('products', []).map(normalizeProduct);
  const legacyUnitSystem = safeParseLocalStorage<UnitSystem>('unitSystem', cloneDefaultUnitSystem());
  const legacyRecentUnits = safeParseLocalStorage<string[]>('recentUnits', []);
  const legacyCurrency = window.localStorage.getItem('baseCurrency') || 'CNY';
  const hasLegacyData = legacyProducts.length > 0;

  if (hasLegacyData) {
    const migratedList = normalizeComparisonList(
      {
        id: buildEntityId('list'),
        name: locale === 'zh' ? '默认比价清单' : 'Starter comparison list',
        category: '',
        products: legacyProducts,
        baseCurrency: legacyCurrency,
        unitSystem: legacyUnitSystem,
        recentUnits: legacyRecentUnits,
        archived: false,
      },
      locale
    );

    await saveComparisonList(migratedList, locale);
  }

  window.localStorage.setItem(MIGRATION_FLAG_KEY, '1');
  window.localStorage.removeItem('products');
  window.localStorage.removeItem('baseCurrency');
  window.localStorage.removeItem('unitSystem');
  window.localStorage.removeItem('recentUnits');

  return getAllComparisonLists();
}

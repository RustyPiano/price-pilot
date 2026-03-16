import { defaultUnitSystem } from '../constants/unitSystem';

const DB_NAME = 'price-pilot';
const DB_VERSION = 1;
const LISTS_STORE = 'comparisonLists';
const MIGRATION_FLAG_KEY = 'comparisonListsMigratedToIndexedDb';

const cloneDefaultUnitSystem = () => structuredClone(defaultUnitSystem);

const requestToPromise = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const openDatabase = () => new Promise((resolve, reject) => {
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

const safeParseLocalStorage = (key, fallback) => {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error(`Failed to parse localStorage key "${key}":`, error);
    window.localStorage.removeItem(key);
    return fallback;
  }
};

export const buildEntityId = (prefix) => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const normalizeProduct = (product) => ({
  ...product,
  id: product.id || product.timestamp || buildEntityId('product'),
  timestamp: product.timestamp || new Date().toISOString(),
});

export const normalizeComparisonList = (list, locale = 'zh') => {
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
};

export const createComparisonList = ({ name, category = '', locale = 'zh' }) => {
  const now = new Date().toISOString();

  return normalizeComparisonList({
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
  }, locale);
};

export async function getAllComparisonLists() {
  const database = await openDatabase();
  const transaction = database.transaction(LISTS_STORE, 'readonly');
  const store = transaction.objectStore(LISTS_STORE);
  const lists = await requestToPromise(store.getAll());
  database.close();

  return lists
    .map((list) => normalizeComparisonList(list))
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
}

export async function getComparisonList(id) {
  const database = await openDatabase();
  const transaction = database.transaction(LISTS_STORE, 'readonly');
  const store = transaction.objectStore(LISTS_STORE);
  const list = await requestToPromise(store.get(id));
  database.close();

  return list ? normalizeComparisonList(list) : null;
}

export async function saveComparisonList(list, locale = 'zh') {
  const database = await openDatabase();
  const transaction = database.transaction(LISTS_STORE, 'readwrite');
  const store = transaction.objectStore(LISTS_STORE);
  const normalizedList = normalizeComparisonList(list, locale);

  await requestToPromise(store.put(normalizedList));
  database.close();

  return normalizedList;
}

export async function removeComparisonList(id) {
  const database = await openDatabase();
  const transaction = database.transaction(LISTS_STORE, 'readwrite');
  const store = transaction.objectStore(LISTS_STORE);
  await requestToPromise(store.delete(id));
  database.close();
}

export async function ensureComparisonListsInitialized(locale = 'zh') {
  const existingLists = await getAllComparisonLists();
  if (existingLists.length > 0 || typeof window === 'undefined') {
    return existingLists;
  }

  if (window.localStorage.getItem(MIGRATION_FLAG_KEY) === '1') {
    return existingLists;
  }

  const legacyProducts = safeParseLocalStorage('products', []).map(normalizeProduct);
  const legacyUnitSystem = safeParseLocalStorage('unitSystem', cloneDefaultUnitSystem());
  const legacyRecentUnits = safeParseLocalStorage('recentUnits', []);
  const legacyCurrency = window.localStorage.getItem('baseCurrency') || 'CNY';
  const hasLegacyData = legacyProducts.length > 0;

  if (hasLegacyData) {
    const migratedList = normalizeComparisonList({
      id: buildEntityId('list'),
      name: locale === 'zh' ? '默认比价清单' : 'Starter comparison list',
      category: '',
      products: legacyProducts,
      baseCurrency: legacyCurrency,
      unitSystem: legacyUnitSystem,
      recentUnits: legacyRecentUnits,
      archived: false,
    }, locale);

    await saveComparisonList(migratedList, locale);
  }

  window.localStorage.setItem(MIGRATION_FLAG_KEY, '1');
  window.localStorage.removeItem('products');
  window.localStorage.removeItem('baseCurrency');
  window.localStorage.removeItem('unitSystem');
  window.localStorage.removeItem('recentUnits');

  return getAllComparisonLists();
}

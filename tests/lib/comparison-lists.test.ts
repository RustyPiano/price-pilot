import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildEntityId,
  createComparisonList,
  ensureComparisonListsInitialized,
  getAllComparisonLists,
  getComparisonList,
  normalizeComparisonList,
  normalizeProduct,
  removeComparisonList,
  safeParseLocalStorage,
  saveComparisonList,
} from '@/lib/comparison-lists';

async function resetDatabase() {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('price-pilot');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function installStorageMock() {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key) ?? null : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };

  Object.defineProperty(window, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
}

describe('comparison-lists', () => {
  beforeEach(async () => {
    installStorageMock();
    await resetDatabase();
  });

  afterEach(async () => {
    await resetDatabase();
  });

  it('normalizes products and lists with defaults', () => {
    const product = normalizeProduct({ name: 'Milk', price: 8, quantity: 1, unit: 'l', currency: 'CNY' });
    const list = normalizeComparisonList({ name: '', products: [] }, 'en');

    expect(product.id).toBeTruthy();
    expect(product.timestamp).toBeTruthy();
    expect(list.name).toBe('Untitled list');
    expect(list.baseCurrency).toBe('CNY');
    expect(Array.isArray(list.products)).toBe(true);
  });

  it('parses localStorage safely and removes invalid JSON', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.localStorage.setItem('broken', '{oops');

    expect(safeParseLocalStorage('broken', ['fallback'])).toEqual(['fallback']);
    expect(window.localStorage.getItem('broken')).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('supports IndexedDB CRUD operations', async () => {
    const createdList = createComparisonList({ name: 'Groceries', locale: 'en' });
    const savedList = await saveComparisonList(createdList, 'en');
    const loadedList = await getComparisonList(savedList.id);
    const allLists = await getAllComparisonLists();

    expect(buildEntityId('list')).toBeTruthy();
    expect(loadedList?.id).toBe(savedList.id);
    expect(allLists).toHaveLength(1);

    await removeComparisonList(savedList.id);
    expect(await getComparisonList(savedList.id)).toBeNull();
  });

  it('migrates legacy localStorage data into IndexedDB', async () => {
    window.localStorage.setItem('products', JSON.stringify([
      { name: 'Tea', price: 12, quantity: 500, unit: 'g', currency: 'CNY' },
    ]));
    window.localStorage.setItem('baseCurrency', 'CNY');
    window.localStorage.setItem('recentUnits', JSON.stringify(['g']));

    const lists = await ensureComparisonListsInitialized('zh');

    expect(lists).toHaveLength(1);
    expect(lists[0]?.products).toHaveLength(1);
    expect(window.localStorage.getItem('products')).toBeNull();
  });
});

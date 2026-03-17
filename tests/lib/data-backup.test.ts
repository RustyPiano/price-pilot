import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { exportAllData, importBackupText, parseBackupText } from '@/lib/data-backup';
import { createComparisonList, getAllComparisonLists, saveComparisonList } from '@/lib/comparison-lists';

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

describe('data-backup', () => {
  beforeEach(async () => {
    installStorageMock();
    await resetDatabase();
  });

  afterEach(async () => {
    await resetDatabase();
  });

  it('exports and re-imports backup data', async () => {
    const list = createComparisonList({ name: 'Pantry', locale: 'en' });
    await saveComparisonList({
      ...list,
      products: [
        {
          id: 'rice',
          name: 'Rice',
          price: 10,
          quantity: 1,
          unit: 'kg',
          currency: 'CNY',
          timestamp: '2026-03-17T00:00:00.000Z',
        },
      ],
    }, 'en');

    const backup = await exportAllData();
    const result = await importBackupText(JSON.stringify(backup), 'duplicate', 'en');
    const allLists = await getAllComparisonLists();

    expect(backup.app).toBe('price-pilot');
    expect(result.imported).toBe(1);
    expect(allLists).toHaveLength(2);
  });

  it('rejects invalid backup payloads', () => {
    expect(() => parseBackupText('{"app":"wrong"}')).toThrow('Invalid backup payload.');
  });
});

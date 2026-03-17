import { isSupportedCurrencyCode } from '@/constants/currencies';
import {
  buildEntityId,
  getAllComparisonLists,
  normalizeComparisonList,
  saveComparisonList,
} from '@/lib/comparison-lists';
import type {
  BackupData,
  ComparisonList,
  ComparisonListDraft,
  ImportResult,
  ImportStrategy,
  Locale,
  Product,
} from '@/types';

function isValidProduct(product: Partial<Product>): boolean {
  return (
    typeof product.price === 'number' &&
    Number.isFinite(product.price) &&
    typeof product.quantity === 'number' &&
    Number.isFinite(product.quantity) &&
    typeof product.unit === 'string' &&
    product.unit.length > 0
  );
}

function validateBackupPayload(value: unknown): value is BackupData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<BackupData>;
  return (
    candidate.app === 'price-pilot' &&
    candidate.version === 1 &&
    Array.isArray(candidate.lists)
  );
}

function validateListDraft(list: ComparisonListDraft): boolean {
  if (!Array.isArray(list.products)) {
    return false;
  }

  return list.products.every((product) => isValidProduct(product as Product));
}

function duplicateListIdentity(list: ComparisonList): ComparisonList {
  return normalizeComparisonList({
    ...list,
    id: buildEntityId('list'),
    updatedAt: new Date().toISOString(),
  });
}

export async function exportAllData(): Promise<BackupData> {
  const lists = await getAllComparisonLists();

  return {
    version: 1,
    app: 'price-pilot',
    exportedAt: new Date().toISOString(),
    lists,
  };
}

export function downloadAsJson(data: BackupData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `price-pilot-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();

  URL.revokeObjectURL(url);
}

export function parseBackupText(text: string): BackupData {
  const parsedValue = JSON.parse(text) as unknown;
  if (!validateBackupPayload(parsedValue)) {
    throw new Error('Invalid backup payload.');
  }

  return parsedValue;
}

export async function importBackupText(
  text: string,
  strategy: ImportStrategy,
  locale: Locale = 'zh'
): Promise<ImportResult> {
  const backup = parseBackupText(text);
  const existingLists = await getAllComparisonLists();
  const existingListMap = new Map(existingLists.map((list) => [list.id, list]));
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
  };

  for (const [index, rawList] of backup.lists.entries()) {
    if (!validateListDraft(rawList)) {
      result.errors.push(`List ${index + 1} is invalid and was skipped.`);
      result.skipped += 1;
      continue;
    }

    const normalizedList = normalizeComparisonList(rawList, locale);

    if (!isSupportedCurrencyCode(String(normalizedList.baseCurrency))) {
      result.errors.push(`List ${normalizedList.name} uses an unsupported base currency.`);
      result.skipped += 1;
      continue;
    }

    const existingList = existingListMap.get(normalizedList.id);

    if (existingList && strategy === 'merge') {
      result.skipped += 1;
      continue;
    }

    const listToSave =
      existingList && strategy === 'duplicate'
        ? duplicateListIdentity(normalizedList)
        : normalizedList;

    const savedList = await saveComparisonList(listToSave, locale);
    existingListMap.set(savedList.id, savedList);
    result.imported += 1;
  }

  return result;
}

export async function importFromJson(
  file: File,
  strategy: ImportStrategy,
  locale: Locale = 'zh'
): Promise<ImportResult> {
  const text = await file.text();
  return importBackupText(text, strategy, locale);
}

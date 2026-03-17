import { normalizeComparisonList } from '@/lib/comparison-lists';
import type { ComparisonList, ComparisonListDraft, Locale, SharedComparisonList } from '@/types';

function encodeBytes(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function encodeSharedComparisonList(
  list: ComparisonListDraft,
  locale: Locale = 'zh'
): string {
  const normalizedList = normalizeComparisonList(list, locale);
  const payload: SharedComparisonList = {
    name: normalizedList.name,
    category: normalizedList.category,
    products: normalizedList.products,
    baseCurrency: normalizedList.baseCurrency,
    unitSystem: normalizedList.unitSystem,
    recentUnits: normalizedList.recentUnits,
  };

  return encodeBytes(new TextEncoder().encode(JSON.stringify(payload)));
}

export function decodeSharedComparisonList(
  value: string,
  locale: Locale = 'zh'
): ComparisonList | null {
  try {
    const decodedText = new TextDecoder().decode(decodeBytes(value));
    const parsedValue = JSON.parse(decodedText) as ComparisonListDraft;

    return normalizeComparisonList(
      {
        ...parsedValue,
        archived: false,
      },
      locale
    );
  } catch (error) {
    console.error('Failed to decode shared comparison list:', error);
    return null;
  }
}

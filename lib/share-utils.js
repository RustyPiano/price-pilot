import { normalizeComparisonList } from './comparison-lists';

const encodeBytes = (bytes) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const decodeBytes = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

export function encodeSharedComparisonList(list, locale = 'zh') {
  const normalizedList = normalizeComparisonList(list, locale);
  const payload = {
    name: normalizedList.name,
    category: normalizedList.category,
    products: normalizedList.products,
    baseCurrency: normalizedList.baseCurrency,
    unitSystem: normalizedList.unitSystem,
    recentUnits: normalizedList.recentUnits,
  };

  return encodeBytes(new TextEncoder().encode(JSON.stringify(payload)));
}

export function decodeSharedComparisonList(value, locale = 'zh') {
  const decodedText = new TextDecoder().decode(decodeBytes(value));
  const parsedValue = JSON.parse(decodedText);

  return normalizeComparisonList({
    ...parsedValue,
    archived: false,
  }, locale);
}

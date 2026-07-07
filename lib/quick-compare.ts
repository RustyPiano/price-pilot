import type { QuickCompareRow, QuickRowResult } from '@/types';

type ParsedRow = { isValid: true; unitPrice: number } | { isValid: false; unitPrice: null };

function parseRow(row: QuickCompareRow): ParsedRow {
  const price = parseFloat(row.price);
  const quantity = parseFloat(row.quantity);

  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
    return { isValid: false, unitPrice: null };
  }

  return { isValid: true, unitPrice: price / quantity };
}

export function compareQuickRows(rows: QuickCompareRow[]): QuickRowResult[] {
  const parsedRows = rows.map(parseRow);
  const validUnitPrices = parsedRows
    .filter((row): row is { isValid: true; unitPrice: number } => row.isValid)
    .map((row) => row.unitPrice);

  // 有效行不足两个还构不成对比, 只回显各自的单价。
  const bestUnitPrice = validUnitPrices.length >= 2 ? Math.min(...validUnitPrices) : null;

  return parsedRows.map((row): QuickRowResult => {
    if (!row.isValid) {
      return { unitPrice: null, isBest: false, pctAboveBest: null };
    }

    if (bestUnitPrice === null) {
      return { unitPrice: row.unitPrice, isBest: false, pctAboveBest: null };
    }

    const isBest = row.unitPrice === bestUnitPrice;
    return {
      unitPrice: row.unitPrice,
      isBest,
      pctAboveBest: isBest ? null : Math.round((row.unitPrice / bestUnitPrice - 1) * 100),
    };
  });
}

export function formatUnitPrice(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }

  if (value >= 100) {
    return value.toFixed(1);
  }

  if (value >= 1) {
    return value.toFixed(2);
  }

  if (value >= 0.01) {
    return value.toFixed(3);
  }

  return value.toFixed(4);
}

import { defaultUnitSystem } from '@/constants/unitSystem';
import type { QuickCompareRow, QuickRowResult } from '@/types';

/** 快速对比单位 chip 的选项, 只列货架常用单位。 */
export const QUICK_UNIT_GROUPS: Array<[category: string, units: string[]]> = [
  ['weight', ['g', 'kg', 'jin', 'liang', 'oz', 'lb']],
  ['volume', ['ml', 'l', 'floz', 'gal']],
  ['piece', ['piece', 'dozen']],
  ['length', ['cm', 'm']],
];

/** 促销按「实际支付几件的钱 ÷ 得到几件」折算成单件价格。 */
export const QUICK_PROMOS: Record<string, { pay: number; get: number }> = {
  half2: { pay: 1.5, get: 2 },
  b1g1: { pay: 1, get: 2 },
  b2g1: { pay: 2, get: 3 },
  b3g1: { pay: 3, get: 4 },
  d95: { pay: 0.95, get: 1 },
  d9: { pay: 0.9, get: 1 },
  d88: { pay: 0.88, get: 1 },
  d85: { pay: 0.85, get: 1 },
  d8: { pay: 0.8, get: 1 },
  d75: { pay: 0.75, get: 1 },
  d7: { pay: 0.7, get: 1 },
  d6: { pay: 0.6, get: 1 },
  d5: { pay: 0.5, get: 1 },
};

const UNIT_INFO = new Map(
  Object.entries(defaultUnitSystem).flatMap(([category, info]) =>
    Object.entries(info.conversions).map(([unit, conversion]) => [unit, { category, rate: conversion.rate }] as const)
  )
);

// 未指定单位按计件、rate 1 计算, 与没有单位 chip 时的结果一致。
const UNSPECIFIED_UNIT = { category: 'piece', rate: 1 };

function getUnitInfo(unit: string) {
  return UNIT_INFO.get(unit) ?? UNSPECIFIED_UNIT;
}

/** 「24×500」按 24 × 500 计算; 任何一段不是正数都返回 NaN。 */
export function parseQuickQuantity(raw: string): number {
  const parts = raw.split('×').map(Number);
  return parts.every((part) => Number.isFinite(part) && part > 0)
    ? parts.reduce((product, part) => product * part, 1)
    : NaN;
}

// 克和毫升的单价太小 (¥0.016), 按每 100 克、每 100 毫升显示; 其他单位按每 1 个该单位显示。
function getDisplayUnit(unit: string): { displayUnit: string; displayAmount: number } {
  return { displayUnit: unit, displayAmount: unit === 'g' || unit === 'ml' ? 100 : 1 };
}

interface ParsedRow {
  category: string;
  unit: string;
  /** 每 1 个类别基准单位 (千克、升、件……) 的价格。 */
  basePrice: number;
}

function parseRow(row: QuickCompareRow): ParsedRow | null {
  const price = parseFloat(row.price);
  const quantity = parseQuickQuantity(row.quantity);

  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(quantity)) {
    return null;
  }

  const unitInfo = getUnitInfo(row.unit);
  const promo = QUICK_PROMOS[row.promo];
  const packPrice = promo ? (price * promo.pay) / promo.get : price;

  return { category: unitInfo.category, unit: row.unit, basePrice: packPrice / (quantity * unitInfo.rate) };
}

export function compareQuickRows(rows: QuickCompareRow[]): QuickRowResult[] {
  const parsedRows = rows.map(parseRow);
  const leadRow = parsedRows.find((row) => row !== null);
  const leadDisplay = getDisplayUnit(leadRow?.unit ?? '');
  const comparablePrices = parsedRows
    .filter((row): row is ParsedRow => row !== null && row.category === leadRow?.category)
    .map((row) => row.basePrice);

  // 可比较的行不足两个还构不成对比, 只回显各自的单价。
  const bestBasePrice = comparablePrices.length >= 2 ? Math.min(...comparablePrices) : null;

  return parsedRows.map((row): QuickRowResult => {
    if (!row) {
      return { unitPrice: null, isBest: false, pctAboveBest: null, displayUnit: '', displayAmount: 1, comparable: false };
    }

    const comparable = row.category === leadRow?.category;
    const display = comparable ? leadDisplay : getDisplayUnit(row.unit);
    const unitPrice = row.basePrice * getUnitInfo(display.displayUnit).rate * display.displayAmount;

    if (!comparable || bestBasePrice === null) {
      return { unitPrice, isBest: false, pctAboveBest: null, ...display, comparable };
    }

    const isBest = row.basePrice === bestBasePrice;
    return {
      unitPrice,
      isBest,
      pctAboveBest: isBest ? null : Math.round((row.basePrice / bestBasePrice - 1) * 100),
      ...display,
      comparable,
    };
  });
}

const SAVED_ROWS_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export function serializeQuickRows(rows: QuickCompareRow[], now = Date.now()): string {
  return JSON.stringify({ savedAt: now, rows });
}

/** 超过 2 小时的记录不恢复, 避免第二天打开还看到上次购物时的数字。 */
export function restoreQuickRows(raw: string | null, now = Date.now()): QuickCompareRow[] | null {
  if (!raw) {
    return null;
  }

  const saved = JSON.parse(raw) as { savedAt: number; rows: QuickCompareRow[] };
  return now - saved.savedAt <= SAVED_ROWS_MAX_AGE_MS ? saved.rows : null;
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

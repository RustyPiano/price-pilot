import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/context/LanguageContext';
import InstallHint from '@/components/InstallHint';
import PriceLockup from '@/components/PriceLockup';
import {
  QUICK_PROMOS,
  QUICK_UNIT_GROUPS,
  compareQuickRows,
  formatUnitPrice,
  parseQuickQuantity,
  restoreQuickRows,
  serializeQuickRows,
} from '@/lib/quick-compare';
import { getCompactUnitLabel } from '@/lib/comparison-math';
import { buildEntityId, createComparisonList, saveComparisonList } from '@/lib/comparison-lists';
import type { ProductInput, QuickCompareRow, QuickRowResult } from '@/types';

const INITIAL_ROWS = 2;
const MAX_ROWS = 6;
const MAX_PRICE_LENGTH = 10;
const MAX_QUANTITY_LENGTH = 12;
const STORAGE_KEY = 'quickCompareRows';

const emptyResult: QuickRowResult = {
  unitPrice: null,
  isBest: false,
  pctAboveBest: null,
  displayUnit: '',
  displayAmount: 1,
  comparable: false,
};

function createEmptyRow(unit: string): QuickCompareRow {
  return { id: buildEntityId('quick'), price: '', quantity: '', unit, promo: '' };
}

function createInitialRows(): QuickCompareRow[] {
  // 初始行参与 SSR, 必须用确定性 id — 随机 id 会让服务端与客户端各生成一份, 触发 hydration mismatch。
  return Array.from({ length: INITIAL_ROWS }, (_, index) => ({
    id: `quick-initial-${index}`,
    price: '',
    quantity: '',
    unit: '',
    promo: '',
  }));
}

// 只保留数字与至多一个小数点。
function sanitizeNumber(raw: string): string {
  const digitsAndDots = raw.replace(/[^0-9.]/g, '');
  const firstDot = digitsAndDots.indexOf('.');

  return firstDot === -1
    ? digitsAndDots
    : digitsAndDots.slice(0, firstDot + 1) + digitsAndDots.slice(firstDot + 1).replace(/\./g, '');
}

// 数量允许一个乘号 (多件装), 键盘输入的 * x X 都转换成 ×。
function sanitizeQuantity(raw: string): string {
  const [count = '', ...rest] = raw.replace(/[*xX]/g, '×').split('×');
  const value = rest.length > 0 ? `${sanitizeNumber(count)}×${sanitizeNumber(rest.join(''))}` : sanitizeNumber(count);

  return value.slice(0, MAX_QUANTITY_LENGTH);
}

function isRowFilled(row: QuickCompareRow): boolean {
  const price = parseFloat(row.price);
  return Number.isFinite(price) && price > 0 && Number.isFinite(parseQuickQuantity(row.quantity));
}

function rowLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

// 保存到清单时价格四舍五入到 4 位小数, 避免 9.9×1.5 存成 14.850000000000001。
function roundStoredPrice(value: number): number {
  return Math.round(value * 10000) / 10000;
}

interface ChipSelectProps {
  ariaLabel: string;
  value: string;
  /** 当前选中项的文字, chip 按这段文字的宽度显示。 */
  selectedLabel: string;
  onChange: (value: string) => void;
  className: string;
  children: ReactNode;
}

// 原生 select 的宽度由最长的选项决定, 会盖住输入框中间。这里让 chip 只显示选中项的文字,
// 透明的 select 叠在上面接收点击, 手机上仍弹出系统选择列表。
function ChipSelect({ ariaLabel, value, selectedLabel, onChange, className, children }: ChipSelectProps) {
  return (
    <span className={`quick-chip ${value ? 'is-set' : ''} ${className}`}>
      <span aria-hidden="true">{selectedLabel}</span>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {children}
      </select>
    </span>
  );
}

export default function QuickCompare() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rows, setRows] = useState<QuickCompareRow[]>(createInitialRows);
  const [hasRestored, setHasRestored] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const results = useMemo(() => compareQuickRows(rows), [rows]);
  const validCount = results.filter((result) => result.unitPrice !== null).length;
  const isComparing = validCount >= 2;
  const hasMismatch = results.some((result) => result.unitPrice !== null && !result.comparable);
  const winnerIndex = results.findIndex((result) => result.isBest);
  const worstPct = results.reduce(
    (max, result) => (result.pctAboveBest !== null && result.pctAboveBest > max ? result.pctAboveBest : max),
    0
  );

  const lastRow = rows[rows.length - 1];
  const atLimit = rows.length >= MAX_ROWS && !!lastRow && isRowFilled(lastRow);

  const currencySymbol = locale === 'zh' ? '¥' : '$';
  const currencyCode = locale === 'zh' ? 'CNY' : 'USD';
  const unitPriceLabel = t('quickCompareUnitPriceLabel');
  const itemLabel = t('quickCompareItemLabel');

  // 恢复放在挂载之后: 首屏仍渲染确定性的初始行, 避免 hydration mismatch。
  // 用 localStorage 是因为 iOS 结束 PWA 进程后 sessionStorage 会被清空。
  useEffect(() => {
    const restoredRows = restoreQuickRows(window.localStorage.getItem(STORAGE_KEY));
    if (restoredRows) {
      setRows(restoredRows);
    }
    setHasRestored(true);
  }, []);

  useEffect(() => {
    if (hasRestored) {
      window.localStorage.setItem(STORAGE_KEY, serializeQuickRows(rows));
    }
  }, [rows, hasRestored]);

  // 仅桌面端 (可悬停的精确指针) 在挂载后聚焦首格, 移动端不自动弹键盘。
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }

    containerRef.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, []);

  const updateRows = (update: (prev: QuickCompareRow[]) => QuickCompareRow[]) => {
    setRows((prev) => {
      const next = update(prev);
      const tail = next[next.length - 1];

      // 新追加的行沿用上一行的单位, 连续比较 500g、1kg、2.5kg 时不用每行都选。
      if (tail && isRowFilled(tail) && next.length < MAX_ROWS) {
        return [...next, createEmptyRow(tail.unit)];
      }

      return next;
    });
  };

  const handleFieldChange = (rowId: string, field: 'price' | 'quantity', rawValue: string) => {
    const value = field === 'price' ? sanitizeNumber(rawValue).slice(0, MAX_PRICE_LENGTH) : sanitizeQuantity(rawValue);
    updateRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)));
  };

  // 改了一行的单位后, 其余还没指定单位的行跟着换成同一单位; 已手动设置过的行不覆盖。
  const handleUnitChange = (rowId: string, unit: string) => {
    updateRows((prev) =>
      prev.map((row) => (row.id === rowId || (unit !== '' && row.unit === '') ? { ...row, unit } : row))
    );
  };

  const handlePromoChange = (rowId: string, promo: string) => {
    updateRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, promo } : row)));
  };

  const handleInsertMultiply = (row: QuickCompareRow, quantityId: string) => {
    handleFieldChange(row.id, 'quantity', `${row.quantity}×`);
    document.getElementById(quantityId)?.focus();
  };

  const handleEnterAdvance = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('input'));
    const nextInput = inputs[inputs.indexOf(event.currentTarget) + 1];
    nextInput?.focus();
  };

  const handleReset = () => {
    setRows(createInitialRows());
    setIsSaving(false);
  };

  const getPerLabel = (result: QuickRowResult) => {
    if (result.displayUnit === '') {
      return t('unit');
    }

    const unitLabel = getCompactUnitLabel(result.displayUnit, locale);
    return result.displayAmount === 1 ? unitLabel : `${result.displayAmount}${unitLabel}`;
  };

  const handleSaveAsList = async () => {
    if (!isComparing || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      // 促销行按实际支付总额和得到的总件数保存, 清单里的单价与这里一致。
      const products: ProductInput[] = rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => isRowFilled(row))
        .map(({ row, index }) => {
          const promo = QUICK_PROMOS[row.promo];
          const baseName = `${itemLabel} ${rowLetter(index)}`;

          return {
            name: promo
              ? t('quickCompareProductWithPromo')
                .replace('{name}', baseName)
                .replace('{promo}', t(`quickPromos.${row.promo}`))
              : baseName,
            price: roundStoredPrice(parseFloat(row.price) * (promo?.pay ?? 1)),
            quantity: parseQuickQuantity(row.quantity) * (promo?.get ?? 1),
            unit: row.unit || 'piece',
            currency: currencyCode,
          };
        });

      const dateLabel = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'short',
        day: 'numeric',
      }).format(new Date());

      const draft = createComparisonList({
        name: `${t('quickCompareListNamePrefix')} ${dateLabel}`,
        locale,
      });

      const savedList = await saveComparisonList(
        { ...draft, baseCurrency: currencyCode, products },
        locale
      );

      router.push(`/list/${savedList.id}`);
    } catch (error) {
      console.error('Failed to save quick comparison as a list:', error);
      toast.error(t('listCreateError'));
      setIsSaving(false);
    }
  };

  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="quick-compare-title">
      <div className="flex items-center gap-2">
        <h2 id="quick-compare-title" className="section-title">
          {t('quickCompareTitle')}
        </h2>
      </div>
      <p className="section-description mt-1">{t('quickCompareSubtitle')}</p>

      <div
        ref={containerRef}
        className="mt-4 overflow-hidden rounded-[var(--radius-md)] border bg-surface"
        style={{ borderColor: 'var(--border)' }}
      >
        {rows.map((row, index) => {
          const result = results[index] ?? emptyResult;
          const unitPrice = result.unitPrice;
          const isBest = isComparing && result.isBest;
          const letter = rowLetter(index);
          const rowName = `${itemLabel} ${letter}`;
          const priceId = `quick-price-${row.id}`;
          const quantityId = `quick-quantity-${row.id}`;
          const canInsertMultiply = row.quantity !== '' && !row.quantity.includes('×');

          return (
            <div
              key={row.id}
              className="grid grid-cols-[2.1rem_1fr_1fr] items-center gap-2 p-2.5 animate-fade-in"
              style={{
                background: isBest ? 'var(--brand-soft)' : 'transparent',
                borderTop: index > 0 ? '1px solid var(--border-subtle)' : undefined,
              }}
            >
              <span className={`rank-chip ${isBest ? 'rank-chip-best' : ''}`} aria-hidden="true">
                {letter}
              </span>

              <div className="relative">
                <label
                  htmlFor={priceId}
                  className="pointer-events-none absolute left-2.5 top-1 text-[0.625rem] font-semibold tracking-wide text-muted"
                >
                  {t('quickComparePriceLabel')} {currencySymbol}
                </label>
                <ChipSelect
                  ariaLabel={`${rowName} · ${t('quickComparePromoLabel')}`}
                  value={row.promo}
                  selectedLabel={t(`quickPromos.${row.promo || 'none'}`)}
                  onChange={(promo) => handlePromoChange(row.id, promo)}
                  className="absolute right-1 top-0.5"
                >
                  <option value="">{t('quickPromos.none')}</option>
                  {Object.keys(QUICK_PROMOS).map((promo) => (
                    <option key={promo} value={promo}>
                      {t(`quickPromos.${promo}`)}
                    </option>
                  ))}
                </ChipSelect>
                <input
                  id={priceId}
                  type="text"
                  inputMode="decimal"
                  enterKeyHint="next"
                  autoComplete="off"
                  aria-label={`${rowName} · ${t('quickComparePriceLabel')}`}
                  value={row.price}
                  onChange={(event) => handleFieldChange(row.id, 'price', event.target.value)}
                  onKeyDown={handleEnterAdvance}
                  className="h-[3.25rem] w-full rounded-[10px] border-0 bg-transparent px-2.5 pb-1 pt-[1.15rem] text-base font-semibold tabular-nums placeholder:font-normal placeholder:text-[color:var(--input-placeholder)] focus:bg-background focus:shadow-[inset_0_0_0_2px_var(--focus-ring)] focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div className="relative pl-2.5" style={{ borderLeft: '1px solid var(--border-subtle)' }}>
                <label
                  htmlFor={quantityId}
                  className="pointer-events-none absolute left-[1.25rem] top-1 text-[0.625rem] font-semibold tracking-wide text-muted"
                >
                  {t('quickCompareQuantityLabel')}
                </label>
                <button
                  type="button"
                  aria-label={`${rowName} · ${t('quickCompareMultiplyAction')}`}
                  title={t('quickCompareMultiplyAction')}
                  disabled={!canInsertMultiply}
                  // 不抢输入框焦点, 手机键盘保持弹出。
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => handleInsertMultiply(row, quantityId)}
                  className="quick-chip absolute right-1 top-0.5 px-2 disabled:opacity-40"
                >
                  ×
                </button>
                <input
                  id={quantityId}
                  type="text"
                  inputMode="decimal"
                  enterKeyHint="next"
                  autoComplete="off"
                  aria-label={`${rowName} · ${t('quickCompareQuantityLabel')}`}
                  value={row.quantity}
                  onChange={(event) => handleFieldChange(row.id, 'quantity', event.target.value)}
                  onKeyDown={handleEnterAdvance}
                  className="h-[3.25rem] w-full rounded-[10px] border-0 bg-transparent pb-1 pl-2.5 pr-[4.5rem] pt-[1.15rem] text-base font-semibold tabular-nums placeholder:font-normal placeholder:text-[color:var(--input-placeholder)] focus:bg-background focus:shadow-[inset_0_0_0_2px_var(--focus-ring)] focus:outline-none"
                  placeholder="0"
                />
                <ChipSelect
                  ariaLabel={`${rowName} · ${t('quickCompareUnitLabel')}`}
                  value={row.unit}
                  selectedLabel={row.unit ? getCompactUnitLabel(row.unit, locale) : t('quickCompareUnitLabel')}
                  onChange={(unit) => handleUnitChange(row.id, unit)}
                  className="absolute bottom-1.5 right-1"
                >
                  <option value="">{t('quickCompareUnitLabel')}</option>
                  {QUICK_UNIT_GROUPS.map(([category, units]) => (
                    <optgroup key={category} label={t(`unitTypes.${category}`)}>
                      {units.map((unit) => (
                        <option key={unit} value={unit}>
                          {getCompactUnitLabel(unit, locale)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </ChipSelect>
              </div>

              {unitPrice !== null && (
                <div className="col-span-3 flex items-baseline gap-2 px-1 pt-1 text-xs text-muted">
                  <span>{unitPriceLabel}</span>
                  <PriceLockup
                    amount={formatUnitPrice(unitPrice)}
                    symbol={currencySymbol}
                    per={getPerLabel(result)}
                    tone={isBest ? 'best' : 'default'}
                    size="md"
                  />
                  {isComparing && !result.comparable && (
                    <span className="ml-auto font-semibold" style={{ color: 'var(--warning)' }}>
                      {t('quickCompareOtherCategory')}
                    </span>
                  )}
                  {isComparing && result.comparable && isBest && (
                    <span className="pill-brand ml-auto">{t('quickCompareBestBadge')}</span>
                  )}
                  {isComparing && result.comparable && result.pctAboveBest !== null && (
                    <span className="ml-auto font-semibold" style={{ color: 'var(--danger)' }}>
                      {t('quickCompareWorseBadge').replace('{pct}', String(result.pctAboveBest))}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {atLimit && <p className="mt-3 text-xs text-muted">{t('quickCompareLimitHint')}</p>}

      <div aria-live="polite">
        {isComparing && hasMismatch && (
          <p className="notice notice-warning mt-3 text-sm text-foreground">{t('quickCompareMismatch')}</p>
        )}
        {isComparing && winnerIndex !== -1 && (
          <div
            className="mt-3 rounded-[10px] px-3.5 py-2.5 text-sm animate-fade-in"
            style={{ background: 'var(--brand-soft)' }}
          >
            <p className="text-foreground">
              {t('quickCompareWinnerLine')
                .replace('{name}', `${itemLabel} ${rowLetter(winnerIndex)}`)
                .replace('{pct}', String(worstPct))}
            </p>
          </div>
        )}
      </div>

      {isComparing && <InstallHint />}

      <div className="mt-4 flex items-center justify-between gap-3">
        <button type="button" onClick={handleReset} className="btn btn-secondary px-4 text-sm">
          {t('quickCompareResetAction')}
        </button>
        {isComparing && (
          <button
            type="button"
            onClick={handleSaveAsList}
            disabled={isSaving}
            className="btn btn-primary px-5 text-sm"
          >
            {t('quickCompareSaveAction')}
          </button>
        )}
      </div>
    </section>
  );
}

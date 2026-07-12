import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/context/LanguageContext';
import PriceLockup from '@/components/PriceLockup';
import { compareQuickRows, formatUnitPrice } from '@/lib/quick-compare';
import { buildEntityId, createComparisonList, saveComparisonList } from '@/lib/comparison-lists';
import type { ProductInput, QuickCompareRow, QuickRowResult } from '@/types';

const INITIAL_ROWS = 2;
const MAX_ROWS = 6;
const MAX_INPUT_LENGTH = 10;

const emptyResult: QuickRowResult = { unitPrice: null, isBest: false, pctAboveBest: null };

function createEmptyRow(): QuickCompareRow {
  return { id: buildEntityId('quick'), price: '', quantity: '' };
}

function createInitialRows(): QuickCompareRow[] {
  // 初始行参与 SSR, 必须用确定性 id — 随机 id 会让服务端与客户端各生成一份, 触发 hydration mismatch。
  return Array.from({ length: INITIAL_ROWS }, (_, index) => ({
    id: `quick-initial-${index}`,
    price: '',
    quantity: '',
  }));
}

// 只保留数字与至多一个小数点, 并截断到 10 字符。
function sanitizeNumericInput(raw: string): string {
  const digitsAndDots = raw.replace(/[^0-9.]/g, '');
  const firstDot = digitsAndDots.indexOf('.');
  const normalized =
    firstDot === -1
      ? digitsAndDots
      : digitsAndDots.slice(0, firstDot + 1) + digitsAndDots.slice(firstDot + 1).replace(/\./g, '');

  return normalized.slice(0, MAX_INPUT_LENGTH);
}

function isRowFilled(row: QuickCompareRow): boolean {
  const price = parseFloat(row.price);
  const quantity = parseFloat(row.quantity);

  return Number.isFinite(price) && price > 0 && Number.isFinite(quantity) && quantity > 0;
}

function rowLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export default function QuickCompare() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rows, setRows] = useState<QuickCompareRow[]>(createInitialRows);
  const [isSaving, setIsSaving] = useState(false);

  const results = useMemo(() => compareQuickRows(rows), [rows]);
  const validCount = results.filter((result) => result.unitPrice !== null).length;
  const isComparing = validCount >= 2;
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

  const handleFieldChange = (rowId: string, field: 'price' | 'quantity', rawValue: string) => {
    const value = sanitizeNumericInput(rawValue);

    setRows((prev) => {
      const next = prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row));
      const tail = next[next.length - 1];

      if (tail && isRowFilled(tail) && next.length < MAX_ROWS) {
        return [...next, createEmptyRow()];
      }

      return next;
    });
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

  const handleSaveAsList = async () => {
    if (!isComparing || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const products: ProductInput[] = rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => isRowFilled(row))
        .map(({ row, index }) => ({
          name: `${itemLabel} ${rowLetter(index)}`,
          price: parseFloat(row.price),
          quantity: parseFloat(row.quantity),
          unit: 'piece',
          currency: currencyCode,
        }));

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
                  className="h-[3.25rem] w-full rounded-[10px] border-0 bg-transparent px-2.5 pb-1 pt-[1.15rem] text-base font-semibold tabular-nums placeholder:font-normal placeholder:text-[color:var(--input-placeholder)] focus:bg-background focus:shadow-[inset_0_0_0_2px_var(--focus-ring)] focus:outline-none"
                  placeholder="0"
                />
              </div>

              {unitPrice !== null && (
                <div className="col-span-3 flex items-baseline gap-2 px-1 pt-1 text-xs text-muted">
                  <span>{unitPriceLabel}</span>
                  <PriceLockup
                    amount={formatUnitPrice(unitPrice)}
                    symbol={currencySymbol}
                    per={t('unit')}
                    tone={isBest ? 'best' : 'default'}
                    size="md"
                  />
                  {isComparing &&
                    (isBest ? (
                      <span className="pill-brand ml-auto">{t('quickCompareBestBadge')}</span>
                    ) : (
                      <span className="ml-auto font-semibold" style={{ color: 'var(--danger)' }}>
                        {t('quickCompareWorseBadge').replace('{pct}', String(result.pctAboveBest ?? 0))}
                      </span>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {atLimit && <p className="mt-3 text-xs text-muted">{t('quickCompareLimitHint')}</p>}

      <div aria-live="polite">
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

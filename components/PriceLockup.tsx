import type { CSSProperties } from 'react';

export type PriceLockupTone = 'default' | 'best';
export type PriceLockupSize = 'sm' | 'md' | 'lg';

export interface PriceLockupProps {
  /** 已格式化的金额字符串 (调用方负责精度), 例如 "0.040"。 */
  amount: string;
  /** 货币符号, 例如 "¥" / "$"。 */
  symbol: string;
  /** 单位小注, 例如 "单位"; 省略则不渲染 `/单位` 部分。 */
  per?: string;
  /** `best` 用 brand 色表达「省/最优」。 */
  tone?: PriceLockupTone;
  size?: PriceLockupSize;
  className?: string;
}

// 以「金额」字号为基准, 符号与单位用 em 相对缩放, 整组只受一个字号驱动。
const AMOUNT_FONT_SIZE: Record<PriceLockupSize, string> = {
  sm: '1.05rem',
  md: '1.3rem',
  lg: '1.7rem',
};

/**
 * 价格 lockup 排印: 货币符号小号上标 + 金额大号等宽 + `/单位` 小注。
 * 纯展示组件, 无业务逻辑。数字一律等宽 (`--font-num`) + tabular-nums。
 */
export default function PriceLockup({
  amount,
  symbol,
  per,
  tone = 'default',
  size = 'md',
  className,
}: PriceLockupProps) {
  const emphasisColor = tone === 'best' ? 'var(--brand)' : 'var(--text-primary)';

  const rootStyle: CSSProperties = {
    display: 'inline-block',
    fontFamily: 'var(--font-num)',
    fontVariantNumeric: 'tabular-nums',
    fontSize: AMOUNT_FONT_SIZE[size],
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
  };

  const symbolStyle: CSSProperties = {
    fontSize: '0.5em',
    fontWeight: 600,
    marginRight: '0.06em',
    verticalAlign: '0.5em',
    color: emphasisColor,
  };

  const amountStyle: CSSProperties = {
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: emphasisColor,
  };

  const perStyle: CSSProperties = {
    fontSize: '0.5em',
    fontWeight: 500,
    marginLeft: '0.15em',
    color: 'var(--text-secondary)',
  };

  return (
    <span className={['price-lockup', className].filter(Boolean).join(' ')} style={rootStyle}>
      <sup style={symbolStyle}>{symbol}</sup>
      <span style={amountStyle}>{amount}</span>
      {per ? <span style={perStyle}>/{per}</span> : null}
    </span>
  );
}

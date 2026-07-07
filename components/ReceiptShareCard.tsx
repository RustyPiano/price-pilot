import type { CSSProperties } from 'react';
import type { Translate } from '@/types';

/**
 * 固定浅色「小票」配色 — 不随主题切换 (方向 A 的味道)。
 * 全部硬编码 hex + 内联样式, 以便 html2canvas 离屏渲染时忠实还原。
 */
const PAPER = '#fbfaf5';
const INK = '#26241e';
const STAMP = '#c43c2b';
const MUTED = '#8d8779';
const DASH = '#d8d3c2';
const DOT = '#cfc9b8';

const MONO = "'SF Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', monospace";

/** 小票内容宽度 (px)。html2canvas 以 scale 放大导出。 */
export const RECEIPT_WIDTH = 360;

const TOOTH = 12;
const TEAR_HEIGHT = 10;

export interface ReceiptShareItem {
  /** 商品名 (已本地化的原始数据)。 */
  name: string;
  /** 规格备注, 例如 "19.9 / 500 mL"。 */
  spec: string;
  /** 已格式化的单价数字, 例如 "0.040" 或 "—"。 */
  amount: string;
  /** 货币符号, 例如 "¥"。 */
  symbol: string;
  /** 是否为最划算行 (盖红章)。 */
  isBest: boolean;
  /** 相对最优的溢价百分比 (非最优行显示 "+9%"); null 不显示。 */
  pct: number | null;
}

export interface ReceiptShareCardProps {
  listName: string;
  /** 小票流水号日期段, 例如 "20260707"。 */
  serial: string;
  /** 已本地化的日期文案。 */
  dateLabel: string;
  items: ReceiptShareItem[];
  /** 胜出商品名; null 时不渲染合计裁决。 */
  winnerName: string | null;
  /** 节省百分比字符串, 例如 "9%"; 与 winnerName 同时存在才渲染。 */
  savingsPct: string | null;
  t: Translate;
}

function TearEdge({ side }: { side: 'top' | 'bottom' }) {
  const count = Math.ceil(RECEIPT_WIDTH / TOOTH) + 1;
  const toothStyle: CSSProperties = {
    flex: '0 0 auto',
    width: 0,
    height: 0,
    borderLeft: `${TOOTH / 2}px solid transparent`,
    borderRight: `${TOOTH / 2}px solid transparent`,
    // 上缘: 齿尖朝上 (着色下边框); 下缘: 齿尖朝下 (着色上边框)。齿基相接成实线与纸身无缝相连。
    ...(side === 'top'
      ? { borderBottom: `${TEAR_HEIGHT}px solid ${PAPER}` }
      : { borderTop: `${TEAR_HEIGHT}px solid ${PAPER}` }),
  };

  return (
    <div
      aria-hidden
      style={{ display: 'flex', height: TEAR_HEIGHT, overflow: 'hidden', lineHeight: 0 }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} style={toothStyle} />
      ))}
    </div>
  );
}

function DashedRule() {
  return (
    <div
      aria-hidden
      style={{
        height: 2,
        margin: '14px 0',
        backgroundImage: `repeating-linear-gradient(90deg, ${DASH} 0 6px, transparent 6px 11px)`,
      }}
    />
  );
}

function DoubleRule() {
  return (
    <div
      aria-hidden
      style={{
        height: 3,
        marginTop: 12,
        marginBottom: 10,
        borderTop: `1px solid ${INK}`,
        borderBottom: `1px solid ${INK}`,
      }}
    />
  );
}

function Barcode() {
  // 纯元素拼接的条码 (避免 html2canvas 对复杂重复渐变的还原偏差)。
  const widths = [2, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2, 2, 1, 3, 1, 2, 1, 2, 3, 1, 2, 1, 1, 2, 3, 1, 2, 2, 1, 3];
  return (
    <div
      aria-hidden
      style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 30, marginTop: 18, justifyContent: 'center' }}
    >
      {widths.map((width, index) => (
        <div
          key={index}
          style={{ width, height: index % 5 === 0 ? 30 : 26, background: INK }}
        />
      ))}
    </div>
  );
}

function ItemRow({ item, stampLabel }: { item: ReceiptShareItem; stampLabel: string }) {
  const dim = item.amount === '—';
  const rowColor = dim ? '#b5af9e' : INK;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'baseline',
        gap: 6,
        padding: '7px 0',
        fontSize: 13,
        color: rowColor,
      }}
    >
      <span
        style={{
          fontWeight: 700,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '52%',
        }}
      >
        {item.name}
      </span>
      <span style={{ color: MUTED, fontSize: 11, whiteSpace: 'nowrap' }}>{item.spec}</span>
      <span
        aria-hidden
        style={{
          flex: 1,
          minWidth: 14,
          height: 2,
          transform: 'translateY(-3px)',
          backgroundImage: `repeating-linear-gradient(90deg, ${DOT} 0 2px, transparent 2px 5px)`,
        }}
      />
      {/* 红圈章渲染在金额之前, 让金额绘制在章面之上, 保证「最优价」始终可读。 */}
      {item.isBest && (
        <span
          style={{
            position: 'absolute',
            right: -4,
            top: -30,
            width: 52,
            height: 52,
            padding: '0 5px',
            boxSizing: 'border-box',
            border: `2.5px solid ${STAMP}`,
            borderRadius: '50%',
            color: STAMP,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.04em',
            transform: 'rotate(-14deg)',
            opacity: 0.92,
            background: 'rgba(251, 250, 245, 0.55)',
            textAlign: 'center',
            lineHeight: 1.15,
          }}
        >
          {stampLabel}
        </span>
      )}
      <span style={{ position: 'relative', fontWeight: dim ? 400 : 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {item.symbol}
        {item.amount}
        {item.pct !== null && (
          <span style={{ color: STAMP, fontSize: 11, fontWeight: 700 }}> +{item.pct}%</span>
        )}
      </span>
    </div>
  );
}

/**
 * 离屏渲染的分享小票。纯展示组件 (不依赖任何 React context),
 * 由 useShareImage 挂载到离屏容器后交给 html2canvas 截图。
 */
export default function ReceiptShareCard({
  listName,
  serial,
  dateLabel,
  items,
  winnerName,
  savingsPct,
  t,
}: ReceiptShareCardProps) {
  const showVerdict = winnerName !== null && savingsPct !== null;

  const stampLabel = t('bestDeal');
  const winnerLine = winnerName ? t('shareReceiptWinner').replace('{name}', winnerName) : '';
  const savingsLine = savingsPct ? t('shareReceiptSavings').replace('{pct}', savingsPct) : '';

  return (
    <div
      style={{
        width: RECEIPT_WIDTH,
        fontFamily: MONO,
        color: INK,
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <TearEdge side="top" />

      <div style={{ background: PAPER, padding: '20px 24px 22px' }}>
        <p
          style={{
            textAlign: 'center',
            fontWeight: 800,
            letterSpacing: '0.3em',
            fontSize: 15,
            margin: 0,
            paddingLeft: '0.3em',
          }}
        >
          PRICE PILOT
        </p>
        <p
          style={{
            textAlign: 'center',
            fontSize: 10,
            letterSpacing: '0.16em',
            color: MUTED,
            margin: '5px 0 0',
          }}
        >
          {t('shareReceiptTagline')} · {t('shareReceiptSerialPrefix')}{serial}
        </p>

        <DashedRule />

        <p
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: MUTED,
            textTransform: 'uppercase',
            margin: '0 0 2px',
          }}
        >
          {t('results')}
        </p>
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            margin: '0 0 6px',
            wordBreak: 'break-word',
          }}
        >
          {listName}
        </p>

        {items.length > 0 ? (
          items.map((item, index) => <ItemRow key={index} item={item} stampLabel={stampLabel} />)
        ) : (
          <div style={{ padding: '7px 0', fontSize: 13, color: MUTED }}>—</div>
        )}

        {showVerdict && (
          <>
            <DoubleRule />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontWeight: 800 }}>
              <span style={{ fontSize: 13 }}>{winnerLine}</span>
              <span style={{ fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{savingsLine}</span>
            </div>
          </>
        )}

        <DashedRule />

        <p style={{ fontSize: 10, letterSpacing: '0.1em', color: MUTED, margin: 0 }}>{dateLabel}</p>

        <Barcode />

        <p
          style={{
            textAlign: 'center',
            fontSize: 10,
            letterSpacing: '0.24em',
            color: MUTED,
            margin: '10px 0 0',
            textTransform: 'uppercase',
          }}
        >
          {t('appTitle')}
        </p>
      </div>

      <TearEdge side="bottom" />
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';

interface UndoToastProps {
  title: string;
  description: string;
  expiresAt: number;
  actionLabel: string;
  onAction: () => void;
  onExpire?: () => void;
}

export default function UndoToast({
  title,
  description,
  expiresAt,
  actionLabel,
  onAction,
  onExpire,
}: UndoToastProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000)));
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const nextSecondsLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setSecondsLeft(nextSecondsLeft);

      if (nextSecondsLeft === 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        window.clearInterval(intervalId);
        onExpire?.();
      }
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [expiresAt, onExpire]);

  return (
    <div className="panel flex min-w-[280px] items-center justify-between gap-4 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted">{description} {secondsLeft}s</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="btn btn-secondary whitespace-nowrap px-3 text-xs"
      >
        {actionLabel}
      </button>
    </div>
  );
}

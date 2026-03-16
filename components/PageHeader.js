import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PageHeader({ title, subtitle, backHref, backLabel, children }) {
  return (
    <header className="page-header">
      <div className="page-header-inner">
        <div className="min-w-0 flex items-center gap-3">
          {backHref ? (
            <Link
              href={backHref}
              className="icon-btn"
              aria-label={backLabel}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          ) : (
            <div className="page-header-badge" aria-hidden="true">
              P
            </div>
          )}

          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs leading-5 text-muted sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {children ? (
          <div className="flex items-center gap-2">
            {children}
          </div>
        ) : null}
      </div>
    </header>
  );
}

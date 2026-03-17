import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, Monitor, Moon, Sun } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { Theme } from '@/types';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  children?: ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  children,
}: PageHeaderProps) {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const nextTheme: Theme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
  const themeLabel =
    theme === 'system'
      ? t('themeSystem')
      : theme === 'light'
        ? t('themeLight')
        : t('themeDark');
  const ThemeIcon = theme === 'system' ? Monitor : theme === 'light' ? Sun : Moon;

  return (
    <header className="page-header">
      <div className="page-header-inner">
        <div className="min-w-0 flex items-center gap-3">
          {backHref ? (
            <Link
              href={backHref}
              className="icon-btn"
              aria-label={backLabel ?? title}
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
            <button
              type="button"
              onClick={() => setTheme(nextTheme)}
              className="icon-btn"
              aria-label={themeLabel}
              title={themeLabel}
            >
              <ThemeIcon className="h-4 w-4" />
            </button>
            {children}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(nextTheme)}
              className="icon-btn"
              aria-label={themeLabel}
              title={themeLabel}
            >
              <ThemeIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

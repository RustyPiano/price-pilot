import Head from 'next/head';
import Link from 'next/link';
import { Compass } from 'lucide-react';
import LanguageToggle from '@/components/LanguageToggle';
import PageHeader from '@/components/PageHeader';
import { useLanguage } from '@/context/LanguageContext';

export default function NotFoundPage() {
  const { t } = useLanguage();

  return (
    <>
      <Head>
        <title>{`${t('pageNotFoundTitle')} · Price Pilot`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="page-shell">
        <PageHeader title={t('pageNotFoundTitle')}>
          <LanguageToggle />
        </PageHeader>

        <main id="main-content" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-5 sm:py-6">
          <div className="panel flex flex-col items-center gap-4 p-6 text-center animate-fade-in">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-100 text-brand">
              <Compass className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">{t('pageNotFoundTitle')}</p>
              <p className="text-sm leading-6 text-muted">{t('pageNotFoundBody')}</p>
            </div>
            <Link href="/" className="btn btn-primary inline-flex px-5 text-sm">
              {t('pageNotFoundAction')}
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}

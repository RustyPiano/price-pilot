import Head from 'next/head';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { Toaster } from 'react-hot-toast';
import '../styles/globals.css';
import ErrorBoundary from '@/components/ErrorBoundary';
import SkipLink from '@/components/SkipLink';
import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider } from '@/context/ThemeContext';
import type { Locale } from '@/types';

type AppPageProps = {
  initialLocale?: Locale;
};

function MyApp({ Component, pageProps }: AppProps<AppPageProps>) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    // 仅生产注册: dev 下缓存会干扰热更新。sw.js 自带 skipWaiting + 旧缓存清理,
    // 新部署会自动接管, 不会出现陈旧内容锁死。
    if (process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Failed to register service worker:', error);
      });
      return;
    }

    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch((error) => {
        console.error('Failed to unregister service workers:', error);
      });
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider initialLocale={pageProps.initialLocale}>
          {/* div 而非 main: 各页面有自己的 <main>, 嵌套 main 是无效 HTML 且干扰读屏地标。 */}
          <div className="app-shell">
            <Head>
              <link rel="manifest" href="/manifest.json" />
              <meta name="theme-color" content="#f6f3ee" data-dynamic-theme="true" />
              <link rel="icon" href="/icon.svg" type="image/svg+xml" />
            </Head>
            <SkipLink />
            <Toaster
              position="bottom-center"
              toastOptions={{
                duration: 2200,
                style: {
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-base)',
                  fontWeight: '500',
                  borderRadius: 'var(--radius-md)',
                },
              }}
            />
            <Component {...pageProps} />
            {process.env.NODE_ENV === 'production' ? <Analytics /> : null}
          </div>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default MyApp;

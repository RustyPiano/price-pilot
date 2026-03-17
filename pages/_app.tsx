import Head from 'next/head';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import AppToaster from '@/components/AppToaster';
import '../styles/globals.css';
import ErrorBoundary from '@/components/ErrorBoundary';
import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider } from '@/context/ThemeContext';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch((error) => {
        console.error('Failed to unregister service workers:', error);
      });

    if ('caches' in window) {
      caches.keys()
        .then((keys) => Promise.all(
          keys
            .filter((key) => key.startsWith('price-pilot-'))
            .map((key) => caches.delete(key))
        ))
        .catch((error) => {
          console.error('Failed to clear app caches:', error);
        });
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <main className="app-shell">
            <Head>
              <link rel="manifest" href="/manifest.json" />
              <meta name="theme-color" content="#f6f3ee" data-dynamic-theme="true" />
              <link rel="icon" href="/icon.svg" type="image/svg+xml" />
            </Head>
            <AppToaster
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
          </main>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default MyApp;

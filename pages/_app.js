import Head from 'next/head';
import { Inter } from 'next/font/google';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import '../styles/globals.css';
import { ThemeProvider } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';
import ErrorBoundary from '../components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Failed to register service worker:', error);
    });
  }, []);

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider>
          <main className={inter.className}>
            <Head>
              <link rel="manifest" href="/manifest.json" />
              <meta name="theme-color" content="#facc15" />
              <link rel="icon" href="/icon.svg" type="image/svg+xml" />
            </Head>
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 2000,
                style: {
                  background: 'var(--bg-surface)',
                  color: 'var(--fg-primary)',
                  border: 'var(--border-width) solid var(--border-color)',
                  boxShadow: 'var(--shadow-base)',
                  fontWeight: '500',
                  borderRadius: 'var(--border-radius)',
                },
              }}
            />
            <Component {...pageProps} />
          </main>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default MyApp;

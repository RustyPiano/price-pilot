import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { ThemeProvider } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';

const inter = Inter({ subsets: ['latin'] });

function MyApp({ Component, pageProps }) {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <main className={inter.className}>
          <Component {...pageProps} />
        </main>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default MyApp;

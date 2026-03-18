import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { translations } from '@/constants/translations';
import type { LanguageContextValue, Locale, TranslationValue } from '@/types';

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getBrowserLocale(): Locale {
  return window.navigator.language.startsWith('zh') ? 'zh' : 'en';
}

export function LanguageProvider({
  children,
  initialLocale = 'zh',
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    const pathname = window.location.pathname;
    if (pathname === '/') {
      setLocale('zh');
      window.localStorage.setItem('locale', 'zh');
      return;
    }

    if (pathname === '/en') {
      setLocale('en');
      window.localStorage.setItem('locale', 'en');
      return;
    }

    const savedLocale = window.localStorage.getItem('locale');
    if (savedLocale === 'zh' || savedLocale === 'en') {
      setLocale(savedLocale);
      return;
    }

    const browserLocale = getBrowserLocale();
    if (browserLocale !== initialLocale) {
      setLocale(browserLocale);
    }
  }, [initialLocale]);

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en-US';
  }, [locale]);

  const toggleLanguage = useCallback(() => {
    setLocale((currentLocale) => {
      const nextLocale = currentLocale === 'zh' ? 'en' : 'zh';
      window.localStorage.setItem('locale', nextLocale);
      return nextLocale;
    });
  }, []);

  const translate = useCallback((key: string) => {
    const keys = key.split('.');
    let value: TranslationValue | undefined = translations[locale];

    for (const currentKey of keys) {
      if (!value || typeof value === 'string' || Array.isArray(value)) {
        value = undefined;
        break;
      }

      value = value[currentKey];
    }

    if (key === 'sampleProducts' && Array.isArray(value)) {
      return value;
    }

    return typeof value === 'string' ? value : key;
  }, [locale]) as LanguageContextValue['t'];

  const contextValue = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale,
    toggleLanguage,
    t: translate,
  }), [locale, setLocale, toggleLanguage, translate]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider.');
  }

  return context;
}

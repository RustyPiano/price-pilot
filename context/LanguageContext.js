import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from '../constants/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [locale, setLocale] = useState('zh'); // Default to Chinese as per original app

    useEffect(() => {
        const savedLocale = window.localStorage.getItem('locale');
        if (savedLocale) {
            setLocale(savedLocale);
            return;
        }

        const browserLang = window.navigator.language.startsWith('zh') ? 'zh' : 'en';
        if (browserLang !== 'zh') {
            setLocale(browserLang);
        }
    }, []);

    useEffect(() => {
        document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en-US';
    }, [locale]);

    const toggleLanguage = () => {
        const newLocale = locale === 'zh' ? 'en' : 'zh';
        setLocale(newLocale);
        localStorage.setItem('locale', newLocale);
    };

    const t = useCallback((key) => {
        const keys = key.split('.');
        let value = translations[locale];
        for (const k of keys) {
            value = value?.[k];
        }
        return value || key;
    }, [locale]);

    return (
        <LanguageContext.Provider value={{ locale, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}

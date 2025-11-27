import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../constants/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [locale, setLocale] = useState('zh'); // Default to Chinese as per original app

    useEffect(() => {
        const savedLocale = localStorage.getItem('locale');
        if (savedLocale) {
            setLocale(savedLocale);
        } else {
            // Optional: Detect browser language
            const browserLang = navigator.language.startsWith('zh') ? 'zh' : 'en';
            setLocale(browserLang);
        }
    }, []);

    const toggleLanguage = () => {
        const newLocale = locale === 'zh' ? 'en' : 'zh';
        setLocale(newLocale);
        localStorage.setItem('locale', newLocale);
    };

    const t = (key) => {
        const keys = key.split('.');
        let value = translations[locale];
        for (const k of keys) {
            value = value?.[k];
        }
        return value || key;
    };

    return (
        <LanguageContext.Provider value={{ locale, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}

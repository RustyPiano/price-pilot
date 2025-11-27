import { useLanguage } from '../context/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageToggle() {
    const { locale, toggleLanguage } = useLanguage();

    return (
        <button
            onClick={toggleLanguage}
            className="h-9 px-2 flex items-center justify-center gap-1 border-theme bg-surface text-foreground shadow-theme-sm hover:-translate-y-0.5 hover:shadow-theme-base transition-all rounded-theme font-medium text-sm"
            title={locale === 'zh' ? 'Switch to English' : '切换到中文'}
        >
            <Globe className="w-4 h-4" />
            <span>{locale === 'zh' ? 'EN' : '中'}</span>
        </button>
    );
}

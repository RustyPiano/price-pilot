import { useLanguage } from '../context/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageToggle() {
  const { locale, toggleLanguage } = useLanguage();
  const label = locale === 'zh' ? 'Switch to English' : '切换到中文';

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="btn btn-secondary px-3 text-sm"
      title={label}
      aria-label={label}
    >
      <Globe className="h-4 w-4" />
      <span>{locale === 'zh' ? 'EN' : '中'}</span>
    </button>
  );
}

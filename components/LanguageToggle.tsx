import { useRouter } from 'next/router';
import { useLanguage } from '@/context/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageToggle() {
  const { locale, setLocale, toggleLanguage } = useLanguage();
  const router = useRouter();
  const label = locale === 'zh' ? 'Switch to English' : '切换到中文';
  const isLandingPage = router.pathname === '/' || router.pathname === '/en';

  const handleToggle = () => {
    if (!isLandingPage) {
      toggleLanguage();
      return;
    }

    const nextLocale = router.pathname === '/en' ? 'zh' : 'en';
    const nextPath = nextLocale === 'en' ? '/en' : '/';
    setLocale(nextLocale);
    window.localStorage.setItem('locale', nextLocale);
    void router.push(nextPath);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="btn btn-secondary px-3 text-sm"
      title={label}
      aria-label={label}
    >
      <Globe className="h-4 w-4" />
      <span>{locale === 'zh' ? 'EN' : '中'}</span>
    </button>
  );
}

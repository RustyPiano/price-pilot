import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

const DISMISS_KEY = 'installHintDismissed';

// iOS 不会自动弹出安装提示, 用户要自己在分享菜单里选「添加到主屏幕」。
function shouldShowInstallHint(): boolean {
  const userAgent = navigator.userAgent;
  // iPadOS 13 起 Safari 的 user agent 和 Mac 相同, 靠触控点数区分。
  const isIos = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1);
  if (!isIos || /MicroMessenger/.test(userAgent)) {
    return false;
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return !isStandalone && window.localStorage.getItem(DISMISS_KEY) !== '1';
}

export default function InstallHint() {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  // 依赖浏览器环境, 只能在挂载后判断。
  useEffect(() => {
    setIsVisible(shouldShowInstallHint());
  }, []);

  if (!isVisible) {
    return null;
  }

  const handleDismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, '1');
    setIsVisible(false);
  };

  return (
    <div
      className="mt-3 flex items-center justify-between gap-3 pt-3 text-sm text-muted animate-fade-in"
      style={{ borderTop: '1px solid var(--border-subtle)' }}
    >
      <p>{t('installHintBody')}</p>
      <button type="button" onClick={handleDismiss} className="btn btn-secondary shrink-0 px-3 text-xs">
        {t('installHintDismiss')}
      </button>
    </div>
  );
}

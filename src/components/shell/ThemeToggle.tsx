'use client';
import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'theme';
const CHANGE_EVENT = 'redeemy-theme-change';

function readStored(): Theme {
  if (typeof window === 'undefined') return 'auto';
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'light' || v === 'dark' ? v : 'auto';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'auto') {
    root.removeAttribute('data-theme');
    localStorage.removeItem(STORAGE_KEY);
  } else {
    root.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// useSyncExternalStore lets React track an external (DOM/localStorage) state
// without the cascading-render trap of useState+useEffect on mount.
function subscribe(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGE_EVENT, cb);
  // Cross-tab updates land via the native storage event.
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

const getServerSnapshot = (): Theme => 'auto';

export default function ThemeToggle() {
  const t = useTranslations('common.theme');
  const theme = useSyncExternalStore(subscribe, readStored, getServerSnapshot);

  function cycle() {
    const next: Theme = theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto';
    applyTheme(next);
  }

  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const label = theme === 'light' ? t('light') : theme === 'dark' ? t('dark') : t('auto');

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={t('toggleAriaLabel', { current: label })}
      title={label}
      className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 transition"
    >
      <Icon size={16} aria-hidden />
    </button>
  );
}

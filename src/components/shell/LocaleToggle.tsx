'use client';
import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Languages } from 'lucide-react';

export default function LocaleToggle() {
  const currentLocale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchLocale() {
    const next = currentLocale === 'he' ? 'en' : 'he';
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      disabled={pending}
      aria-label={currentLocale === 'he' ? 'Switch to English' : 'מעבר לעברית'}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-sm font-medium transition disabled:opacity-50"
    >
      <Languages size={16} aria-hidden />
      <span>{currentLocale === 'he' ? 'EN' : 'עב'}</span>
    </button>
  );
}

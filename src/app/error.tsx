'use client';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[redeemy-admin] page error:', error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-[var(--radius-card)] bg-surface shadow-wallet p-6 sm:p-8 text-center">
        <div className="mx-auto mb-4 inline-flex items-center justify-center w-14 h-14 rounded-full bg-urgency-red-surface text-urgency-red">
          <AlertOctagon size={28} aria-hidden />
        </div>
        <h1 className="text-xl font-bold mb-1">{t('pageError.title')}</h1>
        <p className="text-sm text-text-secondary mb-5 leading-relaxed">{t('pageError.body')}</p>
        {error.digest && (
          <p className="text-[11px] text-text-tertiary mb-5 font-mono break-all" dir="ltr">
            {t('pageError.referenceId')}: {error.digest}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white px-4 py-2 text-sm font-semibold hover:bg-primary/90 active:bg-primary/80 transition"
          >
            <RotateCcw size={16} aria-hidden />
            {t('pageError.retry')}
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-separator px-4 py-2 text-sm font-medium hover:bg-separator transition"
          >
            <Home size={16} aria-hidden />
            {t('pageError.home')}
          </Link>
        </div>
      </div>
    </main>
  );
}

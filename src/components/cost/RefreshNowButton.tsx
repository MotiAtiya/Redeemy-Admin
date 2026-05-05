'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function RefreshNowButton() {
  const t = useTranslations('costDetail.refresh');
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');
  const [, startTransition] = useTransition();

  async function handleClick() {
    setStatus('loading');
    try {
      const res = await fetch('/api/admin/cost/refresh', { method: 'POST' });
      if (!res.ok) {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
        return;
      }
      setStatus('success');
      startTransition(() => router.refresh());
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  const Icon = status === 'success' ? Check : status === 'error' ? AlertCircle : RefreshCw;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === 'loading'}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-60 transition"
    >
      <Icon
        size={12}
        aria-hidden
        className={status === 'loading' ? 'animate-spin' : ''}
      />
      {status === 'loading' ? t('loading') : status === 'success' ? t('done') : status === 'error' ? t('error') : t('label')}
    </button>
  );
}

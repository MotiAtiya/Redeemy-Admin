'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Bell, BellOff, Check } from 'lucide-react';

interface Props {
  currency: string;
  initialAmount: number | null;
  initialEnabled: boolean;
  initialDailySpike: boolean;
}

export default function CostThresholdCard({
  currency,
  initialAmount,
  initialEnabled,
  initialDailySpike,
}: Props) {
  const t = useTranslations('costDetail.threshold');
  const router = useRouter();
  const [amount, setAmount] = useState<string>(initialAmount !== null ? String(initialAmount) : '');
  const [enabled, setEnabled] = useState(initialEnabled);
  const [dailySpike, setDailySpike] = useState(initialDailySpike);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const num = amount === '' ? null : Number(amount);
    if (num !== null && (!Number.isFinite(num) || num < 0)) {
      setError(t('invalid'));
      return;
    }
    const res = await fetch('/api/admin/cost/threshold', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: num, enabled, dailySpikeEnabled: dailySpike }),
    });
    if (!res.ok) {
      setError(t('saveFailed'));
      return;
    }
    setSaved(true);
    startTransition(() => router.refresh());
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-5">
      <div className="flex items-center gap-2 mb-1">
        {enabled ? (
          <Bell size={18} className="text-primary" aria-hidden />
        ) : (
          <BellOff size={18} className="text-text-tertiary" aria-hidden />
        )}
        <h2 className="font-semibold text-base">{t('title')}</h2>
      </div>
      <p className="text-xs text-text-secondary mb-4">{t('subtitle', { currency })}</p>

      <form onSubmit={handleSave} className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-separator"
          />
          <span className="text-sm">{t('enableLabel')}</span>
        </label>

        <div className="flex items-center gap-2">
          <label htmlFor="threshold-amount" className="text-sm shrink-0">
            {t('amountLabel')}:
          </label>
          <input
            id="threshold-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            disabled={!enabled}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            className="w-32 px-2 py-1 rounded-md border border-separator bg-surface text-sm disabled:opacity-50"
            dir="ltr"
          />
          <span className="text-sm text-text-secondary">{currency}</span>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={dailySpike}
            onChange={(e) => setDailySpike(e.target.checked)}
            className="rounded border-separator"
          />
          <span className="text-sm">{t('dailySpikeLabel')}</span>
        </label>

        {error && (
          <p role="alert" className="text-xs text-urgency-red">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition"
          >
            {t('save')}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs text-primary">
              <Check size={12} aria-hidden />
              {t('saved')}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

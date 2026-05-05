'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Pencil, X } from 'lucide-react';

interface Props {
  initialAmount: number | null;
  currency: string;
  monthYear: string;
}

export default function CostEditButton({ initialAmount, currency, monthYear }: Props) {
  const t = useTranslations('cost');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialAmount !== null ? String(initialAmount) : '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      setError(t('invalidAmount'));
      return;
    }
    const res = await fetch('/api/admin/cost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: num, currency }),
    });
    if (!res.ok) {
      setError(t('saveFailed'));
      return;
    }
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <span onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline rounded p-1 -m-1"
        aria-label={t('editAria')}
      >
        <Pencil size={12} aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cost-edit-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        >
          <div className="w-full max-w-sm rounded-[var(--radius-card)] bg-surface shadow-wallet p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 id="cost-edit-title" className="font-semibold text-base">
                {t('editTitle')}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={tCommon('cancel')}
                className="text-text-tertiary hover:text-text-primary p-1 -m-1"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <p className="text-xs text-text-secondary mb-3">
              {t('editForMonth', { monthYear })}
            </p>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label htmlFor="cost-amount" className="block text-sm font-medium mb-1">
                  {t('amountLabel')}
                </label>
                <div className="relative">
                  <span
                    className="absolute start-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm"
                    aria-hidden
                  >
                    {currencySymbol(currency)}
                  </span>
                  <input
                    id="cost-amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full ps-9 pe-3 py-2 rounded-lg border border-separator bg-surface text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    dir="ltr"
                  />
                </div>
              </div>
              {error && (
                <p role="alert" className="text-xs text-urgency-red">
                  {error}
                </p>
              )}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-separator transition"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:bg-primary/80 disabled:opacity-50 transition"
                >
                  {tCommon('loading') && pending ? tCommon('loading') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </span>
  );
}

function currencySymbol(code: string): string {
  try {
    const parts = new Intl.NumberFormat('en', { style: 'currency', currency: code }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? code;
  } catch {
    return code;
  }
}

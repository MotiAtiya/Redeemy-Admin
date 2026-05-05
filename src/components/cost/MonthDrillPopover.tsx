'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SkuRow } from '@/lib/costAnalytics';
import { formatCurrency } from '@/lib/formatCurrency';

export default function MonthDrillPopover({
  month,
  currency,
  locale,
  onClose,
}: {
  month: string;
  currency: string;
  locale: string;
  onClose: () => void;
}) {
  const t = useTranslations('costDetail.drill');
  const [rows, setRows] = useState<SkuRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const invoiceMonth = month.replace('-', '');
    fetch(`/api/admin/cost/month?invoiceMonth=${invoiceMonth}`)
      .then((r) => (r.ok ? r.json() : { skus: [] }))
      .then((j) => {
        if (!cancelled) setRows(j.skus ?? []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="month-drill-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-card)] bg-surface shadow-wallet p-5 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 id="month-drill-title" className="font-semibold text-base">
            {t('title', { month })}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="text-text-tertiary hover:text-text-primary p-1 -m-1"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        {rows === null ? (
          <p className="text-sm text-text-secondary py-4">{t('loading')}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-text-secondary py-4">{t('empty')}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {rows.map((s) => (
              <li
                key={`${s.service}-${s.sku}`}
                className="flex items-start justify-between gap-3 border-b border-separator/60 pb-2 last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.sku}</p>
                  <p className="text-xs text-text-secondary truncate">{s.service}</p>
                </div>
                <p className="font-semibold tabular-nums shrink-0">
                  {formatCurrency(s.amount, currency, locale)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

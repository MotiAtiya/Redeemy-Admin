import { ArrowUp, ArrowDown } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { SkuRow } from '@/lib/costAnalytics';
import { formatCurrency } from '@/lib/formatCurrency';

export default async function WhatChangedCard({
  skus,
  currency,
  locale,
}: {
  skus: SkuRow[];
  currency: string;
  locale: string;
}) {
  const t = await getTranslations('costDetail.whatChanged');

  const movers = [...skus]
    .filter((s) => s.delta !== undefined && Math.abs(s.delta) > 0.0001)
    .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))
    .slice(0, 5);

  return (
    <section className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-5">
      <h2 className="font-semibold text-base mb-1">{t('title')}</h2>
      <p className="text-xs text-text-secondary mb-3">{t('subtitle')}</p>
      {movers.length === 0 ? (
        <p className="text-sm text-text-secondary py-2">{t('empty')}</p>
      ) : (
        <ul className="space-y-2">
          {movers.map((s) => {
            const isUp = (s.delta ?? 0) > 0;
            const Icon = isUp ? ArrowUp : ArrowDown;
            const colorClass = isUp ? 'text-urgency-red' : 'text-primary';
            return (
              <li key={`${s.service}-${s.sku}`} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{s.sku}</p>
                  <p className="text-xs text-text-secondary truncate">{s.service}</p>
                </div>
                <div className={`text-right ${colorClass}`}>
                  <p className="inline-flex items-center gap-1 font-semibold tabular-nums">
                    <Icon size={12} aria-hidden />
                    {formatCurrency(Math.abs(s.delta ?? 0), currency, locale)}
                  </p>
                  {s.deltaPct !== null && s.deltaPct !== undefined && (
                    <p className="text-[11px] text-text-tertiary tabular-nums">
                      {isUp ? '+' : ''}
                      {s.deltaPct.toFixed(0)}%
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

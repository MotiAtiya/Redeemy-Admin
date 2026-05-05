import { Gift } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { formatCurrency } from '@/lib/formatCurrency';

export default async function FreeTierCard({
  freeTierSaved,
  currency,
  locale,
}: {
  freeTierSaved: number;
  currency: string;
  locale: string;
}) {
  const t = await getTranslations('costDetail.freeTier');

  return (
    <section className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-5 flex items-start gap-4">
      <div className="rounded-lg bg-primary-surface text-primary p-3 shrink-0">
        <Gift size={24} aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-base mb-1">{t('title')}</h2>
        <p className="text-2xl font-bold text-primary tabular-nums">
          {formatCurrency(freeTierSaved, currency, locale)}
        </p>
        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
          {freeTierSaved > 0 ? t('descriptionSaved') : t('descriptionNone')}
        </p>
      </div>
    </section>
  );
}

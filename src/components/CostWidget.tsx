import { getTranslations, getLocale } from 'next-intl/server';
import { DollarSign, TrendingUp, Zap, Pencil as PencilSmall } from 'lucide-react';
import { getCostSnapshot } from '@/lib/cost';
import CostEditButton from './CostEditButton';

export default async function CostWidget() {
  const t = await getTranslations('cost');
  const locale = await getLocale();
  const snap = await getCostSnapshot();

  const isSet = snap.amountUSD !== null;

  return (
    <div className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-5 flex items-start gap-4">
      <div className="rounded-lg bg-primary-surface text-primary p-3 shrink-0">
        <DollarSign size={24} aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="font-semibold text-base">{t('title')}</h3>
          <CostEditButton initialUSD={snap.amountUSD} monthYear={snap.monthYear} />
        </div>

        {isSet ? (
          <>
            <p className="text-3xl font-bold">{formatUSD(snap.amountUSD!, locale)}</p>
            <p className="text-xs text-text-secondary mb-2">{t('subtitle')}</p>
            <dl className="text-xs space-y-0.5">
              <Row
                label={t('perActiveUser', { count: snap.activeUsers })}
                value={snap.costPerActiveUser !== null ? formatUSD(snap.costPerActiveUser, locale) : '—'}
              />
              <Row
                label={t('at10x')}
                value={
                  <span className="inline-flex items-center gap-1 font-medium">
                    <TrendingUp size={11} className="text-text-tertiary" aria-hidden />
                    {snap.projectedAt10x !== null ? formatUSD(snap.projectedAt10x, locale) : '—'}
                  </span>
                }
              />
            </dl>
            <p className="text-[10px] text-text-tertiary mt-2 inline-flex items-center gap-1">
              {snap.source === 'bigquery' ? (
                <>
                  <Zap size={10} aria-hidden />
                  {t('sourceAuto')}
                </>
              ) : (
                <>
                  <PencilSmall size={10} aria-hidden />
                  {t('sourceManual')}
                </>
              )}
            </p>
          </>
        ) : (
          <p className="text-text-secondary text-sm leading-relaxed">{t('notSet')}</p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-text-secondary truncate">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function formatUSD(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount < 1 ? 4 : 2,
  }).format(amount);
}

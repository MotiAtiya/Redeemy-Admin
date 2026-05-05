import { TrendingUp, TrendingDown, Minus, DollarSign, Calendar, Activity, Target } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { DerivedStats } from '@/lib/costAnalytics';
import { formatCurrency } from '@/lib/formatCurrency';

export default async function HeaderStats({
  stats,
  currency,
  locale,
}: {
  stats: DerivedStats;
  currency: string;
  locale: string;
}) {
  const t = await getTranslations('costDetail.stats');

  const trendIcon = stats.trend === 'up' ? TrendingUp : stats.trend === 'down' ? TrendingDown : Minus;
  const TrendIcon = trendIcon;
  const trendClass =
    stats.trend === 'up'
      ? 'text-urgency-red'
      : stats.trend === 'down'
        ? 'text-primary'
        : 'text-text-tertiary';

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Card
        icon={<DollarSign size={20} aria-hidden />}
        label={t('mtd')}
        value={formatCurrency(stats.mtd, currency, locale)}
        sub={
          stats.mtdProjection > 0
            ? t('mtdProjection', { amount: formatCurrency(stats.mtdProjection, currency, locale) })
            : null
        }
      />
      <Card
        icon={<TrendIcon size={20} className={trendClass} aria-hidden />}
        label={t('vsPrev')}
        value={
          stats.prevMonth !== null ? formatCurrency(stats.prevMonth, currency, locale) : '—'
        }
        sub={stats.trend ? t(`trend.${stats.trend}`) : null}
      />
      <Card
        icon={<Calendar size={20} aria-hidden />}
        label={t('ytd')}
        value={formatCurrency(stats.ytd, currency, locale)}
        sub={
          stats.peakMonth
            ? t('peak', {
                month: stats.peakMonth.month,
                amount: formatCurrency(stats.peakMonth.amount, currency, locale),
              })
            : null
        }
      />
      <Card
        icon={<Target size={20} aria-hidden />}
        label={t('runRate')}
        value={formatCurrency(stats.runRate, currency, locale)}
        sub={
          stats.forecastNextMonth !== null
            ? t('forecast', {
                amount: formatCurrency(stats.forecastNextMonth, currency, locale),
              })
            : null
        }
      />
    </div>
  );
}

function Card({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string | null;
}) {
  return (
    <div className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-4 flex items-start gap-3">
      <div className="rounded-lg bg-primary-surface text-primary p-2 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="text-xl font-bold tabular-nums truncate">{value}</p>
        {sub && <p className="text-[11px] text-text-tertiary mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

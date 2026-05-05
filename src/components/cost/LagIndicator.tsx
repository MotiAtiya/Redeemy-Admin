import { Clock, AlertCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function LagIndicator({
  lagHours,
  refreshedAt,
  hasData,
}: {
  lagHours: number | null;
  refreshedAt: number;
  hasData: boolean;
}) {
  const t = await getTranslations('costDetail.lag');

  if (!hasData) {
    return (
      <div className="rounded-[var(--radius-card)] bg-urgency-red-surface text-urgency-red p-3 flex items-center gap-2 text-xs">
        <AlertCircle size={14} aria-hidden />
        <span>{t('noData')}</span>
      </div>
    );
  }

  const refreshedAgoMin = Math.max(0, Math.round((Date.now() - refreshedAt) / 60000));
  const lagText =
    lagHours !== null
      ? lagHours < 24
        ? t('fresh', { hours: Math.max(1, Math.round(lagHours)) })
        : t('stale', { hours: Math.round(lagHours) })
      : t('unknown');

  return (
    <div className="rounded-[var(--radius-card)] bg-surface text-text-secondary px-3 py-2 flex items-center gap-2 text-xs">
      <Clock size={12} aria-hidden />
      <span>{lagText}</span>
      <span className="text-text-tertiary">·</span>
      <span>{t('refreshedAgo', { minutes: refreshedAgoMin })}</span>
    </div>
  );
}

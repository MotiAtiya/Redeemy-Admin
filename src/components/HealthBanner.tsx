import { getTranslations, getLocale } from 'next-intl/server';
import { CheckCircle2, AlertTriangle, AlertOctagon, ChevronDown } from 'lucide-react';
import { getHealthSnapshot, type HealthVariant } from '@/lib/health';
import HealthBannerExpanded from './HealthBannerExpanded';

export const HEALTH_BANNER_REVALIDATE = 60;

const VARIANT_STYLES: Record<HealthVariant, { bg: string; border: string; text: string; iconColor: string }> = {
  green: {
    bg: 'bg-urgency-green-surface',
    border: 'border-s-4 border-urgency-green',
    text: 'text-urgency-green',
    iconColor: 'text-urgency-green',
  },
  orange: {
    bg: 'bg-urgency-amber-surface',
    border: 'border-s-4 border-urgency-amber',
    text: 'text-urgency-amber',
    iconColor: 'text-urgency-amber',
  },
  red: {
    bg: 'bg-urgency-red-surface',
    border: 'border-s-4 border-urgency-red',
    text: 'text-urgency-red',
    iconColor: 'text-urgency-red',
  },
};

const VARIANT_ICON = {
  green: CheckCircle2,
  orange: AlertTriangle,
  red: AlertOctagon,
};

export default async function HealthBanner() {
  const t = await getTranslations('health');
  const locale = await getLocale();
  const snapshot = await getHealthSnapshot();
  const styles = VARIANT_STYLES[snapshot.variant];
  const Icon = VARIANT_ICON[snapshot.variant];

  const summary = buildSummary(snapshot, t);
  const isHealthy = snapshot.variant === 'green';

  return (
    <details className={`group ${styles.bg} ${styles.border}`}>
      <summary
        className={`list-none cursor-pointer ${
          isHealthy ? '' : 'hover:brightness-95'
        } px-4 py-2.5 flex items-center gap-3 transition`}
      >
        <Icon size={18} className={styles.iconColor} aria-hidden />
        <span className={`text-sm font-medium ${styles.text} flex-1 min-w-0 truncate`}>
          {summary}
        </span>
        {!isHealthy && (
          <ChevronDown
            size={16}
            className={`${styles.iconColor} transition-transform group-open:rotate-180`}
            aria-hidden
          />
        )}
      </summary>
      {!isHealthy && (
        <HealthBannerExpanded snapshot={snapshot} locale={locale} />
      )}
    </details>
  );
}

function buildSummary(
  snapshot: Awaited<ReturnType<typeof getHealthSnapshot>>,
  t: Awaited<ReturnType<typeof getTranslations<'health'>>>,
): string {
  if (snapshot.variant === 'green') return t('allSystemsNormal');

  const errors: string[] = [];
  if (snapshot.firestoreWriteFailures24h > 0) {
    errors.push(t('firestoreWriteFailures', { count: snapshot.firestoreWriteFailures24h }));
  }
  if (snapshot.imageUploadFailures24h > 0) {
    errors.push(t('imageUploadFailures', { count: snapshot.imageUploadFailures24h }));
  }
  if (errors.length === 0 && snapshot.totalUsers > 0 && snapshot.eventsLast24h === 0) {
    return t('noActivity');
  }
  const prefix = snapshot.variant === 'red' ? t('criticalIssue') : t('issuesDetected');
  return `${prefix} — ${errors.join(' · ')}`;
}

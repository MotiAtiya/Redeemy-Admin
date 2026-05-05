import { ExternalLink, Database, Hash } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function ProjectMetadata() {
  const t = await getTranslations('costDetail.projectMeta');
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? '—';
  const dataset = process.env.BILLING_EXPORT_DATASET ?? 'billing_export';
  const cloudConsoleUrl = `https://console.cloud.google.com/billing?project=${projectId}`;
  const bigQueryUrl = `https://console.cloud.google.com/bigquery?project=${projectId}`;

  return (
    <section className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-5">
      <h2 className="font-semibold text-base mb-3">{t('title')}</h2>
      <dl className="text-xs space-y-2">
        <Row icon={<Hash size={12} aria-hidden />} label={t('projectId')} value={projectId} />
        <Row icon={<Database size={12} aria-hidden />} label={t('dataset')} value={dataset} />
      </dl>
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <a
          href={cloudConsoleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 text-xs text-primary hover:underline rounded px-2 py-1"
        >
          <ExternalLink size={12} aria-hidden />
          {t('openBilling')}
        </a>
        <a
          href={bigQueryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 text-xs text-primary hover:underline rounded px-2 py-1"
        >
          <ExternalLink size={12} aria-hidden />
          {t('openBigQuery')}
        </a>
      </div>
    </section>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-tertiary">{icon}</span>
      <dt className="text-text-secondary">{label}:</dt>
      <dd className="font-medium tabular-nums truncate">{value}</dd>
    </div>
  );
}

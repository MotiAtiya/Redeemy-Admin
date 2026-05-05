'use client';
import { useTranslations } from 'next-intl';
import { Download } from 'lucide-react';

export default function ExportCsvButton({ hasData }: { hasData: boolean }) {
  const t = useTranslations('costDetail.export');

  return (
    <a
      href="/api/admin/cost/export"
      aria-disabled={!hasData}
      onClick={(e) => {
        if (!hasData) e.preventDefault();
      }}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-separator text-text-primary text-xs font-medium hover:bg-separator/40 transition ${
        hasData ? '' : 'opacity-50 pointer-events-none'
      }`}
    >
      <Download size={12} aria-hidden />
      {t('label')}
    </a>
  );
}

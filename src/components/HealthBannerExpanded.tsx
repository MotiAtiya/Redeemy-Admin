import { getTranslations } from 'next-intl/server';
import type { HealthSnapshot } from '@/lib/health';

interface Props {
  snapshot: HealthSnapshot;
  locale: string;
}

export default async function HealthBannerExpanded({ snapshot, locale }: Props) {
  const t = await getTranslations('health');

  return (
    <div className="px-4 pb-3 pt-1 border-t border-current/10">
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
        <Row
          label={t('details.firestoreWriteFailures1h')}
          value={snapshot.firestoreWriteFailures1h}
        />
        <Row
          label={t('details.firestoreWriteFailures24h')}
          value={snapshot.firestoreWriteFailures24h}
        />
        <Row
          label={t('details.imageUploadFailures1h')}
          value={snapshot.imageUploadFailures1h}
        />
        <Row
          label={t('details.imageUploadFailures24h')}
          value={snapshot.imageUploadFailures24h}
        />
      </div>

      {snapshot.recentErrors.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold mb-1 opacity-80">
            {t('details.recentErrorsHeading', { count: snapshot.recentErrors.length })}
          </h4>
          <ul className="space-y-1 text-xs">
            {snapshot.recentErrors.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-baseline gap-2">
                <span className="opacity-60 shrink-0" title={new Date(e.timestamp).toLocaleString(locale)}>
                  {relativeTime(e.timestamp, locale)}
                </span>
                <span className="font-medium truncate">
                  {e.userName ?? '—'}
                </span>
                <span className="opacity-80 truncate">
                  {t(`details.${e.type}`)}
                  {e.itemCategory ? ` (${e.itemCategory})` : ''}
                  {typeof e.metadata?.errorCode === 'string'
                    ? ` · ${e.metadata.errorCode}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="opacity-80 truncate">{label}</span>
      <span className={`font-mono font-semibold ${value > 0 ? '' : 'opacity-50'}`}>
        {value}
      </span>
    </div>
  );
}

function relativeTime(ms: number, locale: string): string {
  if (!ms) return '—';
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (sec < 60) return rtf.format(-sec, 'second');
  if (min < 60) return rtf.format(-min, 'minute');
  if (hr < 24) return rtf.format(-hr, 'hour');
  return rtf.format(-day, 'day');
}

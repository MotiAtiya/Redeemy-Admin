import { getTranslations, getLocale } from 'next-intl/server';
import { Apple, Smartphone, Crown } from 'lucide-react';
import { loadUsers, type UserRow } from '@/lib/users';

export const revalidate = 60;

export default async function UsersPage() {
  const t = await getTranslations('users');
  const locale = await getLocale();
  const users = await loadUsers();

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-3xl font-bold">{t('title')}</h2>
          <p className="text-text-secondary text-sm mt-1">
            {t('subtitle', { count: users.length })}
          </p>
        </div>
      </header>

      {users.length === 0 ? (
        <EmptyState message={t('empty')} />
      ) : (
        <>
          <div className="hidden md:block rounded-[var(--radius-card)] bg-surface shadow-wallet overflow-hidden">
            <UsersTable users={users} locale={locale} t={t} />
          </div>
          <div className="md:hidden space-y-3">
            {users.map((u) => (
              <UserCard key={u.uid} user={u} locale={locale} t={t} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function UserCard({
  user: u,
  locale,
  t,
}: {
  user: UserRow;
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations<'users'>>>;
}) {
  return (
    <article className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-4">
      <header className="flex items-center gap-3 mb-3">
        <Avatar src={u.photoURL} name={u.displayName ?? u.email ?? '?'} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-semibold truncate">{u.displayName ?? '—'}</h3>
            {u.isFamilyAdmin && <Crown size={12} className="text-primary shrink-0" aria-label="admin" />}
          </div>
          <p className="text-text-tertiary text-xs truncate" dir="ltr">
            {u.email ?? '—'}
          </p>
        </div>
        {u.platform === 'ios' ? (
          <Apple size={16} className="text-text-secondary shrink-0" aria-label="iOS" />
        ) : u.platform === 'android' ? (
          <Smartphone size={16} className="text-text-secondary shrink-0" aria-label="Android" />
        ) : null}
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
        <CardRow label={t('cols.signedUp')} value={relativeTime(u.createdAt, locale)} />
        <CardRow label={t('cols.lastActive')} value={relativeTime(u.lastSignInAt, locale)} />
        <CardRow
          label={t('cols.locale')}
          value={u.locale ? u.locale.toUpperCase() : '—'}
        />
        <CardRow
          label={t('cols.family')}
          value={u.family ? `${u.family.name} (${u.family.size})` : '—'}
        />
      </dl>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-separator">
        <CountPill label={t('cols.credits')} value={u.counts.credits} />
        <CountPill label={t('cols.warranties')} value={u.counts.warranties} />
        <CountPill label={t('cols.subscriptions')} value={u.counts.subscriptions} />
        <CountPill label={t('cols.occasions')} value={u.counts.occasions} />
        <CountPill label={t('cols.documents')} value={u.counts.documents} />
        <CountPill label={t('cols.total')} value={u.totalItems} highlight />
      </div>
    </article>
  );
}

function CardRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-1 min-w-0">
      <dt className="text-text-tertiary truncate">{label}:</dt>
      <dd className="font-medium truncate">{value}</dd>
    </div>
  );
}

function CountPill({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg px-2 py-1.5 text-center ${
        highlight ? 'bg-primary-surface text-primary' : 'bg-separator/50'
      }`}
    >
      <div className={`text-base font-bold ${value === 0 && !highlight ? 'text-text-tertiary' : ''}`}>
        {value}
      </div>
      <div className="text-[10px] text-text-secondary truncate">{label}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-10 text-center text-text-secondary">
      {message}
    </div>
  );
}

interface UsersTableProps {
  users: UserRow[];
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations<'users'>>>;
}

function UsersTable({ users, locale, t }: UsersTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-separator/50 text-text-secondary">
          <tr>
            <Th>{t('cols.user')}</Th>
            <Th>{t('cols.signedUp')}</Th>
            <Th>{t('cols.lastActive')}</Th>
            <Th>{t('cols.platform')}</Th>
            <Th>{t('cols.locale')}</Th>
            <Th>{t('cols.family')}</Th>
            <Th align="end">{t('cols.credits')}</Th>
            <Th align="end">{t('cols.warranties')}</Th>
            <Th align="end">{t('cols.subscriptions')}</Th>
            <Th align="end">{t('cols.occasions')}</Th>
            <Th align="end">{t('cols.documents')}</Th>
            <Th align="end">{t('cols.total')}</Th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.uid} className="border-t border-separator hover:bg-separator/30 transition">
              <Td>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={u.photoURL} name={u.displayName ?? u.email ?? '?'} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.displayName ?? '—'}</div>
                    <div className="text-text-tertiary text-xs truncate" dir="ltr">
                      {u.email ?? '—'}
                    </div>
                  </div>
                </div>
              </Td>
              <Td>{relativeTime(u.createdAt, locale)}</Td>
              <Td>{relativeTime(u.lastSignInAt, locale)}</Td>
              <Td>
                {u.platform === 'ios' ? (
                  <Apple size={16} className="text-text-secondary" aria-label="iOS" />
                ) : u.platform === 'android' ? (
                  <Smartphone size={16} className="text-text-secondary" aria-label="Android" />
                ) : (
                  <span className="text-text-tertiary">—</span>
                )}
              </Td>
              <Td>
                {u.locale ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-xs rounded bg-separator text-text-secondary">
                    {u.locale.toUpperCase()}
                  </span>
                ) : (
                  <span className="text-text-tertiary">—</span>
                )}
              </Td>
              <Td>
                {u.family ? (
                  <span className="inline-flex items-center gap-1.5 truncate">
                    {u.isFamilyAdmin && <Crown size={12} className="text-primary shrink-0" aria-label="admin" />}
                    <span className="truncate">{u.family.name}</span>
                    <span className="text-text-tertiary text-xs">({u.family.size})</span>
                  </span>
                ) : (
                  <span className="text-text-tertiary">—</span>
                )}
              </Td>
              <Count value={u.counts.credits} />
              <Count value={u.counts.warranties} />
              <Count value={u.counts.subscriptions} />
              <Count value={u.counts.occasions} />
              <Count value={u.counts.documents} />
              <Td align="end">
                <span className="font-semibold">{u.totalItems}</span>
                {u.totalItems === 0 && (
                  <span className="ms-2 inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-urgency-amber-surface text-urgency-amber" title="zero-state">
                    🌱
                  </span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, align = 'start' }: { children: React.ReactNode; align?: 'start' | 'end' }) {
  return (
    <th className={`px-3 py-2.5 font-medium text-${align} whitespace-nowrap`}>{children}</th>
  );
}

function Td({ children, align = 'start' }: { children: React.ReactNode; align?: 'start' | 'end' }) {
  return <td className={`px-3 py-2.5 align-middle text-${align}`}>{children}</td>;
}

function Count({ value }: { value: number }) {
  return (
    <Td align="end">
      <span className={value === 0 ? 'text-text-tertiary' : ''}>{value}</span>
    </Td>
  );
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        className="w-8 h-8 rounded-full object-cover bg-separator shrink-0"
        referrerPolicy="no-referrer"
      />
    );
  }
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <span
      aria-hidden
      className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-surface text-primary font-semibold text-sm shrink-0"
    >
      {initial}
    </span>
  );
}

function relativeTime(ms: number | null, locale: string): string {
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
  if (day < 30) return rtf.format(-day, 'day');
  const month = Math.floor(day / 30);
  if (month < 12) return rtf.format(-month, 'month');
  return rtf.format(-Math.floor(month / 12), 'year');
}

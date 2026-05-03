import Link from 'next/link';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { Users, Activity, ArrowLeft, ArrowRight } from 'lucide-react';
import { SESSION_COOKIE_NAME, verifySession } from '@/lib/session';
import { loadUserCount } from '@/lib/users';
import { loadEventsTodayCount } from '@/lib/events';
import { getLocale } from 'next-intl/server';

export const revalidate = 60;

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = (await verifySession(token ?? ''))!;
  const t = await getTranslations('home');
  const locale = await getLocale();
  const displayName = session.email.split('@')[0];

  const [userCount, eventsToday] = await Promise.all([
    loadUserCount(),
    loadEventsTodayCount(),
  ]);

  const Arrow = locale === 'he' ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold mb-1">{t('welcome', { name: displayName })}</h2>
        <p className="text-text-secondary text-sm">{t('intro')}</p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/users"
          className="group rounded-[var(--radius-card)] bg-surface shadow-wallet p-5 hover:shadow-md transition flex items-start gap-4"
        >
          <div className="rounded-lg bg-primary-surface text-primary p-3">
            <Users size={24} aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">{t('cards.users.title')}</h3>
              <Arrow size={16} className="text-text-tertiary group-hover:text-primary transition" aria-hidden />
            </div>
            <p className="text-3xl font-bold mt-1">{userCount}</p>
            <p className="text-xs text-text-secondary">{t('cards.users.subtitle')}</p>
          </div>
        </Link>

        <Link
          href="/activity"
          className="group rounded-[var(--radius-card)] bg-surface shadow-wallet p-5 hover:shadow-md transition flex items-start gap-4"
        >
          <div className="rounded-lg bg-primary-surface text-primary p-3">
            <Activity size={24} aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">{t('cards.activity.title')}</h3>
              <Arrow size={16} className="text-text-tertiary group-hover:text-primary transition" aria-hidden />
            </div>
            <p className="text-3xl font-bold mt-1">{eventsToday}</p>
            <p className="text-xs text-text-secondary">{t('cards.activity.subtitle')}</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

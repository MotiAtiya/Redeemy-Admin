import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { SESSION_COOKIE_NAME, verifySession } from '@/lib/session';
import TopBar from '@/components/shell/TopBar';

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  const t = await getTranslations('home');
  const displayName = session.email.split('@')[0];

  return (
    <>
      <TopBar email={session.email} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <section className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-6">
          <h2 className="text-2xl font-bold mb-2">{t('welcome', { name: displayName })}</h2>
          <p className="text-text-secondary text-sm leading-relaxed">{t('placeholder')}</p>
        </section>
      </main>
    </>
  );
}

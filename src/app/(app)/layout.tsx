import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE_NAME, verifySession } from '@/lib/session';
import TopBar from '@/components/shell/TopBar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  return (
    <>
      <TopBar email={session.email} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">{children}</main>
    </>
  );
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, verifySession } from '@/lib/session';
import { isEmailAllowed } from '@/lib/allowlist';
import { getSkuBreakdownForMonth } from '@/lib/costAnalytics';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || !isEmailAllowed(session.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const invoiceMonth = url.searchParams.get('invoiceMonth');
  if (!invoiceMonth || !/^\d{6}$/.test(invoiceMonth)) {
    return NextResponse.json({ error: 'invalid_invoice_month' }, { status: 400 });
  }

  try {
    const skus = await getSkuBreakdownForMonth(invoiceMonth);
    return NextResponse.json({ skus });
  } catch (err) {
    return NextResponse.json(
      { error: 'query_failed', detail: String((err as Error)?.message ?? err) },
      { status: 502 },
    );
  }
}

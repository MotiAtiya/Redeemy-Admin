import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, verifySession } from '@/lib/session';
import { isEmailAllowed } from '@/lib/allowlist';
import { updateCost } from '@/lib/cost';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || !isEmailAllowed(session.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const amount = (body as { amountUSD?: unknown })?.amountUSD;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });
  }

  await updateCost({ amountUSD: amount, email: session.email });
  return NextResponse.json({ ok: true });
}

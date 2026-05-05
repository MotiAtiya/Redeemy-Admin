import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, verifySession } from '@/lib/session';
import { isEmailAllowed } from '@/lib/allowlist';
import { updateCostAlertConfig } from '@/lib/costAlerts';

export const dynamic = 'force-dynamic';

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

  const raw = body as { amount?: unknown; enabled?: unknown; dailySpikeEnabled?: unknown };

  const amount =
    raw.amount === null
      ? null
      : typeof raw.amount === 'number' && Number.isFinite(raw.amount) && raw.amount >= 0
        ? raw.amount
        : undefined;
  if (amount === undefined) {
    return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });
  }

  await updateCostAlertConfig({
    enabled: Boolean(raw.enabled),
    thresholdAmount: amount,
    dailySpikeEnabled: Boolean(raw.dailySpikeEnabled),
  });

  return NextResponse.json({ ok: true });
}

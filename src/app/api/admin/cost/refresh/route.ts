import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, verifySession } from '@/lib/session';
import { isEmailAllowed } from '@/lib/allowlist';
import { adminFirestore } from '@/lib/firebaseAdmin';
import { getMTDCostFromBigQuery } from '@/lib/bigqueryCost';

export const dynamic = 'force-dynamic';

const COST_DOC_PATH = 'admin_settings/firebase_cost';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || !isEmailAllowed(session.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let result;
  try {
    result = await getMTDCostFromBigQuery();
  } catch (err) {
    return NextResponse.json(
      { error: 'bigquery_failed', detail: String((err as Error)?.message ?? err) },
      { status: 502 },
    );
  }

  if (!result.hasData || result.amount === null) {
    return NextResponse.json({ ok: true, skipped: 'no_bigquery_data' });
  }

  await adminFirestore.doc(COST_DOC_PATH).set(
    {
      monthYear: result.monthYear,
      amount: result.amount,
      currency: result.currency ?? 'USD',
      updatedAt: new Date(),
      updatedBy: `manual:${session.email}`,
      source: 'bigquery',
    },
    { merge: true },
  );

  return NextResponse.json({ ok: true, amount: result.amount, currency: result.currency });
}

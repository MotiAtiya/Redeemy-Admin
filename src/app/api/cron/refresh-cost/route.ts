import { NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebaseAdmin';
import { getMTDCostFromBigQuery } from '@/lib/bigqueryCost';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const COST_DOC_PATH = 'admin_settings/firebase_cost';
const AUTO_UPDATED_BY = 'auto:bigquery';

function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return req.headers.get('authorization') === `Bearer ${expected}`;
}

async function refresh() {
  let result;
  try {
    result = await getMTDCostFromBigQuery();
  } catch (err) {
    const message = String((err as Error)?.message ?? err);
    return NextResponse.json({ error: 'bigquery_query_failed', detail: message }, { status: 502 });
  }

  // No data yet (e.g. export hasn't propagated). Don't overwrite the manual
  // value — leave whatever's already in the doc.
  if (!result.hasData || result.amountUSD === null) {
    return NextResponse.json({
      ok: true,
      skipped: 'no_bigquery_data_yet',
      monthYear: result.monthYear,
    });
  }

  await adminFirestore.doc(COST_DOC_PATH).set(
    {
      monthYear: result.monthYear,
      amountUSD: result.amountUSD,
      updatedAt: new Date(),
      updatedBy: AUTO_UPDATED_BY,
      source: 'bigquery',
    },
    { merge: true },
  );

  return NextResponse.json({
    ok: true,
    monthYear: result.monthYear,
    amountUSD: result.amountUSD,
    updatedBy: AUTO_UPDATED_BY,
  });
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return refresh();
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return refresh();
}

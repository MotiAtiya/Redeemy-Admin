import { NextResponse } from 'next/server';
import { runCostAlertCheck } from '@/lib/costAlerts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return req.headers.get('authorization') === `Bearer ${expected}`;
}

async function run() {
  try {
    const result = await runCostAlertCheck();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: 'alert_check_failed', detail: String((err as Error)?.message ?? err) },
      { status: 502 },
    );
  }
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return run();
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return run();
}

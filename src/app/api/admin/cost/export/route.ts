import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, verifySession } from '@/lib/session';
import { isEmailAllowed } from '@/lib/allowlist';
import { getCostAnalytics } from '@/lib/costAnalytics';

export const dynamic = 'force-dynamic';

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || !isEmailAllowed(session.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const a = await getCostAnalytics();
  const lines: string[] = [];

  lines.push('Section,Key,SubKey,Amount,Credits,Currency,Extra');

  for (const m of a.monthlyHistory) {
    lines.push(
      ['monthly', m.month, '', m.amount, m.credits, a.currency, ''].map(csvEscape).join(','),
    );
  }
  for (const d of a.dailyCurrentMonth) {
    lines.push(['daily', d.date, '', d.amount, d.credits, a.currency, ''].map(csvEscape).join(','));
  }
  for (const s of a.skuBreakdownCurrent) {
    const usage = s.usageAmount !== null ? `${s.usageAmount} ${s.usageUnit ?? ''}`.trim() : '';
    lines.push(
      ['sku_current', s.service, s.sku, s.amount, s.credits, a.currency, usage]
        .map(csvEscape)
        .join(','),
    );
  }
  for (const [m, count] of Object.entries(a.monthlyActiveUsers)) {
    lines.push(['mau', m, '', count, '', '', ''].map(csvEscape).join(','));
  }

  const csv = lines.join('\n');
  const filename = `redeemy-cost-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  });
}

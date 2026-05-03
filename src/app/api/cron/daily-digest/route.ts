import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { adminFirestore } from '@/lib/firebaseAdmin';
import { buildDigest } from '@/lib/digest';
import {
  renderDigestHtmlHe,
  renderDigestSubjectHe,
  renderDigestText,
} from '@/lib/digestTemplate';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${expected}`;
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

async function recordFailure(message: string) {
  try {
    await adminFirestore.collection('admin_settings').doc('digest_failures').set(
      {
        lastFailureAt: new Date(),
        lastFailureMessage: message.slice(0, 500),
      },
      { merge: true },
    );
  } catch {
    // best-effort
  }
}

async function send() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'missing_resend_api_key' }, { status: 500 });
  }
  const recipients = adminEmails();
  if (recipients.length === 0) {
    return NextResponse.json({ error: 'no_recipients' }, { status: 500 });
  }

  const dashboardUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3000';
  const fromEmail = process.env.DIGEST_FROM_EMAIL ?? 'onboarding@resend.dev';

  let digest;
  try {
    digest = await buildDigest();
  } catch (err) {
    const msg = String((err as Error)?.message ?? err);
    await recordFailure(`buildDigest: ${msg}`);
    return NextResponse.json({ error: 'build_failed', detail: msg }, { status: 500 });
  }

  const resend = new Resend(apiKey);
  const html = renderDigestHtmlHe({ digest, dashboardUrl });
  const text = renderDigestText(digest);
  const subject = renderDigestSubjectHe(digest);

  try {
    const { data, error } = await resend.emails.send({
      from: `Redeemy Admin <${fromEmail}>`,
      to: recipients,
      subject,
      html,
      text,
    });
    if (error) {
      await recordFailure(`resend: ${error.name} ${error.message}`);
      return NextResponse.json({ error: 'send_failed', detail: error.message }, { status: 502 });
    }
    return NextResponse.json({ ok: true, dateISO: digest.dateISO, id: data?.id });
  } catch (err) {
    const msg = String((err as Error)?.message ?? err);
    await recordFailure(`resend exception: ${msg}`);
    return NextResponse.json({ error: 'send_exception', detail: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return send();
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return send();
}

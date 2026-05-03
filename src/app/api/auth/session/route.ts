import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebaseAdmin';
import { isEmailAllowed } from '@/lib/allowlist';
import { createSession, SESSION_COOKIE_NAME, SESSION_TTL } from '@/lib/session';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const idToken = (body as { idToken?: unknown })?.idToken;
  if (typeof idToken !== 'string') {
    return NextResponse.json({ error: 'missing_id_token' }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  const email = decoded.email?.toLowerCase();
  if (!email || !isEmailAllowed(email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const token = await createSession({ uid: decoded.uid, email });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL,
  });

  return NextResponse.json({ ok: true, email });
}

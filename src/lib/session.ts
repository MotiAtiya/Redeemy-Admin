import 'server-only';
import { SignJWT, jwtVerify } from 'jose';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const SESSION_COOKIE_NAME = 'redeemy_admin_session';
export const SESSION_TTL = SESSION_TTL_SECONDS;

function getSecret(): Uint8Array {
  const raw = process.env.SESSION_SECRET;
  if (!raw) throw new Error('Missing SESSION_SECRET env var');
  return new TextEncoder().encode(raw);
}

export interface SessionPayload {
  uid: string;
  email: string;
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ uid: payload.uid, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.uid === 'string' &&
      typeof payload.email === 'string'
    ) {
      return { uid: payload.uid, email: payload.email };
    }
    return null;
  } catch {
    return null;
  }
}

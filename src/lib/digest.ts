import 'server-only';
import { adminAuth, adminFirestore } from './firebaseAdmin';
import type { ItemCategory } from './events';

export interface NewUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  locale: string | null;
}

export interface Digest {
  // Inclusive ISO date of the first day covered by the digest.
  weekStartISO: string;
  // Inclusive ISO date of the last day covered by the digest (yesterday in Israel TZ).
  weekEndISO: string;
  rangeLabelHe: string; // "26 באפריל – 2 במאי 2026"
  rangeLabelEn: string; // "Apr 26 – May 2, 2026"
  newUsers: NewUser[];
  itemsCreated: Record<ItemCategory, number>;
  errors: {
    firestoreWriteFailed: number;
    imageUploadFailed: number;
  };
  costMTDUSD: number | null;
  totalUsers: number;
  appOpenedCount: number;
  generatedAt: number;
}

const ISRAEL_TIMEZONE = 'Asia/Jerusalem';

/**
 * Compute the bounds of the digest period: the 7 calendar days leading up to
 * (and including) yesterday in Israel time. Returned as UTC Date objects
 * suitable for Firestore range queries.
 */
function lastWeekBoundsInIsrael(): {
  start: Date;
  end: Date;
  startISO: string;
  endISO: string;
} {
  // Find "today" in Israel calendar terms.
  const nowFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayParts = nowFormatter.formatToParts(new Date());
  const ty = Number(todayParts.find((p) => p.type === 'year')!.value);
  const tm = Number(todayParts.find((p) => p.type === 'month')!.value);
  const td = Number(todayParts.find((p) => p.type === 'day')!.value);

  // End = yesterday at 23:59:59.999 IL.  Start = end - 7 days + 1 ms (i.e. 8 days back at 00:00).
  const todayUtcMidnight = Date.UTC(ty, tm - 1, td);
  const endDayUtcMidnight = todayUtcMidnight - 24 * 60 * 60 * 1000; // yesterday
  const startDayUtcMidnight = todayUtcMidnight - 7 * 24 * 60 * 60 * 1000; // 7 days ago

  const endParts = new Date(endDayUtcMidnight);
  const startParts = new Date(startDayUtcMidnight);

  const endY = endParts.getUTCFullYear();
  const endM = endParts.getUTCMonth();
  const endD = endParts.getUTCDate();
  const startY = startParts.getUTCFullYear();
  const startM = startParts.getUTCMonth();
  const startD = startParts.getUTCDate();

  const endOffsetMin = getIsraelOffsetMinutes(new Date(Date.UTC(endY, endM, endD, 12)));
  const startOffsetMin = getIsraelOffsetMinutes(new Date(Date.UTC(startY, startM, startD, 12)));

  const startUtcMs = Date.UTC(startY, startM, startD, 0, 0, 0) - startOffsetMin * 60 * 1000;
  const endUtcMs =
    Date.UTC(endY, endM, endD, 23, 59, 59, 999) - endOffsetMin * 60 * 1000;

  const fmt = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  return {
    start: new Date(startUtcMs),
    end: new Date(endUtcMs),
    startISO: fmt(startY, startM, startD),
    endISO: fmt(endY, endM, endD),
  };
}

function getIsraelOffsetMinutes(d: Date): number {
  // Use Intl to format the date in Israel TZ and compare to UTC.
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const local = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') === 24 ? 0 : get('hour'), get('minute'), get('second'));
  return Math.round((local - d.getTime()) / 60000);
}

const HE_MONTHS = [
  'בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני',
  'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר',
];
const HE_MONTHS_NO_PREFIX = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

function formatDateRangeHe(startISO: string, endISO: string): string {
  const [sy, sm, sd] = startISO.split('-').map(Number);
  const [ey, em, ed] = endISO.split('-').map(Number);
  if (sy === ey && sm === em) {
    return `${sd}–${ed} ${HE_MONTHS[em - 1]} ${ey}`;
  }
  if (sy === ey) {
    return `${sd} ${HE_MONTHS_NO_PREFIX[sm - 1]} – ${ed} ${HE_MONTHS_NO_PREFIX[em - 1]} ${ey}`;
  }
  return `${sd} ${HE_MONTHS_NO_PREFIX[sm - 1]} ${sy} – ${ed} ${HE_MONTHS_NO_PREFIX[em - 1]} ${ey}`;
}

function formatDateRangeEn(startISO: string, endISO: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };
  const start = new Date(`${startISO}T12:00:00Z`).toLocaleDateString('en-US', opts);
  const end = new Date(`${endISO}T12:00:00Z`).toLocaleDateString('en-US', opts);
  const year = endISO.slice(0, 4);
  return `${start} – ${end}, ${year}`;
}

const ITEM_CATEGORIES: ItemCategory[] = ['credit', 'warranty', 'subscription', 'occasion', 'document'];

export async function buildDigest(): Promise<Digest> {
  const { start, end, startISO, endISO } = lastWeekBoundsInIsrael();

  const [
    newUsers,
    itemsCreated,
    errors,
    appOpenedCount,
    totalUsersCount,
    costMTDUSD,
  ] = await Promise.all([
    fetchNewUsersBetween(start, end),
    countItemsCreatedBetween(start, end),
    countErrorEventsBetween(start, end),
    countEventTypeBetween('app_opened', start, end),
    fetchTotalUserCount(),
    fetchCostMTD(),
  ]);

  return {
    weekStartISO: startISO,
    weekEndISO: endISO,
    rangeLabelHe: formatDateRangeHe(startISO, endISO),
    rangeLabelEn: formatDateRangeEn(startISO, endISO),
    newUsers,
    itemsCreated,
    errors,
    costMTDUSD,
    totalUsers: totalUsersCount,
    appOpenedCount,
    generatedAt: Date.now(),
  };
}

async function fetchNewUsersBetween(start: Date, end: Date): Promise<NewUser[]> {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const auth = await adminAuth.listUsers(1000);
  const users: NewUser[] = [];
  for (const u of auth.users) {
    const ts = u.metadata.creationTime ? new Date(u.metadata.creationTime).getTime() : 0;
    if (ts >= startMs && ts <= endMs) {
      users.push({
        uid: u.uid,
        email: u.email ?? null,
        displayName: u.displayName ?? null,
        locale: null,
      });
    }
  }
  // Best-effort attach locale from the most recent event for each user.
  if (users.length > 0) {
    const eventsSnap = await adminFirestore
      .collection('events')
      .where('userId', 'in', users.map((u) => u.uid).slice(0, 10))
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get()
      .catch(() => null);
    if (eventsSnap) {
      const localeByUid = new Map<string, string>();
      for (const d of eventsSnap.docs) {
        const data = d.data();
        if (typeof data.userId === 'string' && typeof data.locale === 'string' && !localeByUid.has(data.userId)) {
          localeByUid.set(data.userId, data.locale);
        }
      }
      for (const u of users) {
        u.locale = localeByUid.get(u.uid) ?? null;
      }
    }
  }
  return users;
}

async function countItemsCreatedBetween(start: Date, end: Date): Promise<Record<ItemCategory, number>> {
  const result = { credit: 0, warranty: 0, subscription: 0, occasion: 0, document: 0 } as Record<ItemCategory, number>;
  const counts = await Promise.all(
    ITEM_CATEGORIES.map(async (cat) => {
      const snap = await adminFirestore
        .collection('events')
        .where('type', '==', 'item_created')
        .where('itemCategory', '==', cat)
        .where('timestamp', '>=', start)
        .where('timestamp', '<=', end)
        .count()
        .get()
        .catch(() => null);
      return [cat, snap?.data().count ?? 0] as const;
    }),
  );
  for (const [cat, count] of counts) {
    result[cat] = count;
  }
  return result;
}

async function countErrorEventsBetween(start: Date, end: Date): Promise<{ firestoreWriteFailed: number; imageUploadFailed: number }> {
  const [fwf, iuf] = await Promise.all([
    countEventTypeBetween('firestore_write_failed', start, end),
    countEventTypeBetween('image_upload_failed', start, end),
  ]);
  return { firestoreWriteFailed: fwf, imageUploadFailed: iuf };
}

async function countEventTypeBetween(type: string, start: Date, end: Date): Promise<number> {
  const snap = await adminFirestore
    .collection('events')
    .where('type', '==', type)
    .where('timestamp', '>=', start)
    .where('timestamp', '<=', end)
    .count()
    .get()
    .catch(() => null);
  return snap?.data().count ?? 0;
}

async function fetchTotalUserCount(): Promise<number> {
  const r = await adminAuth.listUsers(1000);
  return r.users.length;
}

async function fetchCostMTD(): Promise<number | null> {
  const monthYear = new Date().toISOString().slice(0, 7);
  const doc = await adminFirestore.collection('admin_settings').doc('firebase_cost').get();
  const data = doc.exists ? doc.data() : null;
  if (data?.monthYear === monthYear && typeof data?.amountUSD === 'number') {
    return data.amountUSD;
  }
  return null;
}

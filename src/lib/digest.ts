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
  dateISO: string; // YYYY-MM-DD
  dateLabelHe: string; // "3 במאי 2026"
  dateLabelEn: string; // "May 3, 2026"
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
 * Compute the start (00:00) and end (23:59:59.999) of "yesterday" in Israel time,
 * expressed as UTC Date objects suitable for Firestore range queries.
 */
function yesterdayBoundsInIsrael(): { start: Date; end: Date; isoDate: string } {
  // Build the Israel-local date for "yesterday".
  const nowFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayParts = nowFormatter.formatToParts(new Date());
  const y = Number(todayParts.find((p) => p.type === 'year')!.value);
  const m = Number(todayParts.find((p) => p.type === 'month')!.value);
  const d = Number(todayParts.find((p) => p.type === 'day')!.value);

  // Yesterday = (y, m, d) minus one day, computed via a UTC date as scaffolding.
  const todayUtcMidnight = Date.UTC(y, m - 1, d);
  const yesterdayUtcMidnight = todayUtcMidnight - 24 * 60 * 60 * 1000;
  const yesterdayParts = new Date(yesterdayUtcMidnight);

  const yy = yesterdayParts.getUTCFullYear();
  const mm = yesterdayParts.getUTCMonth();
  const dd = yesterdayParts.getUTCDate();

  // Israel offset in minutes for that yesterday date (handles DST automatically).
  const offsetMinutes = getIsraelOffsetMinutes(new Date(Date.UTC(yy, mm, dd, 12)));
  const startUtcMs = Date.UTC(yy, mm, dd, 0, 0, 0) - offsetMinutes * 60 * 1000;
  const endUtcMs = Date.UTC(yy, mm, dd, 23, 59, 59, 999) - offsetMinutes * 60 * 1000;

  return {
    start: new Date(startUtcMs),
    end: new Date(endUtcMs),
    isoDate: `${yy}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`,
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

function formatDateHe(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const months = [
    'בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני',
    'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר',
  ];
  return `${d} ${months[m - 1]} ${y}`;
}

function formatDateEn(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

const ITEM_CATEGORIES: ItemCategory[] = ['credit', 'warranty', 'subscription', 'occasion', 'document'];

export async function buildDigest(): Promise<Digest> {
  const { start, end, isoDate } = yesterdayBoundsInIsrael();

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
    dateISO: isoDate,
    dateLabelHe: formatDateHe(isoDate),
    dateLabelEn: formatDateEn(isoDate),
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

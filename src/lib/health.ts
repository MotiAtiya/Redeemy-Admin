import 'server-only';
import { adminAuth, adminFirestore } from './firebaseAdmin';

export type HealthVariant = 'green' | 'orange' | 'red';

export interface ErrorEvent {
  id: string;
  type: 'firestore_write_failed' | 'image_upload_failed';
  userName: string | null;
  itemCategory: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: number;
}

export interface HealthSnapshot {
  variant: HealthVariant;
  // Error counts
  firestoreWriteFailures24h: number;
  imageUploadFailures24h: number;
  firestoreWriteFailures1h: number;
  imageUploadFailures1h: number;
  // DAU sanity check
  totalUsers: number;
  eventsLast24h: number;
  // Recent error sample (for the expanded view)
  recentErrors: ErrorEvent[];
  computedAt: number;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Compute the dashboard's overall health snapshot.
 *
 * Sources (V1):
 *  - events/ collection — counts of `firestore_write_failed` and `image_upload_failed`
 *  - DAU sanity — "no events at all in the last 24h while users exist" → orange flag
 *
 * Crashlytics integration (crash-free %, top crash signatures) is deferred
 * to V2 once Crashlytics → BigQuery export is set up. See deferred-work.md.
 */
export async function getHealthSnapshot(): Promise<HealthSnapshot> {
  const now = Date.now();
  const since1h = new Date(now - HOUR_MS);
  const since24h = new Date(now - DAY_MS);

  const [usersResult, errorCountsByType, eventsLast24hCount, recentErrors] = await Promise.all([
    adminAuth.listUsers(1000).catch(() => ({ users: [] })),
    countErrorEvents(since1h, since24h),
    countAllEventsSince(since24h),
    fetchRecentErrors(20),
  ]);

  const variant = computeVariant({
    fwf24h: errorCountsByType.firestoreWriteFailures24h,
    iuf24h: errorCountsByType.imageUploadFailures24h,
    fwf1h: errorCountsByType.firestoreWriteFailures1h,
    iuf1h: errorCountsByType.imageUploadFailures1h,
    totalUsers: usersResult.users.length,
    eventsLast24h: eventsLast24hCount,
  });

  return {
    variant,
    ...errorCountsByType,
    totalUsers: usersResult.users.length,
    eventsLast24h: eventsLast24hCount,
    recentErrors,
    computedAt: now,
  };
}

interface ErrorCounts {
  firestoreWriteFailures24h: number;
  imageUploadFailures24h: number;
  firestoreWriteFailures1h: number;
  imageUploadFailures1h: number;
}

async function countErrorEvents(since1h: Date, since24h: Date): Promise<ErrorCounts> {
  const [fwf24, fwf1, iuf24, iuf1] = await Promise.all([
    countByTypeSince('firestore_write_failed', since24h),
    countByTypeSince('firestore_write_failed', since1h),
    countByTypeSince('image_upload_failed', since24h),
    countByTypeSince('image_upload_failed', since1h),
  ]);
  return {
    firestoreWriteFailures24h: fwf24,
    firestoreWriteFailures1h: fwf1,
    imageUploadFailures24h: iuf24,
    imageUploadFailures1h: iuf1,
  };
}

async function countByTypeSince(type: string, since: Date): Promise<number> {
  const snap = await adminFirestore
    .collection('events')
    .where('type', '==', type)
    .where('timestamp', '>=', since)
    .count()
    .get();
  return snap.data().count;
}

async function countAllEventsSince(since: Date): Promise<number> {
  const snap = await adminFirestore
    .collection('events')
    .where('timestamp', '>=', since)
    .count()
    .get();
  return snap.data().count;
}

async function fetchRecentErrors(limit: number): Promise<ErrorEvent[]> {
  const snap = await adminFirestore
    .collection('events')
    .where('type', 'in', ['firestore_write_failed', 'image_upload_failed'])
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    const ts = (data.timestamp as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    return {
      id: d.id,
      type: data.type,
      userName: typeof data.userName === 'string' ? data.userName : null,
      itemCategory: typeof data.itemCategory === 'string' ? data.itemCategory : null,
      metadata: (data.metadata as Record<string, unknown> | undefined) ?? null,
      timestamp: ts,
    };
  });
}

interface VariantInputs {
  fwf24h: number;
  iuf24h: number;
  fwf1h: number;
  iuf1h: number;
  totalUsers: number;
  eventsLast24h: number;
}

function computeVariant(i: VariantInputs): HealthVariant {
  // Red: real-time error spike OR sustained failures
  if (i.fwf1h >= 5 || i.iuf1h >= 10 || i.fwf24h >= 20 || i.iuf24h >= 30) {
    return 'red';
  }
  // Orange: any errors in 24h, OR DAU sanity flag (users exist but zero activity)
  if (i.fwf24h > 0 || i.iuf24h > 0) {
    return 'orange';
  }
  if (i.totalUsers > 0 && i.eventsLast24h === 0) {
    return 'orange';
  }
  return 'green';
}

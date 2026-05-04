import 'server-only';
import { adminFirestore } from './firebaseAdmin';

export type EventType =
  | 'sign_in'
  | 'sign_up'
  | 'sign_out'
  | 'item_created'
  | 'item_updated'
  | 'item_deleted'
  | 'credit_redeemed'
  | 'credit_unredeemed'
  | 'credit_expired'
  | 'subscription_cancelled'
  | 'subscription_renewed'
  | 'subscription_expired'
  | 'warranty_closed'
  | 'warranty_expired'
  | 'document_renewed'
  | 'family_created'
  | 'family_joined'
  | 'family_left'
  | 'firestore_write_failed'
  | 'image_upload_failed'
  | 'app_opened';

export const ERROR_EVENT_TYPES: ReadonlySet<EventType> = new Set([
  'firestore_write_failed',
  'image_upload_failed',
]);

export type ItemCategory = 'credit' | 'warranty' | 'subscription' | 'occasion' | 'document';

export interface AppEvent {
  id: string;
  type: EventType;
  userId: string;
  userName: string | null;
  itemCategory: ItemCategory | null;
  itemId: string | null;
  metadata: Record<string, unknown> | null;
  appVersion: string | null;
  platform: 'ios' | 'android' | null;
  locale: 'he' | 'en' | null;
  timestamp: number; // ms epoch
}

function normalizeEvent(id: string, data: Record<string, unknown>): AppEvent {
  const ts = (data.timestamp as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
  return {
    id,
    type: (data.type as EventType) ?? 'app_opened',
    userId: typeof data.userId === 'string' ? data.userId : 'anon',
    userName: typeof data.userName === 'string' ? data.userName : null,
    itemCategory: (data.itemCategory as ItemCategory | undefined) ?? null,
    itemId: typeof data.itemId === 'string' ? data.itemId : null,
    metadata: (data.metadata as Record<string, unknown> | undefined) ?? null,
    appVersion: typeof data.appVersion === 'string' ? data.appVersion : null,
    platform: (data.platform as 'ios' | 'android' | undefined) ?? null,
    locale: (data.locale as 'he' | 'en' | undefined) ?? null,
    timestamp: ts,
  };
}

export async function loadEvents(limit = 200): Promise<AppEvent[]> {
  const snap = await adminFirestore
    .collection('events')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => normalizeEvent(d.id, d.data()));
}

export async function loadEventsTodayCount(): Promise<number> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const snap = await adminFirestore
    .collection('events')
    .where('timestamp', '>=', startOfToday)
    .count()
    .get();
  return snap.data().count;
}

import 'server-only';
import { adminAuth, adminFirestore } from './firebaseAdmin';
import type { ItemCategory } from './events';
import type { AppEvent } from './events';

const ITEM_COLLECTIONS: ItemCategory[] = ['credit', 'warranty', 'subscription', 'occasion', 'document'];
const STATUS_FILTERED: ReadonlySet<ItemCategory> = new Set(['credit', 'warranty', 'subscription']);

const COLLECTION_NAME: Record<ItemCategory, string> = {
  credit: 'credits',
  warranty: 'warranties',
  subscription: 'subscriptions',
  occasion: 'occasions',
  document: 'documents',
};

export interface UserAuth {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  disabled: boolean;
  createdAt: number | null; // ms epoch
  lastSignInAt: number | null;
  providers: string[];
}

export interface UserFamily {
  id: string;
  name: string;
  isAdmin: boolean;
  members: Array<{ uid: string; displayName: string; photoURL: string | null; isAdmin: boolean }>;
}

export interface ItemSummary {
  id: string;
  title: string;
  /**
   * Optional i18n key for a translated prefix prepended to the title at render
   * time (e.g. "documentTypes.license" → "רישיון" / "License"). Null when the
   * item is identified entirely by user-typed text.
   */
  typeKey: string | null;
  status: string | null;
  createdAt: number | null;
}

export interface CategoryStats {
  totalCount: number;
  activeCount: number;
  recent: ItemSummary[];
}

export interface UserDetail {
  auth: UserAuth;
  firestoreDoc: Record<string, unknown> | null;
  family: UserFamily | null;
  itemsByCategory: Record<ItemCategory, CategoryStats>;
  events: AppEvent[]; // last 50, newest first
  latestPlatform: 'ios' | 'android' | null;
  latestLocale: 'he' | 'en' | null;
  latestAppVersion: string | null;
}

function tsMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof (value as { toMillis?: () => number })?.toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return null;
}

function extractItem(
  category: ItemCategory,
  data: Record<string, unknown>,
): { title: string; typeKey: string | null } {
  switch (category) {
    case 'credit': {
      const store = (data.storeName as string | undefined) ?? '—';
      const amount = (data.amount as number | undefined) ?? 0;
      const currency = (data.currency as string | undefined) ?? 'ILS';
      const value = amount / 100;
      const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : currency;
      return { title: `${store} · ${symbol}${value.toFixed(0)}`, typeKey: null };
    }
    case 'warranty': {
      const store = (data.storeName as string | undefined) ?? '—';
      const productType = (data.productType as string | undefined) ?? '';
      return {
        title: productType ? `${store} · ${productType}` : store,
        typeKey: null,
      };
    }
    case 'subscription': {
      return { title: (data.serviceName as string | undefined) ?? '—', typeKey: null };
    }
    case 'occasion': {
      const name = (data.name as string | undefined) ?? '';
      const type = (data.type as string | undefined) ?? '';
      return { title: name || type || '—', typeKey: null };
    }
    case 'document': {
      const docType = (data.type as string | undefined) ?? '';
      const owner = (data.ownerName as string | undefined) ?? '';
      const custom = (data.customTypeName as string | undefined) ?? '';
      // Custom name takes precedence — user typed it, no translation needed.
      if (custom) {
        return { title: owner ? `${custom} · ${owner}` : custom, typeKey: null };
      }
      // Standard enum type — translated at render via typeKey.
      return {
        title: owner || '—',
        typeKey: docType ? `documentTypes.${docType}` : null,
      };
    }
  }
}

async function fetchAuthRecord(uid: string): Promise<UserAuth | null> {
  try {
    const u = await adminAuth.getUser(uid);
    return {
      uid: u.uid,
      email: u.email ?? null,
      displayName: u.displayName ?? null,
      photoURL: u.photoURL ?? null,
      emailVerified: u.emailVerified,
      disabled: u.disabled,
      createdAt: u.metadata.creationTime ? new Date(u.metadata.creationTime).getTime() : null,
      lastSignInAt: u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime).getTime() : null,
      providers: u.providerData.map((p) => p.providerId),
    };
  } catch {
    return null;
  }
}

async function fetchFirestoreDoc(uid: string): Promise<Record<string, unknown> | null> {
  const snap = await adminFirestore.collection('users').doc(uid).get();
  return snap.exists ? (snap.data() as Record<string, unknown>) : null;
}

async function fetchFamily(uid: string, familyId: string | null): Promise<UserFamily | null> {
  if (!familyId) return null;
  const snap = await adminFirestore.collection('families').doc(familyId).get();
  if (!snap.exists) return null;
  const data = snap.data() ?? {};
  const adminId = (data.adminId as string | undefined) ?? '';
  const membersMap = (data.members as Record<string, { displayName?: string; photoURL?: string }> | undefined) ?? {};
  const members = Object.entries(membersMap).map(([memberUid, m]) => ({
    uid: memberUid,
    displayName: m.displayName ?? memberUid,
    photoURL: m.photoURL ?? null,
    isAdmin: memberUid === adminId,
  }));
  return {
    id: snap.id,
    name: (data.name as string | undefined) ?? 'Family',
    isAdmin: adminId === uid,
    members,
  };
}

async function fetchCategoryStats(uid: string, category: ItemCategory): Promise<CategoryStats> {
  const collection = COLLECTION_NAME[category];
  const snap = await adminFirestore
    .collection(collection)
    .where('userId', '==', uid)
    .get();

  const items: ItemSummary[] = snap.docs.map((d) => {
    const data = d.data();
    const { title, typeKey } = extractItem(category, data);
    return {
      id: d.id,
      title,
      typeKey,
      status: typeof data.status === 'string' ? data.status : null,
      createdAt: tsMillis(data.createdAt),
    };
  });

  let activeCount = items.length;
  if (STATUS_FILTERED.has(category)) {
    activeCount = items.filter((i) => !i.status || i.status === 'active').length;
  }

  const recent = items
    .slice()
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, 5);

  return { totalCount: items.length, activeCount, recent };
}

async function fetchEvents(uid: string, limit: number): Promise<AppEvent[]> {
  // Requires composite index on events: (userId ASC, timestamp DESC).
  // First-run failures will give a clickable auto-create link in Vercel logs.
  const snap = await adminFirestore
    .collection('events')
    .where('userId', '==', uid)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    const ts = tsMillis(data.timestamp) ?? 0;
    return {
      id: d.id,
      type: data.type,
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
  });
}

export async function loadUserDetail(uid: string): Promise<UserDetail | null> {
  const auth = await fetchAuthRecord(uid);
  if (!auth) return null;

  const [firestoreDoc, events, ...categoryEntries] = await Promise.all([
    fetchFirestoreDoc(uid),
    fetchEvents(uid, 50),
    ...ITEM_COLLECTIONS.map((c) => fetchCategoryStats(uid, c)),
  ]);

  const itemsByCategory = ITEM_COLLECTIONS.reduce<Record<ItemCategory, CategoryStats>>(
    (acc, cat, idx) => {
      acc[cat] = categoryEntries[idx];
      return acc;
    },
    {} as Record<ItemCategory, CategoryStats>,
  );

  const familyId = typeof firestoreDoc?.familyId === 'string' ? firestoreDoc.familyId : null;
  const family = await fetchFamily(uid, familyId);

  const latestEvent = events[0];
  return {
    auth,
    firestoreDoc,
    family,
    itemsByCategory,
    events,
    latestPlatform: latestEvent?.platform ?? null,
    latestLocale: latestEvent?.locale ?? null,
    latestAppVersion: latestEvent?.appVersion ?? null,
  };
}

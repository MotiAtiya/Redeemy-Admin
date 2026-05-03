import 'server-only';
import { adminAuth, adminFirestore } from './firebaseAdmin';

const ITEM_COLLECTIONS = ['credits', 'warranties', 'subscriptions', 'occasions', 'documents'] as const;
export type ItemCollection = (typeof ITEM_COLLECTIONS)[number];

export interface UserRow {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: number | null; // ms epoch
  lastSignInAt: number | null;
  locale: 'he' | 'en' | null;
  platform: 'ios' | 'android' | null;
  appVersion: string | null;
  family: { id: string; name: string; size: number } | null;
  counts: Record<ItemCollection, number>;
  totalItems: number;
  isFamilyAdmin: boolean;
}

export interface FamilyDoc {
  id: string;
  name: string;
  adminId: string;
  members: Record<string, unknown>;
}

interface LatestEvent {
  platform?: 'ios' | 'android';
  locale?: 'he' | 'en';
  appVersion?: string;
  timestamp: number;
}

async function loadFamilies(): Promise<Map<string, FamilyDoc>> {
  const snap = await adminFirestore.collection('families').get();
  const map = new Map<string, FamilyDoc>();
  snap.docs.forEach((d) => {
    const data = d.data();
    map.set(d.id, {
      id: d.id,
      name: data.name ?? 'Family',
      adminId: data.adminId ?? '',
      members: data.members ?? {},
    });
  });
  return map;
}

async function loadItemCounts(): Promise<Record<ItemCollection, Map<string, number>>> {
  const result = {} as Record<ItemCollection, Map<string, number>>;
  await Promise.all(
    ITEM_COLLECTIONS.map(async (col) => {
      const snap = await adminFirestore.collection(col).get();
      const m = new Map<string, number>();
      snap.docs.forEach((d) => {
        const uid = d.data().userId;
        if (typeof uid !== 'string' || !uid) return;
        m.set(uid, (m.get(uid) ?? 0) + 1);
      });
      result[col] = m;
    }),
  );
  return result;
}

async function loadLatestEventPerUser(): Promise<Map<string, LatestEvent>> {
  // Pull recent events; for V1 (small scale) 1000 is plenty.
  const snap = await adminFirestore
    .collection('events')
    .orderBy('timestamp', 'desc')
    .limit(1000)
    .get();
  const map = new Map<string, LatestEvent>();
  snap.docs.forEach((d) => {
    const data = d.data();
    const uid = data.userId;
    if (typeof uid !== 'string' || !uid || map.has(uid)) return;
    const ts = data.timestamp?.toMillis?.() ?? 0;
    map.set(uid, {
      platform: data.platform,
      locale: data.locale,
      appVersion: data.appVersion,
      timestamp: ts,
    });
  });
  return map;
}

export async function loadUsers(): Promise<UserRow[]> {
  const [authResult, userDocsSnap, families, counts, latestEvents] = await Promise.all([
    adminAuth.listUsers(1000),
    adminFirestore.collection('users').get(),
    loadFamilies(),
    loadItemCounts(),
    loadLatestEventPerUser(),
  ]);

  const userDocs = new Map<string, Record<string, unknown>>();
  userDocsSnap.docs.forEach((d) => userDocs.set(d.id, d.data()));

  const rows: UserRow[] = authResult.users.map((u) => {
    const docData = userDocs.get(u.uid) ?? {};
    const familyId = typeof docData.familyId === 'string' ? docData.familyId : null;
    const family = familyId ? families.get(familyId) ?? null : null;
    const event = latestEvents.get(u.uid);

    const itemCounts = ITEM_COLLECTIONS.reduce<Record<ItemCollection, number>>(
      (acc, col) => {
        acc[col] = counts[col].get(u.uid) ?? 0;
        return acc;
      },
      { credits: 0, warranties: 0, subscriptions: 0, occasions: 0, documents: 0 },
    );

    const totalItems = ITEM_COLLECTIONS.reduce((sum, col) => sum + itemCounts[col], 0);

    return {
      uid: u.uid,
      email: u.email ?? null,
      displayName: u.displayName ?? (typeof docData.displayName === 'string' ? docData.displayName : null),
      photoURL: u.photoURL ?? null,
      createdAt: u.metadata.creationTime ? new Date(u.metadata.creationTime).getTime() : null,
      lastSignInAt: u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime).getTime() : null,
      locale: event?.locale ?? null,
      platform: event?.platform ?? null,
      appVersion: event?.appVersion ?? null,
      family: family
        ? { id: family.id, name: family.name, size: Object.keys(family.members).length }
        : null,
      counts: itemCounts,
      totalItems,
      isFamilyAdmin: family ? family.adminId === u.uid : false,
    };
  });

  // Newest signups first
  rows.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return rows;
}

export async function loadUserCount(): Promise<number> {
  const result = await adminAuth.listUsers(1000);
  return result.users.length;
}

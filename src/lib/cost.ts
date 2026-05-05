import 'server-only';
import { adminAuth, adminFirestore } from './firebaseAdmin';

const COLLECTION = 'admin_settings';
const COST_DOC_ID = 'firebase_cost';
const ACTIVE_USER_WINDOW_DAYS = 30;
const DEFAULT_CURRENCY = 'USD';

export type CostSource = 'manual' | 'bigquery';

export interface CostSnapshot {
  monthYear: string; // 'YYYY-MM'
  amount: number | null; // null = not set yet for the current month
  currency: string; // ISO 4217 (e.g. 'USD', 'ILS')
  costPerActiveUser: number | null;
  projectedAt10x: number | null;
  activeUsers: number;
  updatedAt: number | null;
  updatedBy: string | null;
  source: CostSource;
}

function currentMonthYear(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function getCostSnapshot(): Promise<CostSnapshot> {
  const monthYear = currentMonthYear();
  const [costDoc, activeUsers] = await Promise.all([
    adminFirestore.collection(COLLECTION).doc(COST_DOC_ID).get(),
    getActiveUserCount(),
  ]);

  const docData = costDoc.exists ? costDoc.data() : null;
  // Prefer the new `amount` field; fall back to legacy `amountUSD` so
  // older Firestore docs keep rendering until the next refresh writes
  // the new field.
  const rawAmount =
    typeof docData?.amount === 'number'
      ? docData.amount
      : typeof docData?.amountUSD === 'number'
        ? docData.amountUSD
        : null;
  const amount = docData?.monthYear === monthYear && rawAmount !== null ? rawAmount : null;
  const currency =
    typeof docData?.currency === 'string' && docData.currency.length > 0
      ? docData.currency
      : DEFAULT_CURRENCY;

  const cpu = amount !== null && activeUsers > 0 ? amount / activeUsers : null;
  const proj = amount !== null && activeUsers > 0 ? amount * 10 : null;

  const source: CostSource = docData?.source === 'bigquery' ? 'bigquery' : 'manual';

  return {
    monthYear,
    amount,
    currency,
    costPerActiveUser: cpu,
    projectedAt10x: proj,
    activeUsers,
    updatedAt:
      docData && docData.updatedAt && typeof docData.updatedAt.toMillis === 'function'
        ? docData.updatedAt.toMillis()
        : null,
    updatedBy: typeof docData?.updatedBy === 'string' ? docData.updatedBy : null,
    source,
  };
}

async function getActiveUserCount(): Promise<number> {
  // Active = last sign-in within ACTIVE_USER_WINDOW_DAYS.
  // Falls back to total user count if Auth metadata is missing.
  const result = await adminAuth.listUsers(1000);
  const cutoff = Date.now() - ACTIVE_USER_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  let active = 0;
  for (const u of result.users) {
    const ts = u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime).getTime() : 0;
    if (ts >= cutoff) active += 1;
  }
  return Math.max(active, 1);
}

export interface CostUpdateInput {
  amount: number;
  currency?: string;
  email: string;
}

export async function updateCost(input: CostUpdateInput): Promise<void> {
  await adminFirestore.collection(COLLECTION).doc(COST_DOC_ID).set(
    {
      monthYear: currentMonthYear(),
      amount: input.amount,
      currency: input.currency ?? DEFAULT_CURRENCY,
      updatedAt: new Date(),
      updatedBy: input.email,
      source: 'manual',
    },
    { merge: true },
  );
}

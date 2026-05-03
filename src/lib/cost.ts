import 'server-only';
import { adminAuth, adminFirestore } from './firebaseAdmin';

const COLLECTION = 'admin_settings';
const COST_DOC_ID = 'firebase_cost';
const ACTIVE_USER_WINDOW_DAYS = 30;

export type CostSource = 'manual' | 'bigquery';

export interface CostSnapshot {
  monthYear: string; // 'YYYY-MM'
  amountUSD: number | null; // null = not set yet for the current month
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
  const amountUSD =
    docData?.monthYear === monthYear && typeof docData?.amountUSD === 'number'
      ? (docData.amountUSD as number)
      : null;

  const cpu = amountUSD !== null && activeUsers > 0 ? amountUSD / activeUsers : null;
  const proj = amountUSD !== null && activeUsers > 0 ? amountUSD * 10 : null;

  const source: CostSource = docData?.source === 'bigquery' ? 'bigquery' : 'manual';

  return {
    monthYear,
    amountUSD,
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
  amountUSD: number;
  email: string;
}

export async function updateCost(input: CostUpdateInput): Promise<void> {
  await adminFirestore.collection(COLLECTION).doc(COST_DOC_ID).set(
    {
      monthYear: currentMonthYear(),
      amountUSD: input.amountUSD,
      updatedAt: new Date(),
      updatedBy: input.email,
      source: 'manual',
    },
    { merge: true },
  );
}

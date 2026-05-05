import 'server-only';
import { BigQuery } from '@google-cloud/bigquery';
import { adminAuth, adminFirestore } from './firebaseAdmin';

const PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID;
const DATASET = process.env.BILLING_EXPORT_DATASET ?? 'billing_export';
const TABLE_GLOB = `\`${PROJECT_ID}.${DATASET}.gcp_billing_export_v1_*\``;

let _client: BigQuery | null = null;
function getClient(): BigQuery {
  if (_client) return _client;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin env vars (reused for BigQuery auth)');
  }
  _client = new BigQuery({
    projectId,
    credentials: { client_email: clientEmail, private_key: privateKey },
  });
  return _client;
}

function isMissingTable(err: unknown): boolean {
  const e = err as { code?: number; message?: string };
  return e?.code === 404 || (e?.message ?? '').includes('Not found');
}

export interface MonthRow {
  month: string;        // 'YYYY-MM'
  invoiceMonth: string; // 'YYYYMM'
  amount: number;
  credits: number;      // negative number summed (free-tier savings)
  net: number;          // amount + credits (what was actually billed)
}

export interface SkuRow {
  service: string;
  sku: string;
  amount: number;
  credits: number;
  net: number;
  usageAmount: number | null;
  usageUnit: string | null;
  amountPrev?: number; // for delta calculations
  delta?: number;
  deltaPct?: number | null;
}

export interface DailyRow {
  date: string; // 'YYYY-MM-DD'
  amount: number;
  credits: number;
  net: number;
}

export interface CostAnalytics {
  currency: string;
  hasData: boolean;
  monthlyHistory: MonthRow[];      // ascending
  dailyCurrentMonth: DailyRow[];   // ascending
  skuBreakdownCurrent: SkuRow[];   // descending by amount, with deltas vs prev month
  monthlyActiveUsers: Record<string, number>; // 'YYYY-MM' -> count
  exportLagHours: number | null;   // hours since latest export_time
  refreshedAt: number;
}

const EMPTY_ANALYTICS: CostAnalytics = {
  currency: 'USD',
  hasData: false,
  monthlyHistory: [],
  dailyCurrentMonth: [],
  skuBreakdownCurrent: [],
  monthlyActiveUsers: {},
  exportLagHours: null,
  refreshedAt: Date.now(),
};

function monthKeyFromInvoice(invoiceMonth: string): string {
  return `${invoiceMonth.slice(0, 4)}-${invoiceMonth.slice(4, 6)}`;
}

function currentInvoiceMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function previousInvoiceMonth(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function getCostAnalytics(): Promise<CostAnalytics> {
  if (!PROJECT_ID) return EMPTY_ANALYTICS;
  const bq = getClient();

  let monthlyRows: Array<{
    invoice_month: string;
    amount: number | null;
    credits: number | null;
    currency: string | null;
  }>;

  try {
    const [rows] = await bq.query({
      query: `
        SELECT
          invoice.month AS invoice_month,
          ROUND(SUM(cost), 4) AS amount,
          ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 4) AS credits,
          ANY_VALUE(currency) AS currency
        FROM ${TABLE_GLOB}
        GROUP BY invoice_month
        ORDER BY invoice_month
      `,
    });
    monthlyRows = rows as typeof monthlyRows;
  } catch (err) {
    if (isMissingTable(err)) return EMPTY_ANALYTICS;
    throw err;
  }

  if (monthlyRows.length === 0) return EMPTY_ANALYTICS;

  const currency = monthlyRows.find((r) => r.currency)?.currency ?? 'USD';

  const monthlyHistory: MonthRow[] = monthlyRows.map((r) => {
    const amount = Number(r.amount ?? 0);
    const credits = Number(r.credits ?? 0);
    return {
      invoiceMonth: r.invoice_month,
      month: monthKeyFromInvoice(r.invoice_month),
      amount,
      credits,
      net: amount + credits,
    };
  });

  const currentInvoice = currentInvoiceMonth();
  const prevInvoice = previousInvoiceMonth();

  const [dailyResult, currentSkuResult, prevSkuResult, lagResult] = await Promise.all([
    bq.query({
      query: `
        SELECT
          DATE(usage_start_time) AS day,
          ROUND(SUM(cost), 4) AS amount,
          ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 4) AS credits
        FROM ${TABLE_GLOB}
        WHERE invoice.month = @invoiceMonth
        GROUP BY day
        ORDER BY day
      `,
      params: { invoiceMonth: currentInvoice },
      types: { invoiceMonth: 'STRING' },
    }),
    bq.query({
      query: `
        SELECT
          service.description AS service,
          sku.description AS sku,
          ROUND(SUM(cost), 4) AS amount,
          ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 4) AS credits,
          SUM(usage.amount_in_pricing_units) AS usage_amount,
          ANY_VALUE(usage.pricing_unit) AS usage_unit
        FROM ${TABLE_GLOB}
        WHERE invoice.month = @invoiceMonth
        GROUP BY service, sku
        HAVING amount > 0 OR credits != 0
        ORDER BY amount DESC
      `,
      params: { invoiceMonth: currentInvoice },
      types: { invoiceMonth: 'STRING' },
    }),
    bq.query({
      query: `
        SELECT
          service.description AS service,
          sku.description AS sku,
          ROUND(SUM(cost), 4) AS amount
        FROM ${TABLE_GLOB}
        WHERE invoice.month = @invoiceMonth
        GROUP BY service, sku
      `,
      params: { invoiceMonth: prevInvoice },
      types: { invoiceMonth: 'STRING' },
    }),
    bq.query({
      query: `SELECT MAX(export_time) AS latest FROM ${TABLE_GLOB}`,
    }),
  ]);

  const dailyRows = dailyResult[0] as Array<{
    day: { value: string } | string;
    amount: number | null;
    credits: number | null;
  }>;
  const dailyCurrentMonth: DailyRow[] = dailyRows.map((r) => {
    const amount = Number(r.amount ?? 0);
    const credits = Number(r.credits ?? 0);
    const date = typeof r.day === 'string' ? r.day : r.day.value;
    return { date, amount, credits, net: amount + credits };
  });

  const prevSkuRows = prevSkuResult[0] as Array<{
    service: string | null;
    sku: string | null;
    amount: number | null;
  }>;
  const prevByKey = new Map<string, number>();
  for (const r of prevSkuRows) {
    const k = `${r.service ?? ''}::${r.sku ?? ''}`;
    prevByKey.set(k, Number(r.amount ?? 0));
  }

  const currentSkuRows = currentSkuResult[0] as Array<{
    service: string | null;
    sku: string | null;
    amount: number | null;
    credits: number | null;
    usage_amount: number | null;
    usage_unit: string | null;
  }>;
  const skuBreakdownCurrent: SkuRow[] = currentSkuRows.map((r) => {
    const amount = Number(r.amount ?? 0);
    const credits = Number(r.credits ?? 0);
    const k = `${r.service ?? ''}::${r.sku ?? ''}`;
    const amountPrev = prevByKey.get(k) ?? 0;
    const delta = amount - amountPrev;
    const deltaPct = amountPrev > 0 ? (delta / amountPrev) * 100 : null;
    return {
      service: r.service ?? '—',
      sku: r.sku ?? '—',
      amount,
      credits,
      net: amount + credits,
      usageAmount: r.usage_amount === null ? null : Number(r.usage_amount),
      usageUnit: r.usage_unit ?? null,
      amountPrev,
      delta,
      deltaPct,
    };
  });

  const lagRows = lagResult[0] as Array<{ latest: { value: string } | string | null }>;
  const latestRaw = lagRows[0]?.latest;
  const latestExportMs =
    typeof latestRaw === 'string'
      ? new Date(latestRaw).getTime()
      : latestRaw && typeof latestRaw === 'object'
        ? new Date(latestRaw.value).getTime()
        : null;
  const exportLagHours =
    latestExportMs !== null ? (Date.now() - latestExportMs) / (60 * 60 * 1000) : null;

  const monthlyActiveUsers = await getMonthlyActiveUsers(monthlyHistory.map((m) => m.month));

  return {
    currency,
    hasData: true,
    monthlyHistory,
    dailyCurrentMonth,
    skuBreakdownCurrent,
    monthlyActiveUsers,
    exportLagHours,
    refreshedAt: Date.now(),
  };
}

/**
 * Distinct uids that produced any event in each month. Falls back to a one-call
 * Auth listUsers approach if Firestore is unreachable. Aggregated client-side
 * for simplicity since the project has tiny event volume.
 */
async function getMonthlyActiveUsers(months: string[]): Promise<Record<string, number>> {
  if (months.length === 0) return {};
  const earliest = months[0];
  const since = new Date(`${earliest}-01T00:00:00.000Z`);

  const result: Record<string, number> = {};
  for (const m of months) result[m] = 0;

  try {
    const snap = await adminFirestore
      .collection('events')
      .where('timestamp', '>=', since)
      .select('userId', 'timestamp')
      .get();

    const byMonth = new Map<string, Set<string>>();
    for (const doc of snap.docs) {
      const data = doc.data() as {
        userId?: string;
        timestamp?: { toMillis?: () => number };
      };
      const uid = data.userId;
      if (!uid || uid === 'anon') continue;
      const ms = data.timestamp?.toMillis?.() ?? 0;
      if (!ms) continue;
      const d = new Date(ms);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      let set = byMonth.get(key);
      if (!set) {
        set = new Set();
        byMonth.set(key, set);
      }
      set.add(uid);
    }
    for (const [m, set] of byMonth) result[m] = set.size;
    return result;
  } catch {
    // Best effort — fall back to current Auth count for current month only
    try {
      const r = await adminAuth.listUsers(1000);
      const currentMonth = new Date().toISOString().slice(0, 7);
      result[currentMonth] = r.users.length;
    } catch {
      /* ignore */
    }
    return result;
  }
}

export interface DerivedStats {
  mtd: number;            // current month-to-date amount (gross)
  mtdNet: number;         // mtd + credits (what was billed)
  mtdProjection: number;  // straight-line to month end
  runRate: number;        // last 30 days × (365/30)
  ytd: number;            // year-to-date total
  prevMonth: number | null;
  peakMonth: { month: string; amount: number } | null;
  avg6mo: number | null;
  topSku: SkuRow | null;
  topMover: SkuRow | null;
  freeTierSaved: number;  // |sum credits| current month
  trend: 'up' | 'down' | 'flat' | null;
  forecastNextMonth: number | null;
}

export function deriveStats(a: CostAnalytics): DerivedStats {
  if (!a.hasData) {
    return {
      mtd: 0, mtdNet: 0, mtdProjection: 0, runRate: 0, ytd: 0,
      prevMonth: null, peakMonth: null, avg6mo: null,
      topSku: null, topMover: null, freeTierSaved: 0,
      trend: null, forecastNextMonth: null,
    };
  }

  const now = new Date();
  const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const dayOfMonth = now.getUTCDate();
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();

  const current = a.monthlyHistory.find((m) => m.month === currentMonthKey);
  const mtd = current?.amount ?? 0;
  const mtdNet = current?.net ?? 0;
  const mtdProjection = dayOfMonth > 0 ? (mtd / dayOfMonth) * daysInMonth : mtd;

  const yearPrefix = String(now.getUTCFullYear());
  const ytd = a.monthlyHistory
    .filter((m) => m.month.startsWith(yearPrefix))
    .reduce((sum, m) => sum + m.amount, 0);

  // Run-rate: last 30 days from daily-current-month + scale up if early month
  const last30Sum = a.dailyCurrentMonth
    .filter((d) => {
      const dd = new Date(d.date);
      return Date.now() - dd.getTime() <= 30 * 24 * 60 * 60 * 1000;
    })
    .reduce((sum, d) => sum + d.amount, 0);
  const runRate = last30Sum * (365 / 30);

  const prevMonthRow = a.monthlyHistory[a.monthlyHistory.length - 2] ?? null;
  const prevMonth = prevMonthRow?.amount ?? null;

  const peakMonth = a.monthlyHistory.reduce<{ month: string; amount: number } | null>(
    (peak, m) => (peak === null || m.amount > peak.amount ? { month: m.month, amount: m.amount } : peak),
    null,
  );

  const last6 = a.monthlyHistory.slice(-6);
  const avg6mo = last6.length > 0 ? last6.reduce((s, m) => s + m.amount, 0) / last6.length : null;

  const topSku = a.skuBreakdownCurrent[0] ?? null;
  const topMover = [...a.skuBreakdownCurrent]
    .filter((s) => s.delta !== undefined && s.delta > 0)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0] ?? null;

  const freeTierSaved = Math.abs(current?.credits ?? 0);

  let trend: DerivedStats['trend'] = null;
  if (prevMonth !== null && current) {
    if (mtdProjection > prevMonth * 1.05) trend = 'up';
    else if (mtdProjection < prevMonth * 0.95) trend = 'down';
    else trend = 'flat';
  }

  // Forecast next month — naive: average of last 3 months (excluding current MTD partial)
  const completed = a.monthlyHistory.filter((m) => m.month !== currentMonthKey).slice(-3);
  const forecastNextMonth = completed.length > 0
    ? completed.reduce((s, m) => s + m.amount, 0) / completed.length
    : null;

  return {
    mtd, mtdNet, mtdProjection, runRate, ytd,
    prevMonth, peakMonth, avg6mo,
    topSku, topMover, freeTierSaved,
    trend, forecastNextMonth,
  };
}

export async function getDailyHistoryForSku(service: string, sku: string): Promise<DailyRow[]> {
  if (!PROJECT_ID) return [];
  const bq = getClient();
  try {
    const [rows] = await bq.query({
      query: `
        SELECT
          DATE(usage_start_time) AS day,
          ROUND(SUM(cost), 4) AS amount,
          ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 4) AS credits
        FROM ${TABLE_GLOB}
        WHERE service.description = @service AND sku.description = @sku
        GROUP BY day
        ORDER BY day
      `,
      params: { service, sku },
      types: { service: 'STRING', sku: 'STRING' },
    });
    const list = rows as Array<{ day: { value: string } | string; amount: number | null; credits: number | null }>;
    return list.map((r) => {
      const amount = Number(r.amount ?? 0);
      const credits = Number(r.credits ?? 0);
      const date = typeof r.day === 'string' ? r.day : r.day.value;
      return { date, amount, credits, net: amount + credits };
    });
  } catch (err) {
    if (isMissingTable(err)) return [];
    throw err;
  }
}

export async function getSkuBreakdownForMonth(invoiceMonth: string): Promise<SkuRow[]> {
  if (!PROJECT_ID) return [];
  const bq = getClient();
  try {
    const [rows] = await bq.query({
      query: `
        SELECT
          service.description AS service,
          sku.description AS sku,
          ROUND(SUM(cost), 4) AS amount,
          ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 4) AS credits,
          SUM(usage.amount_in_pricing_units) AS usage_amount,
          ANY_VALUE(usage.pricing_unit) AS usage_unit
        FROM ${TABLE_GLOB}
        WHERE invoice.month = @invoiceMonth
        GROUP BY service, sku
        HAVING amount > 0 OR credits != 0
        ORDER BY amount DESC
      `,
      params: { invoiceMonth },
      types: { invoiceMonth: 'STRING' },
    });
    const list = rows as Array<{
      service: string | null;
      sku: string | null;
      amount: number | null;
      credits: number | null;
      usage_amount: number | null;
      usage_unit: string | null;
    }>;
    return list.map((r) => {
      const amount = Number(r.amount ?? 0);
      const credits = Number(r.credits ?? 0);
      return {
        service: r.service ?? '—',
        sku: r.sku ?? '—',
        amount,
        credits,
        net: amount + credits,
        usageAmount: r.usage_amount === null ? null : Number(r.usage_amount),
        usageUnit: r.usage_unit ?? null,
      };
    });
  } catch (err) {
    if (isMissingTable(err)) return [];
    throw err;
  }
}

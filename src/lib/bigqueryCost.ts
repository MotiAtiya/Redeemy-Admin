import 'server-only';
import { BigQuery } from '@google-cloud/bigquery';

const PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID;
const DATASET = process.env.BILLING_EXPORT_DATASET ?? 'billing_export';

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

export interface BigQueryCostResult {
  amountUSD: number | null;
  monthYear: string;
  source: 'bigquery';
  hasData: boolean;
}

/**
 * Query the BigQuery billing export for the current month's spend.
 *
 * The billing export creates a wildcard set of tables named
 * `gcp_billing_export_v1_<billing_account_id>` (one per account). We use a
 * wildcard match so we don't need to hard-code the billing account id.
 *
 * `invoice.month` is a 6-char string in the form `YYYYMM` (e.g. "202605").
 * We sum all `cost` rows for the current month, gracefully returning null
 * when no data is found yet (export has 24–48h initial lag).
 */
export async function getMTDCostFromBigQuery(): Promise<BigQueryCostResult> {
  if (!PROJECT_ID) {
    throw new Error('FIREBASE_ADMIN_PROJECT_ID not set');
  }

  const now = new Date();
  const monthYear = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const invoiceMonth = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  const query = `
    SELECT
      ROUND(SUM(cost), 4) AS total_cost,
      ANY_VALUE(currency) AS currency
    FROM \`${PROJECT_ID}.${DATASET}.gcp_billing_export_v1_*\`
    WHERE invoice.month = @invoiceMonth
  `;

  let rows: Array<{ total_cost: number | null; currency: string | null }>;
  try {
    const [result] = await getClient().query({
      query,
      params: { invoiceMonth },
      types: { invoiceMonth: 'STRING' },
    });
    rows = result as typeof rows;
  } catch (err) {
    const code = (err as { code?: number; message?: string })?.code;
    const message = (err as { message?: string })?.message ?? '';
    // Common case: table doesn't exist yet (export hasn't started). Return
    // null so the caller can leave the existing manual value untouched.
    if (code === 404 || message.includes('Not found')) {
      return { amountUSD: null, monthYear, source: 'bigquery', hasData: false };
    }
    throw err;
  }

  const row = rows[0];
  if (!row || row.total_cost === null || row.total_cost === undefined) {
    return { amountUSD: null, monthYear, source: 'bigquery', hasData: false };
  }

  const currency = row.currency ?? 'USD';
  if (currency !== 'USD') {
    // For V1 we only support USD. Surface a clear error to the operator.
    throw new Error(`BigQuery billing currency is ${currency}, expected USD`);
  }

  return {
    amountUSD: Number(row.total_cost),
    monthYear,
    source: 'bigquery',
    hasData: true,
  };
}

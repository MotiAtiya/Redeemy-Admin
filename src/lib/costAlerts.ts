import 'server-only';
import { Resend } from 'resend';
import { adminFirestore } from './firebaseAdmin';
import { getCostAnalytics, deriveStats } from './costAnalytics';
import { formatCurrency } from './formatCurrency';

const COLLECTION = 'admin_settings';
const ALERTS_DOC = 'cost_alerts';

export interface CostAlertConfig {
  enabled: boolean;
  thresholdAmount: number | null;
  dailySpikeEnabled: boolean;
  lastNotifiedMonth: string | null;        // 'YYYY-MM' — last month we sent a threshold alert
  lastSpikeNotifiedDate: string | null;    // 'YYYY-MM-DD'
}

const DEFAULT_CONFIG: CostAlertConfig = {
  enabled: false,
  thresholdAmount: null,
  dailySpikeEnabled: false,
  lastNotifiedMonth: null,
  lastSpikeNotifiedDate: null,
};

export async function getCostAlertConfig(): Promise<CostAlertConfig> {
  try {
    const doc = await adminFirestore.collection(COLLECTION).doc(ALERTS_DOC).get();
    if (!doc.exists) return DEFAULT_CONFIG;
    const d = doc.data() as Partial<CostAlertConfig> | undefined;
    return {
      enabled: Boolean(d?.enabled),
      thresholdAmount:
        typeof d?.thresholdAmount === 'number' && d.thresholdAmount >= 0 ? d.thresholdAmount : null,
      dailySpikeEnabled: Boolean(d?.dailySpikeEnabled),
      lastNotifiedMonth: typeof d?.lastNotifiedMonth === 'string' ? d.lastNotifiedMonth : null,
      lastSpikeNotifiedDate:
        typeof d?.lastSpikeNotifiedDate === 'string' ? d.lastSpikeNotifiedDate : null,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function updateCostAlertConfig(
  patch: Partial<CostAlertConfig>,
): Promise<void> {
  await adminFirestore.collection(COLLECTION).doc(ALERTS_DOC).set(patch, { merge: true });
}

interface AlertRunResult {
  thresholdSent: boolean;
  spikeSent: boolean;
  reason: string;
}

export async function runCostAlertCheck(): Promise<AlertRunResult> {
  const config = await getCostAlertConfig();
  if (!config.enabled && !config.dailySpikeEnabled) {
    return { thresholdSent: false, spikeSent: false, reason: 'all_disabled' };
  }

  const analytics = await getCostAnalytics();
  if (!analytics.hasData) {
    return { thresholdSent: false, spikeSent: false, reason: 'no_data' };
  }

  const stats = deriveStats(analytics);
  const monthYear = new Date().toISOString().slice(0, 7);
  const today = new Date().toISOString().slice(0, 10);

  let thresholdSent = false;
  let spikeSent = false;

  if (
    config.enabled &&
    config.thresholdAmount !== null &&
    stats.mtd >= config.thresholdAmount &&
    config.lastNotifiedMonth !== monthYear
  ) {
    await sendThresholdEmail({
      currency: analytics.currency,
      mtd: stats.mtd,
      threshold: config.thresholdAmount,
      monthYear,
    });
    await updateCostAlertConfig({ lastNotifiedMonth: monthYear });
    thresholdSent = true;
  }

  if (config.dailySpikeEnabled && config.lastSpikeNotifiedDate !== today) {
    const spike = detectDailySpike(analytics.dailyCurrentMonth);
    if (spike) {
      await sendSpikeEmail({
        currency: analytics.currency,
        date: spike.date,
        amount: spike.amount,
        avg: spike.avg,
      });
      await updateCostAlertConfig({ lastSpikeNotifiedDate: today });
      spikeSent = true;
    }
  }

  return { thresholdSent, spikeSent, reason: 'ok' };
}

function detectDailySpike(daily: { date: string; amount: number }[]) {
  if (daily.length < 4) return null;
  const recent = daily.slice(-7);
  const last = recent[recent.length - 1];
  if (!last || last.amount <= 0) return null;
  const prior = recent.slice(0, -1);
  const avg = prior.reduce((s, r) => s + r.amount, 0) / Math.max(prior.length, 1);
  if (last.amount > avg * 3 && last.amount > 0.01) {
    return { date: last.date, amount: last.amount, avg };
  }
  return null;
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

async function sendThresholdEmail(params: {
  currency: string;
  mtd: number;
  threshold: number;
  monthYear: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return;
  const recipients = adminEmails();
  if (recipients.length === 0) return;

  const fmt = (n: number) => formatCurrency(n, params.currency, 'en');
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: recipients,
    subject: `Redeemy — Firebase cost threshold reached (${fmt(params.mtd)})`,
    html: `
      <div style="font-family:system-ui,sans-serif;font-size:14px;color:#1F2937;">
        <h2 style="font-size:18px;margin:0 0 8px;">Cost threshold reached</h2>
        <p>Your Firebase month-to-date cost has crossed the threshold you configured.</p>
        <ul>
          <li>Month: <strong>${params.monthYear}</strong></li>
          <li>MTD: <strong>${fmt(params.mtd)}</strong></li>
          <li>Threshold: <strong>${fmt(params.threshold)}</strong></li>
        </ul>
        <p><a href="${process.env.PUBLIC_BASE_URL ?? ''}/cost">Open cost dashboard →</a></p>
      </div>
    `,
    text: `Firebase MTD ${fmt(params.mtd)} reached threshold ${fmt(params.threshold)} for ${params.monthYear}.`,
  });
}

async function sendSpikeEmail(params: {
  currency: string;
  date: string;
  amount: number;
  avg: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return;
  const recipients = adminEmails();
  if (recipients.length === 0) return;

  const fmt = (n: number) => formatCurrency(n, params.currency, 'en');
  const multiplier = (params.amount / Math.max(params.avg, 0.0001)).toFixed(1);
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: recipients,
    subject: `Redeemy — Cost spike on ${params.date} (${multiplier}× avg)`,
    html: `
      <div style="font-family:system-ui,sans-serif;font-size:14px;color:#1F2937;">
        <h2 style="font-size:18px;margin:0 0 8px;">Cost spike detected</h2>
        <p>${params.date} cost was <strong>${multiplier}× higher</strong> than the recent daily average.</p>
        <ul>
          <li>Day cost: <strong>${fmt(params.amount)}</strong></li>
          <li>Recent average: <strong>${fmt(params.avg)}</strong></li>
        </ul>
        <p><a href="${process.env.PUBLIC_BASE_URL ?? ''}/cost">Open cost dashboard →</a></p>
      </div>
    `,
    text: `Cost spike on ${params.date}: ${fmt(params.amount)} vs avg ${fmt(params.avg)}.`,
  });
}

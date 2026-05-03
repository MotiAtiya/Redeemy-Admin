import type { Digest } from './digest';

const SAGE_PRIMARY = '#5F9E8F';
const SAGE_50 = '#F0FDFA';
const TEXT_PRIMARY = '#0F172A';
const TEXT_SECONDARY = '#757575';
const SEPARATOR = '#F5F5F5';
const URGENCY_RED = '#B91C1C';
const URGENCY_RED_SURFACE = '#FEE2E2';

const CATEGORY_LABELS_HE: Record<string, string> = {
  credit: 'זיכויים',
  warranty: 'אחריויות',
  subscription: 'מנויים',
  occasion: 'אירועים',
  document: 'מסמכים',
};

const CATEGORY_LABELS_EN: Record<string, string> = {
  credit: 'credits',
  warranty: 'warranties',
  subscription: 'subscriptions',
  occasion: 'occasions',
  document: 'documents',
};

interface TemplateOptions {
  digest: Digest;
  dashboardUrl: string;
}

export function renderDigestSubjectHe(d: Digest): string {
  return `[Redeemy] דוח יומי — ${d.dateLabelHe}`;
}

export function renderDigestSubjectEn(d: Digest): string {
  return `[Redeemy] Daily digest — ${d.dateLabelEn}`;
}

export function renderDigestText(d: Digest): string {
  const lines = [
    `Redeemy — Daily digest`,
    d.dateLabelEn,
    '',
    `New users: ${d.newUsers.length}`,
    `App opens: ${d.appOpenedCount}`,
    `Total users: ${d.totalUsers}`,
    '',
    'Items created:',
    ...Object.entries(d.itemsCreated).map(([cat, n]) => `  ${cat}: ${n}`),
    '',
    'Errors:',
    `  Firestore write failures: ${d.errors.firestoreWriteFailed}`,
    `  Image upload failures: ${d.errors.imageUploadFailed}`,
    '',
    `Cost MTD: ${d.costMTDUSD !== null ? `$${d.costMTDUSD.toFixed(2)}` : 'not set'}`,
  ];
  return lines.join('\n');
}

export function renderDigestHtmlHe({ digest: d, dashboardUrl }: TemplateOptions): string {
  const totalItems = Object.values(d.itemsCreated).reduce((a, b) => a + b, 0);
  const totalErrors = d.errors.firestoreWriteFailed + d.errors.imageUploadFailed;
  const heroLine =
    d.newUsers.length === 0 && totalItems === 0 && totalErrors === 0
      ? `יום שקט אתמול. ${d.totalUsers} משתמשים פעילים בסך הכל.`
      : `אתמול: ${pluralizeHe(d.newUsers.length, 'משתמש חדש', 'משתמשים חדשים')}, ${pluralizeHe(totalItems, 'פריט', 'פריטים')} נוצרו, ${pluralizeHe(totalErrors, 'שגיאה', 'שגיאות')}.`;

  return wrap('rtl', 'he', d.dateLabelHe, `
    <p style="font-size:16px;margin:0 0 18px;color:${TEXT_PRIMARY};line-height:1.5;">${escapeHtml(heroLine)}</p>

    ${d.newUsers.length > 0 ? `
    <div style="margin:0 0 16px;">
      <h2 style="font-size:14px;font-weight:600;color:${TEXT_PRIMARY};margin:0 0 8px;">משתמשים חדשים (${d.newUsers.length})</h2>
      <ul style="margin:0;padding:0 16px 0 0;color:${TEXT_PRIMARY};font-size:13px;line-height:1.7;">
        ${d.newUsers.map((u) => `<li>${escapeHtml(u.displayName ?? u.email ?? u.uid)}${u.email ? ` <span style="color:${TEXT_SECONDARY};">(${escapeHtml(u.email)})</span>` : ''}${u.locale ? ` <span style="color:${TEXT_SECONDARY};">${escapeHtml(u.locale)}</span>` : ''}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${totalItems > 0 ? `
    <div style="margin:0 0 16px;">
      <h2 style="font-size:14px;font-weight:600;color:${TEXT_PRIMARY};margin:0 0 8px;">פריטים נוצרו (${totalItems})</h2>
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;font-size:13px;color:${TEXT_PRIMARY};">
        ${Object.entries(d.itemsCreated)
          .filter(([, n]) => n > 0)
          .map(([cat, n]) => `
            <tr>
              <td style="padding:3px 0;color:${TEXT_SECONDARY};">${escapeHtml(CATEGORY_LABELS_HE[cat] ?? cat)}</td>
              <td style="padding:3px 0;text-align:left;font-weight:600;">${n}</td>
            </tr>`)
          .join('')}
      </table>
    </div>` : ''}

    ${totalErrors > 0 ? `
    <div style="margin:0 0 16px;background:${URGENCY_RED_SURFACE};border-radius:8px;padding:12px;">
      <h2 style="font-size:14px;font-weight:600;color:${URGENCY_RED};margin:0 0 6px;">⚠ שגיאות (${totalErrors})</h2>
      <p style="margin:0;color:${URGENCY_RED};font-size:13px;line-height:1.6;">
        ${d.errors.firestoreWriteFailed > 0 ? `כשלי כתיבה ל-Firestore: <strong>${d.errors.firestoreWriteFailed}</strong>${d.errors.imageUploadFailed > 0 ? '<br>' : ''}` : ''}
        ${d.errors.imageUploadFailed > 0 ? `כשלי העלאת תמונה: <strong>${d.errors.imageUploadFailed}</strong>` : ''}
      </p>
    </div>` : ''}

    <div style="margin:0 0 16px;padding:10px 0;border-top:1px solid ${SEPARATOR};">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;font-size:13px;">
        <tr>
          <td style="padding:3px 0;color:${TEXT_SECONDARY};">סה״כ משתמשים</td>
          <td style="padding:3px 0;text-align:left;font-weight:600;color:${TEXT_PRIMARY};">${d.totalUsers}</td>
        </tr>
        <tr>
          <td style="padding:3px 0;color:${TEXT_SECONDARY};">פתיחות אפליקציה אתמול</td>
          <td style="padding:3px 0;text-align:left;font-weight:600;color:${TEXT_PRIMARY};">${d.appOpenedCount}</td>
        </tr>
        <tr>
          <td style="padding:3px 0;color:${TEXT_SECONDARY};">עלות החודש (MTD)</td>
          <td style="padding:3px 0;text-align:left;font-weight:600;color:${TEXT_PRIMARY};">${d.costMTDUSD !== null ? `$${d.costMTDUSD.toFixed(2)}` : '—'}</td>
        </tr>
      </table>
    </div>
  `, dashboardUrl, 'צפייה בדשבורד', 'דוח אוטומטי של Redeemy Admin');
}

export function renderDigestHtmlEn({ digest: d, dashboardUrl }: TemplateOptions): string {
  const totalItems = Object.values(d.itemsCreated).reduce((a, b) => a + b, 0);
  const totalErrors = d.errors.firestoreWriteFailed + d.errors.imageUploadFailed;
  const heroLine =
    d.newUsers.length === 0 && totalItems === 0 && totalErrors === 0
      ? `Quiet day yesterday. ${d.totalUsers} total users.`
      : `Yesterday: ${d.newUsers.length} new ${d.newUsers.length === 1 ? 'user' : 'users'}, ${totalItems} ${totalItems === 1 ? 'item' : 'items'} created, ${totalErrors} ${totalErrors === 1 ? 'error' : 'errors'}.`;

  return wrap('ltr', 'en', d.dateLabelEn, `
    <p style="font-size:16px;margin:0 0 18px;color:${TEXT_PRIMARY};line-height:1.5;">${escapeHtml(heroLine)}</p>

    ${d.newUsers.length > 0 ? `
    <div style="margin:0 0 16px;">
      <h2 style="font-size:14px;font-weight:600;color:${TEXT_PRIMARY};margin:0 0 8px;">New users (${d.newUsers.length})</h2>
      <ul style="margin:0;padding:0 0 0 16px;color:${TEXT_PRIMARY};font-size:13px;line-height:1.7;">
        ${d.newUsers.map((u) => `<li>${escapeHtml(u.displayName ?? u.email ?? u.uid)}${u.email ? ` <span style="color:${TEXT_SECONDARY};">(${escapeHtml(u.email)})</span>` : ''}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${totalItems > 0 ? `
    <div style="margin:0 0 16px;">
      <h2 style="font-size:14px;font-weight:600;color:${TEXT_PRIMARY};margin:0 0 8px;">Items created (${totalItems})</h2>
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;font-size:13px;color:${TEXT_PRIMARY};">
        ${Object.entries(d.itemsCreated)
          .filter(([, n]) => n > 0)
          .map(([cat, n]) => `
            <tr>
              <td style="padding:3px 0;color:${TEXT_SECONDARY};">${escapeHtml(CATEGORY_LABELS_EN[cat] ?? cat)}</td>
              <td style="padding:3px 0;text-align:right;font-weight:600;">${n}</td>
            </tr>`)
          .join('')}
      </table>
    </div>` : ''}

    ${totalErrors > 0 ? `
    <div style="margin:0 0 16px;background:${URGENCY_RED_SURFACE};border-radius:8px;padding:12px;">
      <h2 style="font-size:14px;font-weight:600;color:${URGENCY_RED};margin:0 0 6px;">⚠ Errors (${totalErrors})</h2>
      <p style="margin:0;color:${URGENCY_RED};font-size:13px;line-height:1.6;">
        ${d.errors.firestoreWriteFailed > 0 ? `Firestore write failures: <strong>${d.errors.firestoreWriteFailed}</strong>${d.errors.imageUploadFailed > 0 ? '<br>' : ''}` : ''}
        ${d.errors.imageUploadFailed > 0 ? `Image upload failures: <strong>${d.errors.imageUploadFailed}</strong>` : ''}
      </p>
    </div>` : ''}

    <div style="margin:0 0 16px;padding:10px 0;border-top:1px solid ${SEPARATOR};">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;font-size:13px;">
        <tr>
          <td style="padding:3px 0;color:${TEXT_SECONDARY};">Total users</td>
          <td style="padding:3px 0;text-align:right;font-weight:600;color:${TEXT_PRIMARY};">${d.totalUsers}</td>
        </tr>
        <tr>
          <td style="padding:3px 0;color:${TEXT_SECONDARY};">App opens yesterday</td>
          <td style="padding:3px 0;text-align:right;font-weight:600;color:${TEXT_PRIMARY};">${d.appOpenedCount}</td>
        </tr>
        <tr>
          <td style="padding:3px 0;color:${TEXT_SECONDARY};">Cost MTD</td>
          <td style="padding:3px 0;text-align:right;font-weight:600;color:${TEXT_PRIMARY};">${d.costMTDUSD !== null ? `$${d.costMTDUSD.toFixed(2)}` : '—'}</td>
        </tr>
      </table>
    </div>
  `, dashboardUrl, 'View dashboard', 'Automated digest from Redeemy Admin');
}

function wrap(dir: 'rtl' | 'ltr', lang: string, dateLabel: string, body: string, dashboardUrl: string, viewLabel: string, footerLabel: string): string {
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Redeemy Admin Daily Digest</title>
</head>
<body style="margin:0;padding:0;background:${SAGE_50};font-family:Tahoma,Arial,sans-serif;color:${TEXT_PRIMARY};">
  <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="width:100%;background:${SAGE_50};padding:24px 12px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:${SAGE_PRIMARY};color:#ffffff;padding:20px 24px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Redeemy Admin</h1>
              <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">${escapeHtml(dateLabel)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              ${body}
              <div style="margin:18px 0 0;text-align:center;">
                <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:${SAGE_PRIMARY};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 20px;border-radius:8px;">${escapeHtml(viewLabel)}</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 24px 18px;border-top:1px solid ${SEPARATOR};color:${TEXT_SECONDARY};font-size:11px;text-align:center;">
              ${escapeHtml(footerLabel)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function pluralizeHe(n: number, singular: string, plural: string): string {
  if (n === 0) return `0 ${plural}`;
  if (n === 1) return `${singular} אחד`;
  if (n === 2) return `2 ${plural}`;
  return `${n} ${plural}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

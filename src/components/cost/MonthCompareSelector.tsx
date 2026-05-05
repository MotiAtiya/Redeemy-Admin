'use client';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import type { MonthRow, SkuRow } from '@/lib/costAnalytics';
import { formatCurrency } from '@/lib/formatCurrency';

interface Props {
  months: MonthRow[];
  currency: string;
  locale: string;
}

export default function MonthCompareSelector({ months, currency, locale }: Props) {
  const t = useTranslations('costDetail.compare');

  const sortedMonths = useMemo(() => [...months].sort((a, b) => b.month.localeCompare(a.month)), [months]);

  const [a, setA] = useState<string>(sortedMonths[1]?.month ?? sortedMonths[0]?.month ?? '');
  const [b, setB] = useState<string>(sortedMonths[0]?.month ?? '');

  const [aRows, setARows] = useState<SkuRow[] | null>(null);
  const [bRows, setBRows] = useState<SkuRow[] | null>(null);

  useEffect(() => {
    if (!a) return;
    setARows(null);
    fetch(`/api/admin/cost/month?invoiceMonth=${a.replace('-', '')}`)
      .then((r) => (r.ok ? r.json() : { skus: [] }))
      .then((j) => setARows(j.skus ?? []))
      .catch(() => setARows([]));
  }, [a]);

  useEffect(() => {
    if (!b) return;
    setBRows(null);
    fetch(`/api/admin/cost/month?invoiceMonth=${b.replace('-', '')}`)
      .then((r) => (r.ok ? r.json() : { skus: [] }))
      .then((j) => setBRows(j.skus ?? []))
      .catch(() => setBRows([]));
  }, [b]);

  const merged = useMemo(() => {
    if (!aRows || !bRows) return [];
    const map = new Map<string, { service: string; sku: string; aAmt: number; bAmt: number }>();
    for (const r of aRows) {
      const key = `${r.service}::${r.sku}`;
      map.set(key, { service: r.service, sku: r.sku, aAmt: r.amount, bAmt: 0 });
    }
    for (const r of bRows) {
      const key = `${r.service}::${r.sku}`;
      const existing = map.get(key);
      if (existing) existing.bAmt = r.amount;
      else map.set(key, { service: r.service, sku: r.sku, aAmt: 0, bAmt: r.amount });
    }
    return [...map.values()].sort((x, y) => y.bAmt + y.aAmt - (x.bAmt + x.aAmt)).slice(0, 8);
  }, [aRows, bRows]);

  if (sortedMonths.length < 2) return null;

  const aTotal = months.find((m) => m.month === a)?.amount ?? 0;
  const bTotal = months.find((m) => m.month === b)?.amount ?? 0;

  return (
    <section className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-5">
      <h2 className="font-semibold text-base mb-3">{t('title')}</h2>
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Selector value={a} onChange={setA} options={sortedMonths.map((m) => m.month)} />
        <ArrowRight size={14} className="text-text-tertiary shrink-0" aria-hidden />
        <Selector value={b} onChange={setB} options={sortedMonths.map((m) => m.month)} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <Total label={a} amount={aTotal} currency={currency} locale={locale} />
        <Total label={b} amount={bTotal} currency={currency} locale={locale} />
      </div>
      {merged.length === 0 ? (
        <p className="text-xs text-text-secondary">{t('loading')}</p>
      ) : (
        <table className="w-full text-xs">
          <thead className="text-text-secondary">
            <tr>
              <th className="text-start font-medium py-1">{t('sku')}</th>
              <th className="text-end font-medium py-1">{a}</th>
              <th className="text-end font-medium py-1">{b}</th>
              <th className="text-end font-medium py-1">{t('diff')}</th>
            </tr>
          </thead>
          <tbody>
            {merged.map((r) => {
              const diff = r.bAmt - r.aAmt;
              const color = diff > 0 ? 'text-urgency-red' : diff < 0 ? 'text-primary' : 'text-text-tertiary';
              return (
                <tr key={`${r.service}-${r.sku}`} className="border-t border-separator">
                  <td className="py-1 truncate max-w-[200px]">{r.sku}</td>
                  <td className="py-1 text-end tabular-nums">
                    {formatCurrency(r.aAmt, currency, locale)}
                  </td>
                  <td className="py-1 text-end tabular-nums">
                    {formatCurrency(r.bAmt, currency, locale)}
                  </td>
                  <td className={`py-1 text-end tabular-nums ${color}`}>
                    {diff > 0 ? '+' : ''}
                    {formatCurrency(diff, currency, locale)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Selector({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 rounded-md border border-separator bg-surface text-sm"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Total({
  label,
  amount,
  currency,
  locale,
}: {
  label: string;
  amount: number;
  currency: string;
  locale: string;
}) {
  return (
    <div className="rounded-md border border-separator p-2">
      <p className="text-[11px] text-text-secondary">{label}</p>
      <p className="font-semibold tabular-nums">{formatCurrency(amount, currency, locale)}</p>
    </div>
  );
}

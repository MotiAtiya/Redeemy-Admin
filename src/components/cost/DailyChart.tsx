'use client';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslations } from 'next-intl';
import type { DailyRow } from '@/lib/costAnalytics';
import { formatCurrency } from '@/lib/formatCurrency';

interface Props {
  data: DailyRow[];
  currency: string;
  locale: string;
}

export default function DailyChart({ data, currency, locale }: Props) {
  const t = useTranslations('costDetail.chart');

  if (data.length === 0) {
    return <p className="text-sm text-text-secondary py-8 text-center">{t('empty')}</p>;
  }

  const rows = data.map((d) => ({
    day: d.date.slice(8, 10),
    cost: Number(d.amount.toFixed(4)),
  }));

  // Spike detection: any day > 3× the rolling average
  const avg = rows.reduce((s, r) => s + r.cost, 0) / Math.max(rows.length, 1);
  const spikes = new Set(rows.filter((r) => r.cost > avg * 3 && r.cost > 0).map((r) => r.day));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          tickFormatter={(v: number) => formatCurrency(v, currency, locale)}
          width={70}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload || payload.length === 0) return null;
            const v = (payload[0]?.value ?? 0) as number;
            const isSpike = spikes.has(String(label));
            return (
              <div className="rounded-lg bg-surface shadow-wallet p-2 text-xs border border-separator">
                <p className="font-semibold">{t('day', { day: String(label ?? '') })}</p>
                <p className="text-primary tabular-nums">{formatCurrency(v, currency, locale)}</p>
                {isSpike && <p className="text-urgency-red text-[10px] mt-1">⚠ {t('spike')}</p>}
              </div>
            );
          }}
        />
        <Bar dataKey="cost" fill="var(--primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

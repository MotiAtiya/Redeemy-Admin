'use client';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslations } from 'next-intl';
import type { MonthRow } from '@/lib/costAnalytics';
import { formatCurrency } from '@/lib/formatCurrency';

interface Props {
  data: MonthRow[];
  activeUsersByMonth: Record<string, number>;
  currency: string;
  locale: string;
}

export default function CostPerUserChart({ data, activeUsersByMonth, currency, locale }: Props) {
  const t = useTranslations('costDetail.chart');

  if (data.length === 0) {
    return <p className="text-sm text-text-secondary py-8 text-center">{t('empty')}</p>;
  }

  const rows = data.map((m) => {
    const users = activeUsersByMonth[m.month] ?? 0;
    const perUser = users > 0 ? m.amount / users : 0;
    return {
      month: m.month,
      perUser: Number(perUser.toFixed(4)),
    };
  });

  const totalPerUser = rows.reduce((s, r) => s + r.perUser, 0);
  if (totalPerUser === 0) {
    return <p className="text-sm text-text-secondary py-8 text-center">{t('noCostYet')}</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          tickFormatter={(v: number) => formatCurrency(v, currency, locale)}
          width={70}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload || payload.length === 0) return null;
            const v = (payload[0]?.value ?? 0) as number;
            return (
              <div className="rounded-lg bg-surface shadow-wallet p-2 text-xs border border-separator">
                <p className="font-semibold mb-0.5">{label}</p>
                <p className="text-primary tabular-nums">{formatCurrency(v, currency, locale)}</p>
              </div>
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="perUser"
          name={t('perUser')}
          stroke="var(--primary)"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

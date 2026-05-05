'use client';
import { useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslations } from 'next-intl';
import type { MonthRow } from '@/lib/costAnalytics';
import { formatCurrency } from '@/lib/formatCurrency';
import MonthDrillPopover from './MonthDrillPopover';

interface Props {
  data: MonthRow[];
  activeUsersByMonth: Record<string, number>;
  currency: string;
  locale: string;
}

export default function MonthlyChart({ data, activeUsersByMonth, currency, locale }: Props) {
  const t = useTranslations('costDetail.chart');
  const [drillMonth, setDrillMonth] = useState<string | null>(null);

  if (data.length === 0) {
    return <p className="text-sm text-text-secondary py-8 text-center">{t('empty')}</p>;
  }

  const rows = data.map((m) => ({
    month: m.month,
    cost: Number(m.amount.toFixed(2)),
    users: activeUsersByMonth[m.month] ?? 0,
  }));

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={rows}
          margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
          onClick={(e) => {
            const label = (e as { activeLabel?: string })?.activeLabel;
            if (label) setDrillMonth(label);
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            tickFormatter={(v: number) => formatCurrency(v, currency, locale)}
            width={70}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            allowDecimals={false}
            width={32}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const cost = (payload.find((p) => p.dataKey === 'cost')?.value ?? 0) as number;
              const users = (payload.find((p) => p.dataKey === 'users')?.value ?? 0) as number;
              return (
                <div className="rounded-lg bg-surface shadow-wallet p-3 text-xs border border-separator">
                  <p className="font-semibold mb-1">{label}</p>
                  <p className="text-primary tabular-nums">
                    {t('cost')}: {formatCurrency(cost, currency, locale)}
                  </p>
                  <p className="text-text-secondary tabular-nums">
                    {t('activeUsers')}: {users}
                  </p>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="left"
            dataKey="cost"
            name={t('cost')}
            fill="var(--primary)"
            radius={[6, 6, 0, 0]}
            cursor="pointer"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="users"
            name={t('activeUsers')}
            stroke="var(--text-tertiary)"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {drillMonth && (
        <MonthDrillPopover
          month={drillMonth}
          currency={currency}
          locale={locale}
          onClose={() => setDrillMonth(null)}
        />
      )}
    </>
  );
}

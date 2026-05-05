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

const USERS_COLOR = '#F59E0B'; // amber — clearly distinct from the teal cost color

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

  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const hasCost = totalCost > 0;

  return (
    <>
      {!hasCost && (
        <p className="text-xs text-text-secondary mb-3">{t('noCostYet')}</p>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart
          data={rows}
          margin={{ top: 16, right: 32, left: 4, bottom: 8 }}
          onClick={(e) => {
            const label = (e as { activeLabel?: string })?.activeLabel;
            if (label) setDrillMonth(label);
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
          {hasCost && (
            <YAxis
              yAxisId="cost"
              tick={{ fontSize: 11, fill: 'var(--primary)' }}
              tickFormatter={(v: number) => formatCurrency(v, currency, locale)}
              width={80}
              label={{
                value: t('costAxis'),
                angle: -90,
                position: 'insideLeft',
                style: { fill: 'var(--primary)', fontSize: 11, textAnchor: 'middle' },
              }}
            />
          )}
          <YAxis
            yAxisId="users"
            orientation={hasCost ? 'right' : 'left'}
            tick={{ fontSize: 11, fill: USERS_COLOR }}
            allowDecimals={false}
            width={50}
            label={{
              value: t('usersAxis'),
              angle: hasCost ? 90 : -90,
              position: hasCost ? 'insideRight' : 'insideLeft',
              style: { fill: USERS_COLOR, fontSize: 11, textAnchor: 'middle' },
            }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const cost = (payload.find((p) => p.dataKey === 'cost')?.value ?? 0) as number;
              const users = (payload.find((p) => p.dataKey === 'users')?.value ?? 0) as number;
              return (
                <div className="rounded-lg bg-surface shadow-wallet p-3 text-xs border border-separator">
                  <p className="font-semibold mb-1">{label}</p>
                  {hasCost && (
                    <p className="text-primary tabular-nums">
                      {t('cost')}: {formatCurrency(cost, currency, locale)}
                    </p>
                  )}
                  <p className="tabular-nums" style={{ color: USERS_COLOR }}>
                    {t('activeUsers')}: {users}
                  </p>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {hasCost && (
            <Bar
              yAxisId="cost"
              dataKey="cost"
              name={t('cost')}
              fill="var(--primary)"
              radius={[6, 6, 0, 0]}
              cursor="pointer"
            />
          )}
          <Line
            yAxisId="users"
            type="monotone"
            dataKey="users"
            name={t('activeUsers')}
            stroke={USERS_COLOR}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 4, fill: USERS_COLOR }}
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

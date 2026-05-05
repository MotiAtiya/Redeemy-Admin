'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SkuRow, DailyRow } from '@/lib/costAnalytics';
import { formatCurrency } from '@/lib/formatCurrency';

interface Props {
  skus: SkuRow[];
  currency: string;
  locale: string;
}

export default function SkuBreakdownTable({ skus, currency, locale }: Props) {
  const t = useTranslations('costDetail.skus');

  if (skus.length === 0) {
    return <p className="text-sm text-text-secondary py-4">{t('empty')}</p>;
  }

  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-text-secondary text-xs">
            <th className="text-start font-medium px-2 py-2">{t('service')}</th>
            <th className="text-start font-medium px-2 py-2">{t('sku')}</th>
            <th className="text-end font-medium px-2 py-2 hidden sm:table-cell">{t('usage')}</th>
            <th className="text-end font-medium px-2 py-2">{t('cost')}</th>
            <th className="text-end font-medium px-2 py-2">{t('delta')}</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {skus.map((s) => (
            <SkuRowItem key={`${s.service}-${s.sku}`} sku={s} currency={currency} locale={locale} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkuRowItem({ sku, currency, locale }: { sku: SkuRow; currency: string; locale: string }) {
  const t = useTranslations('costDetail.skus');
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<DailyRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!expanded && history === null) {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/cost/sku-history?service=${encodeURIComponent(sku.service)}&sku=${encodeURIComponent(sku.sku)}`,
        );
        if (res.ok) {
          const json = await res.json();
          setHistory(json.history ?? []);
        } else {
          setHistory([]);
        }
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    }
    setExpanded((v) => !v);
  }

  const isUp = (sku.delta ?? 0) > 0.0001;
  const isDown = (sku.delta ?? 0) < -0.0001;
  const deltaColor = isUp ? 'text-urgency-red' : isDown ? 'text-primary' : 'text-text-tertiary';
  const Caret = expanded ? ChevronUp : ChevronDown;
  const Arrow = isUp ? ArrowUp : isDown ? ArrowDown : null;

  return (
    <>
      <tr
        className="border-t border-separator cursor-pointer hover:bg-separator/30"
        onClick={toggle}
      >
        <td className="px-2 py-2 text-text-secondary text-xs truncate max-w-[140px]">{sku.service}</td>
        <td className="px-2 py-2 font-medium truncate max-w-[260px]">{sku.sku}</td>
        <td className="px-2 py-2 text-end text-xs text-text-secondary tabular-nums hidden sm:table-cell">
          {sku.usageAmount !== null
            ? `${formatNumberCompact(sku.usageAmount, locale)} ${sku.usageUnit ?? ''}`
            : '—'}
        </td>
        <td className="px-2 py-2 text-end font-semibold tabular-nums">
          {formatCurrency(sku.amount, currency, locale)}
        </td>
        <td className={`px-2 py-2 text-end tabular-nums text-xs ${deltaColor}`}>
          {sku.delta !== undefined && Math.abs(sku.delta) > 0.0001 ? (
            <span className="inline-flex items-center gap-0.5">
              {Arrow && <Arrow size={10} aria-hidden />}
              {formatCurrency(Math.abs(sku.delta), currency, locale)}
            </span>
          ) : (
            <span>—</span>
          )}
        </td>
        <td className="px-2 py-2 text-end">
          <Caret size={14} className="text-text-tertiary inline" aria-hidden />
        </td>
      </tr>
      {expanded && (
        <tr className="bg-separator/20">
          <td colSpan={6} className="px-4 py-3">
            {loading ? (
              <p className="text-xs text-text-secondary">{t('loadingHistory')}</p>
            ) : history && history.length > 0 ? (
              <SparkRow history={history} currency={currency} locale={locale} />
            ) : (
              <p className="text-xs text-text-secondary">{t('noHistory')}</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function SparkRow({
  history,
  currency,
  locale,
}: {
  history: DailyRow[];
  currency: string;
  locale: string;
}) {
  const t = useTranslations('costDetail.skus');
  const max = Math.max(...history.map((h) => h.amount), 0.0001);
  return (
    <div>
      <p className="text-xs text-text-secondary mb-2">{t('historyHeader', { count: history.length })}</p>
      <div className="flex items-end gap-px h-12">
        {history.map((h) => {
          const heightPct = (h.amount / max) * 100;
          return (
            <div
              key={h.date}
              className="flex-1 bg-primary/70 rounded-sm min-w-[2px]"
              style={{ height: `${Math.max(heightPct, 2)}%` }}
              title={`${h.date}: ${formatCurrency(h.amount, currency, locale)}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-text-tertiary mt-1 tabular-nums">
        <span>{history[0]?.date}</span>
        <span>{history[history.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function formatNumberCompact(n: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  } catch {
    return n.toFixed(0);
  }
}

'use client';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ItemSummary } from '@/lib/userDetail';

const INITIAL_VISIBLE = 5;

interface Props {
  items: ItemSummary[];
  locale: string;
}

/**
 * Renders the recent-items list inside a CategoryCard. Initially shows only
 * the first INITIAL_VISIBLE rows; if the list is longer, a single "show all"
 * toggle expands it inline. (Story: User Detail items overflow polish)
 */
export default function CategoryItemsList({ items, locale }: Props) {
  const t = useTranslations('userDetail');
  const [expanded, setExpanded] = useState(false);

  const overflow = items.length - INITIAL_VISIBLE;
  const visible = expanded || overflow <= 0 ? items : items.slice(0, INITIAL_VISIBLE);

  return (
    <>
      <ul className="space-y-1.5 text-xs">
        {visible.map((item) => (
          <ItemRow key={item.id} item={item} locale={locale} t={t} />
        ))}
      </ul>
      {overflow > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          aria-expanded={expanded}
        >
          <ChevronDown
            size={12}
            aria-hidden
            className={`transition ${expanded ? 'rotate-180' : ''}`}
          />
          {expanded ? t('showLess') : t('showAll', { count: overflow })}
        </button>
      )}
    </>
  );
}

function ItemRow({
  item,
  locale,
  t,
}: {
  item: ItemSummary;
  locale: string;
  t: ReturnType<typeof useTranslations<'userDetail'>>;
}) {
  const isInactive = item.status && item.status !== 'active';
  const prefix = item.typeKey
    ? t(item.typeKey as Parameters<typeof t>[0]) + (item.title ? ' · ' : '')
    : '';
  const display = `${prefix}${item.title}`;
  return (
    <li className="flex items-baseline gap-2 min-w-0">
      <span
        className={`flex-1 truncate ${isInactive ? 'text-text-tertiary line-through' : ''}`}
        title={display}
      >
        {display}
      </span>
      <span className="text-text-tertiary text-[10px] shrink-0" title={t('createdAt')}>
        {item.createdAt ? relativeTime(item.createdAt, locale) : '—'}
      </span>
    </li>
  );
}

function relativeTime(ms: number, locale: string): string {
  if (!ms) return '—';
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (sec < 60) return rtf.format(-sec, 'second');
  if (min < 60) return rtf.format(-min, 'minute');
  if (hr < 24) return rtf.format(-hr, 'hour');
  if (day < 30) return rtf.format(-day, 'day');
  const month = Math.floor(day / 30);
  if (month < 12) return rtf.format(-month, 'month');
  return rtf.format(-Math.floor(month / 12), 'year');
}

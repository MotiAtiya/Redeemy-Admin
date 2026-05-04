'use client';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  LogIn,
  LogOut,
  UserPlus,
  Plus,
  Pencil,
  Trash2,
  Users,
  Smartphone,
  CreditCard,
  ShieldCheck,
  Repeat,
  Cake,
  FileText,
  ShoppingBag,
  Undo2,
  Ban,
  Archive,
  Hourglass,
  AlertTriangle,
  ImageOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppEvent, EventType, ItemCategory } from '@/lib/events';
import ActivityFilters, { TYPE_GROUPS, RANGE_PRESETS, type TypeGroup, type RangePreset } from './ActivityFilters';

const EVENT_ICON: Record<EventType, LucideIcon> = {
  sign_in: LogIn,
  sign_up: UserPlus,
  sign_out: LogOut,
  item_created: Plus,
  item_updated: Pencil,
  item_deleted: Trash2,
  credit_redeemed: ShoppingBag,
  credit_unredeemed: Undo2,
  credit_expired: Hourglass,
  subscription_cancelled: Ban,
  subscription_renewed: Repeat,
  subscription_expired: Hourglass,
  warranty_closed: Archive,
  warranty_expired: Hourglass,
  family_created: Users,
  family_joined: Users,
  family_left: Users,
  firestore_write_failed: AlertTriangle,
  image_upload_failed: ImageOff,
  app_opened: Smartphone,
};

const CATEGORY_ICON: Record<ItemCategory, LucideIcon> = {
  credit: CreditCard,
  warranty: ShieldCheck,
  subscription: Repeat,
  occasion: Cake,
  document: FileText,
};

interface Props {
  events: AppEvent[];
}

export default function ActivityList({ events }: Props) {
  const t = useTranslations('activity');
  const locale = useLocale();
  const params = useSearchParams();

  const query = params.get('q')?.toLowerCase() ?? '';
  const typeGroup = (params.get('type') ?? 'all') as TypeGroup;
  const range = (params.get('range') ?? 'all') as RangePreset;

  const typeFilter = useMemo(() => TYPE_GROUPS[typeGroup] ?? null, [typeGroup]);
  const rangeBounds = useMemo(() => computeRangeBounds(range), [range]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (query) {
        const haystack = `${e.userName ?? ''} ${e.userId}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (typeFilter && !typeFilter.includes(e.type)) return false;
      if (rangeBounds && (e.timestamp < rangeBounds.start || e.timestamp > rangeBounds.end)) return false;
      return true;
    });
  }, [events, query, typeFilter, rangeBounds]);

  const hasFilters = query !== '' || typeGroup !== 'all' || range !== 'all';

  return (
    <div className="space-y-4">
      <header className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-3xl font-bold">{t('title')}</h2>
          <p className="text-text-secondary text-sm mt-1">
            {hasFilters
              ? t('subtitleFiltered', { filtered: filtered.length, total: events.length })
              : t('subtitle', { count: events.length })}
          </p>
        </div>
      </header>

      <ActivityFilters />

      {events.length === 0 ? (
        <EmptyState>
          <p className="text-text-secondary">{t('empty.title')}</p>
          <p className="text-text-tertiary text-sm mt-1">{t('empty.hint')}</p>
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState>
          <p className="text-text-secondary">{t('empty.filtered')}</p>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {filtered.map((e) => (
            <EventRow key={e.id} event={e} locale={locale} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-10 text-center">
      {children}
    </div>
  );
}

function EventRow({ event, locale }: { event: AppEvent; locale: string }) {
  const t = useTranslations('activity');
  const Icon = EVENT_ICON[event.type] ?? Smartphone;
  const CategoryIcon = event.itemCategory ? CATEGORY_ICON[event.itemCategory] : null;
  const description = describeEvent(event, t);

  return (
    <li className="rounded-[var(--radius-card)] bg-surface shadow-wallet px-4 py-3 flex items-center gap-3">
      <div className="rounded-lg bg-primary-surface text-primary p-2 shrink-0">
        <Icon size={18} aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{event.userName ?? event.userId}</span>
          {CategoryIcon && <CategoryIcon size={14} className="text-text-tertiary" aria-hidden />}
          <span className="text-text-secondary text-sm truncate">{description}</span>
        </div>
        <div className="text-text-tertiary text-xs mt-0.5 flex flex-wrap gap-x-2">
          <span title={new Date(event.timestamp).toLocaleString(locale)}>
            {relativeTime(event.timestamp, locale)}
          </span>
          {event.platform && <span>· {event.platform}</span>}
          {event.locale && <span>· {event.locale}</span>}
          {event.appVersion && <span>· v{event.appVersion}</span>}
        </div>
      </div>
    </li>
  );
}

function describeEvent(e: AppEvent, t: ReturnType<typeof useTranslations<'activity'>>): string {
  switch (e.type) {
    case 'sign_in':
    case 'sign_up':
    case 'sign_out':
    case 'app_opened':
    case 'family_created':
    case 'family_joined':
    case 'family_left':
    case 'credit_redeemed':
    case 'credit_unredeemed':
    case 'credit_expired':
    case 'subscription_cancelled':
    case 'subscription_renewed':
    case 'subscription_expired':
    case 'warranty_closed':
    case 'warranty_expired':
    case 'firestore_write_failed':
    case 'image_upload_failed':
      return t(`events.${e.type}`);
    case 'item_created':
    case 'item_updated':
    case 'item_deleted': {
      const cat = e.itemCategory ?? 'credit';
      return `${t(`events.${e.type}`)} ${t(`categories.${cat}`)}`;
    }
    default:
      return e.type;
  }
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

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const ISRAEL_TIMEZONE = 'Asia/Jerusalem';

function computeRangeBounds(preset: RangePreset): { start: number; end: number } | null {
  const now = Date.now();
  switch (preset) {
    case 'all':
      return null;
    case 'lastHour':
      return { start: now - HOUR_MS, end: now };
    case 'last24h':
      return { start: now - DAY_MS, end: now };
    case 'today':
      return { start: startOfTodayInIsrael(), end: now };
    case 'thisWeek':
      // Start of the current ISO week (Monday). Israel-local interpretation.
      return { start: startOfWeekInIsrael(), end: now };
    default:
      return null;
  }
}

function startOfTodayInIsrael(): number {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === 'year')!.value);
  const m = Number(parts.find((p) => p.type === 'month')!.value);
  const d = Number(parts.find((p) => p.type === 'day')!.value);
  // Start of that local date in Israel ≈ UTC midnight - Israel offset.
  const offsetMin = getIsraelOffsetMinutes(new Date(Date.UTC(y, m - 1, d, 12)));
  return Date.UTC(y, m - 1, d, 0, 0, 0) - offsetMin * 60 * 1000;
}

function startOfWeekInIsrael(): number {
  // Start of week = previous Sunday 00:00 IL (Sunday is the start of the week in Israel).
  const startOfToday = startOfTodayInIsrael();
  const today = new Date(startOfToday);
  const utcDay = today.getUTCDay();
  // Approximate — convert to Israel-local day-of-week using offset
  const offsetMin = getIsraelOffsetMinutes(today);
  const localDay = (utcDay + Math.floor(offsetMin / 60) + 7) % 7;
  return startOfToday - localDay * DAY_MS;
}

function getIsraelOffsetMinutes(d: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const h = get('hour') === 24 ? 0 : get('hour');
  const local = Date.UTC(get('year'), get('month') - 1, get('day'), h, get('minute'), get('second'));
  return Math.round((local - d.getTime()) / 60000);
}

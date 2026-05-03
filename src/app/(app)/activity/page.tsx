import { getTranslations, getLocale } from 'next-intl/server';
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
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { loadEvents, type AppEvent, type EventType, type ItemCategory } from '@/lib/events';

export const revalidate = 30;

const EVENT_ICON: Record<EventType, LucideIcon> = {
  sign_in: LogIn,
  sign_up: UserPlus,
  sign_out: LogOut,
  item_created: Plus,
  item_updated: Pencil,
  item_deleted: Trash2,
  family_created: Users,
  family_joined: Users,
  family_left: Users,
  app_opened: Smartphone,
};

const CATEGORY_ICON: Record<ItemCategory, LucideIcon> = {
  credit: CreditCard,
  warranty: ShieldCheck,
  subscription: Repeat,
  occasion: Cake,
  document: FileText,
};

export default async function ActivityPage() {
  const t = await getTranslations('activity');
  const locale = await getLocale();
  const events = await loadEvents(200);

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-3xl font-bold">{t('title')}</h2>
          <p className="text-text-secondary text-sm mt-1">
            {t('subtitle', { count: events.length })}
          </p>
        </div>
      </header>

      {events.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-10 text-center">
          <p className="text-text-secondary">{t('empty.title')}</p>
          <p className="text-text-tertiary text-sm mt-1">{t('empty.hint')}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <EventRow key={e.id} event={e} locale={locale} t={t} />
          ))}
        </ul>
      )}
    </div>
  );
}

interface EventRowProps {
  event: AppEvent;
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations<'activity'>>>;
}

function EventRow({ event, locale, t }: EventRowProps) {
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
          {CategoryIcon && (
            <CategoryIcon size={14} className="text-text-tertiary" aria-hidden />
          )}
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

function describeEvent(
  e: AppEvent,
  t: Awaited<ReturnType<typeof getTranslations<'activity'>>>,
): string {
  switch (e.type) {
    case 'sign_in':
    case 'sign_up':
    case 'sign_out':
    case 'app_opened':
      return t(`events.${e.type}`);
    case 'family_created':
    case 'family_joined':
    case 'family_left':
      return t(`events.${e.type}`);
    case 'item_created':
    case 'item_updated':
    case 'item_deleted': {
      const cat = e.itemCategory ?? 'credit';
      const action = t(`events.${e.type}`);
      const category = t(`categories.${cat}`);
      return `${action} ${category}`;
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

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
import { getTranslations } from 'next-intl/server';
import type { AppEvent, EventType, ItemCategory } from '@/lib/events';

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
  event: AppEvent;
  locale: string;
}

export default async function UserDetailEventRow({ event, locale }: Props) {
  const t = await getTranslations('activity');
  const Icon = EVENT_ICON[event.type] ?? Smartphone;
  const CategoryIcon = event.itemCategory ? CATEGORY_ICON[event.itemCategory] : null;
  const description = describeEvent(event, t);

  return (
    <li className="rounded-lg bg-surface shadow-wallet px-3 py-2 flex items-center gap-2.5 text-sm">
      <div className="rounded bg-primary-surface text-primary p-1.5 shrink-0">
        <Icon size={14} aria-hidden />
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
        {CategoryIcon && <CategoryIcon size={12} className="text-text-tertiary" aria-hidden />}
        <span className="text-text-secondary truncate">{description}</span>
      </div>
      <span
        className="text-text-tertiary text-xs shrink-0"
        title={new Date(event.timestamp).toLocaleString(locale)}
      >
        {relativeTime(event.timestamp, locale)}
      </span>
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
  return rtf.format(-day, 'day');
}

import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import {
  ArrowLeft,
  ArrowRight,
  Apple,
  Smartphone,
  Crown,
  Mail,
  Calendar,
  Clock,
  Globe,
  Tag,
  ShieldCheck,
  CreditCard,
  Repeat,
  Cake,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { loadUserDetail, type CategoryStats, type ItemSummary, type UserDetail } from '@/lib/userDetail';
import { getCostSnapshot } from '@/lib/cost';
import type { ItemCategory } from '@/lib/events';
import type { AppEvent } from '@/lib/events';
import CopyUidButton from '@/components/CopyUidButton';
import UserDetailEventRow from './UserDetailEventRow';

export const revalidate = 60;

const CATEGORY_ICON: Record<ItemCategory, LucideIcon> = {
  credit: CreditCard,
  warranty: ShieldCheck,
  subscription: Repeat,
  occasion: Cake,
  document: FileText,
};

const ITEM_CATEGORIES: ItemCategory[] = ['credit', 'warranty', 'subscription', 'occasion', 'document'];

interface PageProps {
  params: Promise<{ uid: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  const { uid } = await params;
  const t = await getTranslations('userDetail');
  const tUsers = await getTranslations('users');
  const locale = await getLocale();
  const detail = await loadUserDetail(uid);

  if (!detail) return <NotFound t={t} locale={locale} />;

  // Optional cost contribution. Best-effort — silently null if anything fails.
  let costContribution: number | null = null;
  try {
    const cost = await getCostSnapshot();
    if (cost.costPerActiveUser !== null) costContribution = cost.costPerActiveUser;
  } catch {
    // ignore
  }

  return (
    <div className="space-y-5">
      <BackLink locale={locale} label={t('backToList')} />

      <ProfileHeader detail={detail} t={t} tUsers={tUsers} locale={locale} />
      <FamilyCard family={detail.family} t={t} />
      <ItemsGrid items={detail.itemsByCategory} t={t} tUsers={tUsers} locale={locale} />
      <ActivitySection events={detail.events} t={t} locale={locale} />
      {costContribution !== null && <CostContributionCard contribution={costContribution} t={t} />}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function NotFound({
  t,
  locale,
}: {
  t: Awaited<ReturnType<typeof getTranslations<'userDetail'>>>;
  locale: string;
}) {
  return (
    <div className="space-y-5">
      <BackLink locale={locale} label={t('backToList')} />
      <div className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-10 text-center text-text-secondary">
        {t('notFound')}
      </div>
    </div>
  );
}

function BackLink({ locale, label }: { locale: string; label: string }) {
  const Arrow = locale === 'he' ? ArrowRight : ArrowLeft;
  return (
    <Link
      href="/users"
      className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary transition"
    >
      <Arrow size={16} aria-hidden />
      {label}
    </Link>
  );
}

function ProfileHeader({
  detail,
  t,
  tUsers,
  locale,
}: {
  detail: UserDetail;
  t: Awaited<ReturnType<typeof getTranslations<'userDetail'>>>;
  tUsers: Awaited<ReturnType<typeof getTranslations<'users'>>>;
  locale: string;
}) {
  const { auth, latestPlatform, latestLocale, latestAppVersion } = detail;

  return (
    <header className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <Avatar src={auth.photoURL} name={auth.displayName ?? auth.email ?? '?'} size={64} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">{auth.displayName ?? '—'}</h1>
          {auth.email && (
            <p className="text-sm text-text-secondary truncate" dir="ltr">
              <Mail size={12} className="inline-block me-1" aria-hidden /> {auth.email}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <CopyUidButton uid={auth.uid} label={t('copyUid')} />
            {auth.disabled && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-urgency-red-surface text-urgency-red">
                <ShieldAlert size={11} aria-hidden /> {t('disabled')}
              </span>
            )}
          </div>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-xs">
        <Field
          icon={Calendar}
          label={t('signedUp')}
          value={
            auth.createdAt
              ? `${relativeTime(auth.createdAt, locale)} (${absoluteDate(auth.createdAt, locale)})`
              : '—'
          }
        />
        <Field
          icon={Clock}
          label={t('lastActive')}
          value={
            auth.lastSignInAt
              ? `${relativeTime(auth.lastSignInAt, locale)} (${absoluteDate(auth.lastSignInAt, locale)})`
              : '—'
          }
        />
        <Field
          icon={Tag}
          label={t('providers')}
          value={auth.providers.length > 0 ? auth.providers.join(', ') : '—'}
        />
        <Field
          icon={latestPlatform === 'ios' ? Apple : Smartphone}
          label={t('platform')}
          value={latestPlatform ? labelPlatform(latestPlatform) : tUsers('cols.platform') + ' —'}
        />
        <Field icon={Globe} label={t('locale')} value={latestLocale ? latestLocale.toUpperCase() : '—'} />
        <Field icon={Tag} label={t('appVersion')} value={latestAppVersion ? `v${latestAppVersion}` : '—'} />
      </dl>
    </header>
  );
}

function FamilyCard({
  family,
  t,
}: {
  family: UserDetail['family'];
  t: Awaited<ReturnType<typeof getTranslations<'userDetail'>>>;
}) {
  return (
    <section className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-5">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
        {t('sections.family')}
      </h2>
      {!family ? (
        <p className="text-sm text-text-tertiary">{t('noFamily')}</p>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="font-semibold">{family.name}</span>
            {family.isAdmin && (
              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-primary-surface text-primary">
                <Crown size={11} aria-hidden /> {t('admin')}
              </span>
            )}
          </div>
          <ul className="grid sm:grid-cols-2 gap-2">
            {family.members.map((m) => (
              <li key={m.uid} className="flex items-center gap-2 min-w-0">
                <Avatar src={m.photoURL} name={m.displayName} size={28} />
                <span className="font-medium truncate">{m.displayName}</span>
                {m.isAdmin && <Crown size={11} className="text-primary shrink-0" aria-label="admin" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ItemsGrid({
  items,
  t,
  tUsers,
  locale,
}: {
  items: Record<ItemCategory, CategoryStats>;
  t: Awaited<ReturnType<typeof getTranslations<'userDetail'>>>;
  tUsers: Awaited<ReturnType<typeof getTranslations<'users'>>>;
  locale: string;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3 px-1">
        {t('sections.items')}
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ITEM_CATEGORIES.map((category) => (
          <CategoryCard
            key={category}
            category={category}
            stats={items[category]}
            t={t}
            tUsers={tUsers}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}

function CategoryCard({
  category,
  stats,
  t,
  tUsers,
  locale,
}: {
  category: ItemCategory;
  stats: CategoryStats;
  t: Awaited<ReturnType<typeof getTranslations<'userDetail'>>>;
  tUsers: Awaited<ReturnType<typeof getTranslations<'users'>>>;
  locale: string;
}) {
  const Icon = CATEGORY_ICON[category];
  const colKey = `cols.${category}s` as 'cols.credits' | 'cols.warranties' | 'cols.subscriptions' | 'cols.occasions' | 'cols.documents';
  const label = tUsers(colKey);

  return (
    <article className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-4">
      <header className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="rounded-lg bg-primary-surface text-primary p-1.5 shrink-0">
            <Icon size={16} aria-hidden />
          </div>
          <h3 className="font-semibold text-sm truncate">{label}</h3>
        </div>
        <div className="text-end shrink-0">
          <div className="font-bold text-lg leading-none">{stats.activeCount}</div>
          {stats.activeCount !== stats.totalCount && (
            <div className="text-[10px] text-text-tertiary mt-0.5">
              {t('totalLabel', { count: stats.totalCount })}
            </div>
          )}
        </div>
      </header>
      {stats.recent.length === 0 ? (
        <p className="text-xs text-text-tertiary">{t('noItems')}</p>
      ) : (
        <ul className="space-y-1.5 text-xs">
          {stats.recent.map((item) => (
            <RecentItemRow key={item.id} item={item} locale={locale} t={t} />
          ))}
        </ul>
      )}
    </article>
  );
}

function RecentItemRow({
  item,
  locale,
  t,
}: {
  item: ItemSummary;
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations<'userDetail'>>>;
}) {
  const isInactive = item.status && item.status !== 'active';
  return (
    <li className="flex items-baseline gap-2 min-w-0">
      <span
        className={`flex-1 truncate ${isInactive ? 'text-text-tertiary line-through' : ''}`}
        title={item.title}
      >
        {item.title}
      </span>
      <span className="text-text-tertiary text-[10px] shrink-0" title={t('createdAt')}>
        {item.createdAt ? relativeTime(item.createdAt, locale) : '—'}
      </span>
    </li>
  );
}

function ActivitySection({
  events,
  t,
  locale,
}: {
  events: AppEvent[];
  t: Awaited<ReturnType<typeof getTranslations<'userDetail'>>>;
  locale: string;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3 px-1">
        {t('sections.activity', { count: events.length })}
      </h2>
      {events.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-6 text-center text-sm text-text-tertiary">
          {t('noActivity')}
        </div>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <UserDetailEventRow key={e.id} event={e} locale={locale} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CostContributionCard({
  contribution,
  t,
}: {
  contribution: number;
  t: Awaited<ReturnType<typeof getTranslations<'userDetail'>>>;
}) {
  return (
    <section className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-4">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">
        {t('sections.cost')}
      </h2>
      <p className="text-sm text-text-secondary leading-relaxed">
        {t('costMonthlyShare', { amount: formatUSD(contribution) })}
      </p>
    </section>
  );
}

function Field({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-text-tertiary uppercase tracking-wide text-[10px]">
        <Icon size={11} aria-hidden /> {label}
      </dt>
      <dd className="font-medium truncate" title={value}>
        {value}
      </dd>
    </div>
  );
}

function Avatar({ src, name, size }: { src: string | null; name: string; size: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover bg-separator shrink-0"
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <span
      aria-hidden
      className="rounded-full flex items-center justify-center bg-primary-surface text-primary font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initial}
    </span>
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

function absoluteDate(ms: number, locale: string): string {
  return new Date(ms).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount < 1 ? 4 : 2,
  }).format(amount);
}

function labelPlatform(p: 'ios' | 'android'): string {
  return p === 'ios' ? 'iOS' : 'Android';
}

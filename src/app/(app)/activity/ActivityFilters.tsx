'use client';
import { useTransition, useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';
import type { EventType } from '@/lib/events';

// Type-group preset → which underlying event types it includes.
// "all" is omitted intentionally (nullable filter).
export const TYPE_GROUPS: Record<TypeGroup, EventType[] | null> = {
  all: null,
  auth: ['sign_in', 'sign_up', 'sign_out'],
  items: ['item_created', 'item_updated', 'item_deleted'],
  status: [
    'credit_redeemed',
    'credit_unredeemed',
    'credit_expired',
    'subscription_cancelled',
    'warranty_closed',
    'warranty_expired',
  ],
  family: ['family_created', 'family_joined', 'family_left'],
  errors: ['firestore_write_failed', 'image_upload_failed'],
  lifecycle: ['app_opened'],
};

export type TypeGroup = 'all' | 'auth' | 'items' | 'status' | 'family' | 'errors' | 'lifecycle';
export type RangePreset = 'all' | 'lastHour' | 'today' | 'last24h' | 'thisWeek';

const TYPE_OPTIONS: TypeGroup[] = ['all', 'auth', 'items', 'status', 'family', 'errors', 'lifecycle'];
const RANGE_OPTIONS: RangePreset[] = ['all', 'lastHour', 'today', 'last24h', 'thisWeek'];

export const RANGE_PRESETS = RANGE_OPTIONS;

export default function ActivityFilters() {
  const t = useTranslations('activity.filters');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const currentQuery = params.get('q') ?? '';
  const currentType = (params.get('type') ?? 'all') as TypeGroup;
  const currentRange = (params.get('range') ?? 'all') as RangePreset;

  // Use local state for the search input so typing feels immediate.
  // Push to URL on submit / debounce-blur.
  const [searchValue, setSearchValue] = useState(currentQuery);

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value && value !== 'all' && value !== '') next.set(key, value);
      else next.delete(key);
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [params, pathname, router],
  );

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParam('q', searchValue.trim() || null);
  }

  function clearSearch() {
    setSearchValue('');
    updateParam('q', null);
  }

  function clearAll() {
    setSearchValue('');
    startTransition(() => router.replace(pathname));
  }

  const hasFilters = currentQuery !== '' || currentType !== 'all' || currentRange !== 'all';

  return (
    <div className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-3 flex flex-col sm:flex-row gap-2 sm:items-center">
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0">
        <Search
          size={14}
          className="absolute start-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          aria-hidden
        />
        <input
          type="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onBlur={handleSearchSubmit}
          placeholder={t('searchPlaceholder')}
          className="w-full ps-8 pe-8 py-2 rounded-lg border border-separator bg-surface text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {searchValue && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label={t('clearSearch')}
            className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-text-tertiary hover:text-text-primary rounded"
          >
            <X size={14} aria-hidden />
          </button>
        )}
      </form>

      {/* Type group select */}
      <select
        value={currentType}
        onChange={(e) => updateParam('type', e.target.value)}
        className="rounded-lg border border-separator bg-surface px-2.5 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:max-w-[12rem]"
        aria-label={t('typeLabel')}
      >
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {t(`type.${opt}` as Parameters<typeof t>[0])}
          </option>
        ))}
      </select>

      {/* Range select */}
      <select
        value={currentRange}
        onChange={(e) => updateParam('range', e.target.value)}
        className="rounded-lg border border-separator bg-surface px-2.5 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:max-w-[12rem]"
        aria-label={t('rangeLabel')}
      >
        {RANGE_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {t(`range.${opt}` as Parameters<typeof t>[0])}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-primary hover:underline px-2 py-1 shrink-0"
        >
          {t('clearAll')}
        </button>
      )}
    </div>
  );
}

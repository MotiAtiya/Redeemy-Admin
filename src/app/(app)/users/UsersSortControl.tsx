'use client';
import { useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowUpDown } from 'lucide-react';
import { SORT_KEYS, DEFAULT_SORT, type SortKey } from './usersSort';

export default function UsersSortControl() {
  const t = useTranslations('users.sort');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const current = (params.get('sort') ?? DEFAULT_SORT) as SortKey;

  function setSort(next: SortKey) {
    const sp = new URLSearchParams(params);
    if (next === DEFAULT_SORT) sp.delete('sort');
    else sp.set('sort', next);
    const qs = sp.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <ArrowUpDown size={14} className="text-text-tertiary" aria-hidden />
      <span className="text-text-secondary">{t('label')}:</span>
      <select
        value={current}
        onChange={(e) => setSort(e.target.value as SortKey)}
        className="bg-surface border border-separator rounded-md px-2 py-1 text-sm font-medium hover:border-primary transition cursor-pointer"
      >
        {SORT_KEYS.map((key) => (
          <option key={key} value={key}>
            {t(key)}
          </option>
        ))}
      </select>
    </label>
  );
}

// Plain module (no 'use client') so server components can read these values
// directly. Importing arrays/constants from a client component turns them
// into opaque client references on the server, which breaks .includes() etc.

export type SortKey = 'recent' | 'joined' | 'name' | 'name-desc' | 'items';

export const SORT_KEYS: readonly SortKey[] = ['recent', 'joined', 'name', 'name-desc', 'items'] as const;
export const DEFAULT_SORT: SortKey = 'recent';

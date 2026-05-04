// src/lib/utils/sort.ts
export type SortDir = 'asc' | 'desc';
export interface SortState { field: string; dir: SortDir }

function keys(prefix: string): { sortKey: string; dirKey: string } {
  return prefix
    ? { sortKey: `${prefix}Sort`, dirKey: `${prefix}Dir` }
    : { sortKey: 'sort',          dirKey: 'dir' };
}

export function parseSortParam(url: URL, prefix = ''): SortState | null {
  const { sortKey, dirKey } = keys(prefix);
  const field = url.searchParams.get(sortKey);
  if (!field) return null;
  const dir: SortDir = url.searchParams.get(dirKey) === 'desc' ? 'desc' : 'asc';
  return { field, dir };
}

export function buildSortHref(
  url: URL,
  field: string,
  current: SortState | null,
  prefix = '',
): string {
  const { sortKey, dirKey } = keys(prefix);
  const next = new URL(url.href);
  next.searchParams.set(sortKey, field);
  if (current && current.field === field) {
    next.searchParams.set(dirKey, current.dir === 'asc' ? 'desc' : 'asc');
  } else {
    next.searchParams.set(dirKey, 'asc');
  }
  next.searchParams.delete('page');
  return next.pathname + next.search;
}

export function compareBy<T>(
  getter: (row: T) => unknown,
  dir: SortDir,
): (a: T, b: T) => number {
  const sign = dir === 'asc' ? 1 : -1;
  return (a, b) => {
    const av = getter(a);
    const bv = getter(b);
    const aNull = av === null || av === undefined;
    const bNull = bv === null || bv === undefined;
    if (aNull && bNull) return 0;
    if (aNull) return 1;
    if (bNull) return -1;
    if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * sign;
    if (av instanceof Date && bv instanceof Date)         return (av.getTime() - bv.getTime()) * sign;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sign;
    return String(av).localeCompare(String(bv)) * sign;
  };
}

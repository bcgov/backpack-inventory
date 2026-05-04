// src/lib/utils/sort.test.ts
import { describe, it, expect } from 'vitest';
import { parseSortParam, buildSortHref, compareBy } from './sort.js';

describe('parseSortParam', () => {
  it('returns null when sort param is absent', () => {
    expect(parseSortParam(new URL('http://x/p'))).toBeNull();
  });

  it('returns null when sort param is empty', () => {
    expect(parseSortParam(new URL('http://x/p?sort='))).toBeNull();
  });

  it('defaults dir to asc when missing', () => {
    expect(parseSortParam(new URL('http://x/p?sort=name'))).toEqual({ field: 'name', dir: 'asc' });
  });

  it('reads dir=desc', () => {
    expect(parseSortParam(new URL('http://x/p?sort=name&dir=desc'))).toEqual({ field: 'name', dir: 'desc' });
  });

  it('treats unknown dir as asc', () => {
    expect(parseSortParam(new URL('http://x/p?sort=name&dir=zzz'))).toEqual({ field: 'name', dir: 'asc' });
  });

  it('honors a prefix', () => {
    const u = new URL('http://x/p?historySort=month&historyDir=desc');
    expect(parseSortParam(u, 'history')).toEqual({ field: 'month', dir: 'desc' });
    expect(parseSortParam(u)).toBeNull();
  });
});

describe('buildSortHref', () => {
  it('sets sort=field&dir=asc on a fresh column click', () => {
    const u = new URL('http://x/p');
    expect(buildSortHref(u, 'name', null)).toBe('/p?sort=name&dir=asc');
  });

  it('toggles asc → desc when clicking the active column', () => {
    const u = new URL('http://x/p?sort=name&dir=asc');
    expect(buildSortHref(u, 'name', { field: 'name', dir: 'asc' })).toBe('/p?sort=name&dir=desc');
  });

  it('toggles desc → asc when clicking the active column', () => {
    const u = new URL('http://x/p?sort=name&dir=desc');
    expect(buildSortHref(u, 'name', { field: 'name', dir: 'desc' })).toBe('/p?sort=name&dir=asc');
  });

  it('replaces with asc when clicking a different column', () => {
    const u = new URL('http://x/p?sort=name&dir=desc');
    expect(buildSortHref(u, 'qty', { field: 'name', dir: 'desc' })).toBe('/p?sort=qty&dir=asc');
  });

  it('preserves unrelated query params', () => {
    const u = new URL('http://x/p?office=o1&dateFrom=2026-01-01');
    const href = buildSortHref(u, 'date', null);
    expect(href).toContain('office=o1');
    expect(href).toContain('dateFrom=2026-01-01');
    expect(href).toContain('sort=date');
    expect(href).toContain('dir=asc');
  });

  it('strips the page param when sort changes', () => {
    const u = new URL('http://x/p?page=5&sort=name&dir=asc');
    const href = buildSortHref(u, 'name', { field: 'name', dir: 'asc' });
    expect(href).not.toContain('page=');
  });

  it('honors a prefix', () => {
    const u = new URL('http://x/p');
    expect(buildSortHref(u, 'month', null, 'history')).toBe('/p?historySort=month&historyDir=asc');
  });
});

describe('compareBy', () => {
  it('sorts strings ascending with localeCompare', () => {
    const rows = [{ n: 'banana' }, { n: 'apple' }, { n: 'cherry' }];
    rows.sort(compareBy<{ n: string }>((r) => r.n, 'asc'));
    expect(rows.map((r) => r.n)).toEqual(['apple', 'banana', 'cherry']);
  });

  it('sorts strings descending', () => {
    const rows = [{ n: 'banana' }, { n: 'apple' }, { n: 'cherry' }];
    rows.sort(compareBy<{ n: string }>((r) => r.n, 'desc'));
    expect(rows.map((r) => r.n)).toEqual(['cherry', 'banana', 'apple']);
  });

  it('sorts numbers ascending', () => {
    const rows = [{ q: 10 }, { q: 2 }, { q: 30 }];
    rows.sort(compareBy<{ q: number }>((r) => r.q, 'asc'));
    expect(rows.map((r) => r.q)).toEqual([2, 10, 30]);
  });

  it('sorts dates ascending', () => {
    const rows = [
      { d: new Date('2026-03-01') },
      { d: new Date('2026-01-01') },
      { d: new Date('2026-02-01') },
    ];
    rows.sort(compareBy<{ d: Date }>((r) => r.d, 'asc'));
    expect(rows.map((r) => r.d.toISOString().slice(0, 10))).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
  });

  it('puts nulls last in asc', () => {
    const rows = [{ q: 10 }, { q: null }, { q: 2 }];
    rows.sort(compareBy<{ q: number | null }>((r) => r.q, 'asc'));
    expect(rows.map((r) => r.q)).toEqual([2, 10, null]);
  });

  it('puts nulls last in desc as well', () => {
    const rows = [{ q: 10 }, { q: null }, { q: 2 }];
    rows.sort(compareBy<{ q: number | null }>((r) => r.q, 'desc'));
    expect(rows.map((r) => r.q)).toEqual([10, 2, null]);
  });
});

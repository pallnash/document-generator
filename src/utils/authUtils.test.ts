import { describe, it, expect, beforeEach } from 'vitest';
import { readRole, writeRole, clearRole, ROLE_KEY } from './authUtils';

// Минимальный localStorage mock для Node-окружения vitest
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
};

describe('authUtils (подписанная роль)', () => {
  beforeEach(() => store.clear());

  it('writeRole+readRole — roundtrip для admin и user', () => {
    writeRole('admin');
    expect(readRole()).toBe('admin');
    writeRole('user');
    expect(readRole()).toBe('user');
  });

  it('голая строка admin в localStorage — подделка, readRole вернёт null', () => {
    store.set(ROLE_KEY, 'admin');
    expect(readRole()).toBeNull();
  });

  it('произвольная строка — null', () => {
    store.set(ROLE_KEY, 'hacker; DROP TABLE users');
    expect(readRole()).toBeNull();
  });

  it('запись с испорченной подписью — null', () => {
    store.set(ROLE_KEY, 'admin.0000000000000000');
    expect(readRole()).toBeNull();
  });

  it('clearRole убирает роль', () => {
    writeRole('admin');
    clearRole();
    expect(readRole()).toBeNull();
    expect(store.has(ROLE_KEY)).toBe(false);
  });

  it('пустое хранилище — null', () => {
    expect(readRole()).toBeNull();
  });
});
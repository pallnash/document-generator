import { describe, it, expect } from 'vitest';
import {
  localStorageRegistryStorage,
  localStorageCounterStorage,
  memoryRegistryStorage,
  memoryCounterStorage,
  activeRegistryStorage,
  activeCounterStorage,
} from './registryStorage';
import type { RegisteredDocument } from '../types';

const mkDoc = (overrides: Partial<RegisteredDocument>): RegisteredDocument => ({
  id: 's-' + Math.random().toString(36).slice(2),
  regNumber: '1408/1И',
  date: '14.08.2026',
  seq: 1,
  deptCode: 'И',
  deptName: 'ИТ, автоматика, ПО',
  composerName: 'Орлов Д.С.',
  composerDept: 'Бюро автоматики',
  recipientName: 'Начальнику бюро',
  subject: 'Служебная записка',
  registeredAt: '14.08.2026, 11:30',
  registeredByRole: 'admin',
  ...overrides,
});

describe('memory storage (mock базы)', () => {
  it('round-trip: save → load возвращает те же данные', () => {
    const docs = [mkDoc({ regNumber: '1408/1И' }), mkDoc({ regNumber: '1408/2И' })];
    memoryRegistryStorage.saveRegistry(docs);
    const loaded = memoryRegistryStorage.loadRegistry();
    expect(loaded).toHaveLength(2);
    expect(loaded.map(d => d.regNumber)).toEqual(['1408/1И', '1408/2И']);
  });

  it('clear очищает реестр', () => {
    memoryRegistryStorage.saveRegistry([mkDoc({})]);
    memoryRegistryStorage.clearRegistry();
    expect(memoryRegistryStorage.loadRegistry()).toEqual([]);
  });

  it('счётчики: save → load', () => {
    memoryCounterStorage.saveCounters({ counters: { И: 5 }, date: '14.08.2026' });
    const state = memoryCounterStorage.loadCounters();
    expect(state?.counters['И']).toBe(5);
    expect(state?.date).toBe('14.08.2026');
  });
});

describe('active binding (текущая реализация)', () => {
  it('активная реализация реестра — это localStorage-хранилище (данные не теряются)', () => {
    expect(activeRegistryStorage).toBe(localStorageRegistryStorage);
    expect(activeCounterStorage).toBe(localStorageCounterStorage);
  });

  it('localStorage-хранилище не падает при отсутствии localStorage (node-окружение)', () => {
    // В vitest (node) localStorage может отсутствовать — load должен вернуть []
    const loaded = localStorageRegistryStorage.loadRegistry();
    expect(Array.isArray(loaded)).toBe(true);
    // и не бросать при сохранении
    localStorageRegistryStorage.saveRegistry([mkDoc({})]);
    localStorageRegistryStorage.clearRegistry();
  });
});
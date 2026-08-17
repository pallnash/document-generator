/**
 * Registry Storage Layer — абстракция «базы данных» реестра и счётчиков.
 *
 * СЕЙЧАС: активная реализация — localStorage (данные не теряются, всё как было).
 *
 * ЗАЧЕМ: весь код ходит в реестр ТОЛЬКО через интерфейсы RegistryStorage /
 * CounterStorage ниже. Когда появится реальный бэкенд tmdata, заменяем
 * `activeRegistryStorage` / `activeCounterStorage` на fetch-клиент:
 *
 *   GET    /api/v1/registry           → список записей
 *   POST   /api/v1/registry           → новая запись
 *   PUT    /api/v1/registry/:id       → обновление
 *   DELETE /api/v1/registry/:id       → удаление
 *   DELETE /api/v1/registry           → очистка
 *   GET    /api/v1/counters           → { counters, date }  (дневной сброс на сервере)
 *   PUT    /api/v1/counters           → сохранение счётчиков
 *
 * Контракт методов синхронный — компоненты и бизнес-логика не меняются.
 * «Фронтенд — это фронтенд»: браузер не владеет базой, а ходит в API.
 */

import type { RegisteredDocument } from '../types';
import type { DeptCounters } from '../constants/departmentCodes';

/* =========================================================================
   Контракты (это же — контракт REST API tmdata)
   ========================================================================= */

export interface RegistryStorage {
  /** Полный список записей [новая … старая] (как хранится сейчас). */
  loadRegistry(): RegisteredDocument[];
  /** Перезаписать реестр целиком (с уже пересобранной hash-цепочкой). */
  saveRegistry(list: RegisteredDocument[]): void;
  /** Полная очистка реестра (DELETE /api/v1/registry). */
  clearRegistry(): void;
}

export interface CounterState {
  counters: DeptCounters;
  /** Дата последнего сброса 'ДД.ММ.ГГГГ' — для дневного обнуления. */
  date: string | null;
}

export interface CounterStorage {
  loadCounters(): CounterState | null;
  saveCounters(state: CounterState): void;
}

/* =========================================================================
   Реализация #1 (ACTIVE): localStorage — текущее поведение без потерь.
   ========================================================================= */

const LEGACY_REGISTRY_KEY = 'teplomash_registered_docs_registry_v3';
const LEGACY_COUNTERS_KEY = 'teplomash_doc_dept_counters_v3';
const LEGACY_COUNTERS_DATE_KEY = 'teplomash_doc_dept_counters_date_v3';

export const localStorageRegistryStorage: RegistryStorage = {
  loadRegistry(): RegisteredDocument[] {
    try {
      const raw = localStorage.getItem(LEGACY_REGISTRY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as RegisteredDocument[]) : [];
    } catch (e) {
      console.error('[registryStorage] load failed:', e);
      return [];
    }
  },
  saveRegistry(list: RegisteredDocument[]): void {
    try {
      localStorage.setItem(LEGACY_REGISTRY_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('[registryStorage] save failed:', e);
    }
  },
  clearRegistry(): void {
    try {
      localStorage.removeItem(LEGACY_REGISTRY_KEY);
    } catch (e) {
      console.error('[registryStorage] clear failed:', e);
    }
  },
};

export const localStorageCounterStorage: CounterStorage = {
  loadCounters(): CounterState | null {
    try {
      const raw = localStorage.getItem(LEGACY_COUNTERS_KEY);
      if (!raw) return null;
      return {
        counters: JSON.parse(raw) as DeptCounters,
        date: localStorage.getItem(LEGACY_COUNTERS_DATE_KEY),
      };
    } catch (e) {
      console.error('[registryStorage] counters load failed:', e);
      return null;
    }
  },
  saveCounters(state: CounterState): void {
    try {
      localStorage.setItem(LEGACY_COUNTERS_KEY, JSON.stringify(state.counters));
      if (state.date) {
        localStorage.setItem(LEGACY_COUNTERS_DATE_KEY, state.date);
      } else {
        localStorage.removeItem(LEGACY_COUNTERS_DATE_KEY);
      }
    } catch (e) {
      console.error('[registryStorage] counters save failed:', e);
    }
  },
};

/* =========================================================================
   Реализация #2 (FALLBACK): in-memory mock — для тестов / офлайн без браузера.
   ========================================================================= */

const memoryRegistry: RegisteredDocument[] = [];

export const memoryRegistryStorage: RegistryStorage = {
  loadRegistry(): RegisteredDocument[] {
    return memoryRegistry.map(r => ({ ...r }));
  },
  saveRegistry(list: RegisteredDocument[]): void {
    memoryRegistry.splice(0, memoryRegistry.length, ...list.map(r => ({ ...r })));
  },
  clearRegistry(): void {
    memoryRegistry.splice(0, memoryRegistry.length);
  },
};

const memoryCounters: CounterState = { counters: {}, date: null };

export const memoryCounterStorage: CounterStorage = {
  loadCounters(): CounterState | null {
    return { counters: { ...memoryCounters.counters }, date: memoryCounters.date };
  },
  saveCounters(state: CounterState): void {
    memoryCounters.counters = { ...state.counters };
    memoryCounters.date = state.date;
  },
};

/* =========================================================================
   ACTIVE BINDING — единственное место переключения на реальный API.
   Заменить на fetch-клиент tmdata (реализация #3) — и всё работает.
   ========================================================================= */

export const activeRegistryStorage: RegistryStorage = localStorageRegistryStorage;
export const activeCounterStorage: CounterStorage = localStorageCounterStorage;
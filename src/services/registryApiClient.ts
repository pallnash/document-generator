/**
 * Registry API Client (реализация #3 — заготовка для реального бэкенда tmdata).
 *
 * НЕ АКТИВИРОВАНА. Подключение: в registryStorage.ts заменить
 *   activeRegistryStorage = localStorageRegistryStorage;
 * на
 *   activeRegistryStorage = apiRegistryStorage;
 *
 * Контракт эндпоинтов (должны быть реализованы в server.ts / бэкенде tmdata):
 *   GET    {base}/v1/registry                     → RegisteredDocument[]
 *   PUT    {base}/v1/registry                     → сохранить весь реестр (hash-chain)
 *   DELETE {base}/v1/registry                     → очистить реестр
 *   GET    {base}/v1/counters                     → { counters: DeptCounters, date: string|null }
 *   PUT    {base}/v1/counters                     → сохранить счётчики
 *
 * ВАЖНО: контракт синхронный на уровне компонентов, но fetch асинхронный.
 * Перед активацией нужно:
 *   1) сделать функции в компонентах async (или поднять чтение реестра в
 *      единый useRegistry хук с кэшем);
 *   2) либо использовать «синхронный» мост: память + фоновая синхронизация с API.
*  Слой ниже — каркас с базовой обработкой ошибок, чтобы адаптация была тривиальной.
 */

/* Базовая fetch-обёртка (getApiBaseUrl из '../config/microserviceConfig' — уже
 * вычисляет /docgen/api в зависимости от деплоя). Активируется при переходе
 * на async-контракт.
const api = {
  async get<T>(url: string): Promise<T> {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
    return res.json() as Promise<T>;
  },
  async put<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PUT ${url} → ${res.status}`);
    return res.json() as Promise<T>;
  },
  async del<T>(url: string): Promise<T> {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error(`DELETE ${url} → ${res.status}`);
    return res.json() as Promise<T>;
  },
};

let apiBase = '';
const ensureBase = () => {
  if (!apiBase) apiBase = getApiBaseUrl();
  return apiBase;
};
*/

/* Внимание: методы интерфейса синхронные. Этот клиент требует предварительной
 * адаптации (см. шапку файла) — приведён как схема, не включается в сборку
 * до перехода на асинхронный контракт. */

/* Пример финального вида (после перехода на async-контракт):

export const apiRegistryStorage: RegistryStorage = {
  async loadRegistry() {
    return api.get<RegisteredDocument[]>(`${ensureBase()}/v1/registry`);
  },
  async saveRegistry(list) {
    await api.put(`${ensureBase()}/v1/registry`, list);
  },
  async clearRegistry() {
    await api.del(`${ensureBase()}/v1/registry`);
  },
};

export const apiCounterStorage: CounterStorage = {
  async loadCounters(): Promise<CounterState | null> {
    return api.get<CounterState | null>(`${ensureBase()}/v1/counters`);
  },
  async saveCounters(state: CounterState) {
    await api.put(`${ensureBase()}/v1/counters`, state);
  },
};
*/
import { useEffect, useState } from 'react';

/**
 * Возвращает значение, обновляющееся с задержкой (debounce).
 * Используется для тяжёлых сайд-эффектов при вводе текста:
 * автосохранение в localStorage, postMessage, тяжёлый рендер.
 */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
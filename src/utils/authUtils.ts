import { fnv1a64Hex } from '../constants/departmentCodes';

/**
 * РОЛИ: deterrent-слой, а НЕ криптографическая защита.
 *
 * Проблема: роль хранилась в localStorage как голая строка 'admin' — любой
 * открывший devtools мог сделать себя администратором одной строкой.
 * Теперь роль хранится в форме `admin.<подпись>`, где подпись — FNV-1a 64 от
 * роли + соль. Подделать роль "вслепую" (localStorage.setItem('...','admin'))
 * больше нельзя: readRole() вернёт null из-за несовпадения подписи.
 *
 * ОГРАНИЧЕНИЕ (честно): соль лежит в бандле, FNV-1a не криптостойкая.
 * Это защита от случайной/наивной подделки, а не от мотивированного атакующего.
 * Полноценный RBAC требует серверной валидации (портал TMDATA / portal-core),
 * т.к. server.ts — микросервисная настройка внутреннего сайта, мы его не трогаем.
 */

export const ROLE_KEY = 'doc_gen_user_role';

const ROLE_SALT = 'teplomash-doc-gen:role-salt:v3';

const signRole = (role: string): string => `${role}.${fnv1a64Hex(role + ROLE_SALT)}`;

const parseSignedRole = (stored: string | null): 'admin' | 'user' | null => {
  if (!stored) return null;
  const dotIdx = stored.lastIndexOf('.');
  if (dotIdx <= 0 || dotIdx === stored.length - 1) return null;
  const role = stored.slice(0, dotIdx);
  const sig = stored.slice(dotIdx + 1);
  if (role !== 'admin' && role !== 'user') return null;
  // Проверка подписи: подделанная строка даёт несовпадение
  if (fnv1a64Hex(role + ROLE_SALT) !== sig) return null;
  return role;
};

/** Читает роль с проверкой подписи. Подделка/повреждение → null (нужна авторизация). */
export const readRole = (): 'admin' | 'user' | null => {
  try {
    return parseSignedRole(localStorage.getItem(ROLE_KEY));
  } catch {
    return null;
  }
};

/** Записывает подписанную роль. */
export const writeRole = (role: 'admin' | 'user'): void => {
  try {
    localStorage.setItem(ROLE_KEY, signRole(role));
    // Уведомляем гейт авторизации о смене роли (см. usePortalAuth)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('doc-role-changed'));
    }
  } catch {
    /* noop */
  }
};

/** Удаляет роль (выход). */
export const clearRole = (): void => {
  try {
    localStorage.removeItem(ROLE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('doc-role-changed'));
    }
  } catch {
    /* noop */
  }
};

/** True если переданное значение — валидная подписанная роль. */
export const isRoleAdmin = (role: 'admin' | 'user' | null): boolean =>
  role === 'admin';
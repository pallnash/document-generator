import { useState, useEffect, useCallback } from 'react';
import { readRole } from '../utils/authUtils';

export interface PortalUser {
  username?: string;
  email?: string;
  fullName?: string;
  roles?: string[];
  permissions?: string[];
}

export interface PortalAuthState {
  status: 'loading' | 'ready' | 'unauthorized';
  user: PortalUser | null;
  token: string | null;
  error?: string;
}

/** Локальный режим: сборка Electron (.exe) не живёт на портале — токен не требуется. */
const isElectronRuntime = (): boolean =>
  typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent);

/**
 * Custom Portal Auth Hook that validates JWT portal tokens from cookies/localStorage/postMessage
 * and seamlessly connects to portal-core when installed in production.
 *
 * Локальная (Electron) сборка: роль берётся из localStorage (подписанная), токен не нужен.
 * Web-сборка (портал /docgen/): проверяются JWT-токены портала portal-core.
 */
export function usePortalAuth(requiredPermission: string = 'DOC_GENERATOR_ACCESS'): PortalAuthState {
  const [authState, setAuthState] = useState<PortalAuthState>({
    status: 'loading',
    user: null,
    token: null,
  });

  const checkAuth = useCallback(async () => {
    // 0. Electron (.exe): локальный офлайн-режим — всегда ready, роль из localStorage
    if (isElectronRuntime()) {
      const storedRole = readRole();
      setAuthState({
        status: 'ready',
        user: {
          username: storedRole === 'admin' ? 'Администратор (локальный)' : 'Пользователь (локальный)',
          roles: storedRole ? [storedRole] : ['user'],
          permissions: [requiredPermission],
        },
        token: null,
      });
      return;
    }

    try {
      // 1. Check cookies / localStorage for portal JWT token
      const cookies = document.cookie ? document.cookie.split('; ') : [];
      const cookieToken = cookies
        .find((row) => row.startsWith('portal_token=') || row.startsWith('access_token=') || row.startsWith('jwt='))
        ?.split('=')[1];

      const localToken =
        localStorage.getItem('portal_token') ||
        localStorage.getItem('access_token') ||
        localStorage.getItem('jwt');

      const activeToken = cookieToken || localToken;

      // 2. Try importing portal-core dynamically if installed on server
      try {
        const packageName = 'portal-core';
        const portalCore = await import(/* @vite-ignore */ packageName);
        if (portalCore && typeof portalCore.useAuthGate === 'function') {
          const gate = portalCore.useAuthGate(requiredPermission);
          setAuthState({
            status: gate.status || 'ready',
            user: gate.user || { username: 'portal_user' },
            token: gate.token || activeToken || null,
          });
          return;
        }
      } catch {
        // portal-core is optional at local build time, fallback to standalone JWT/Portal gate check
      }

      // 3. Temporary mock fallback for UI/dev testing:
      // ВНИМАНИЕ: Данная ветка является временной интерфейсной заглушкой (mock) для тестирования верстки и ролей в UI.
      // Она не проверяет криптографическую подпись токена и не осуществляет валидацию на бэкенде.
      // Будет заменена на полноценную проверку при интеграции с боевым portal-core / RBAC бэкендом tmdata.
      const storedRole = readRole();

      if (activeToken || storedRole) {
        setAuthState({
          status: 'ready',
          user: {
            username: storedRole === 'admin' ? 'Администратор Портала' : 'Сотрудник Портала',
            roles: storedRole ? [storedRole] : ['user'],
            permissions: [requiredPermission],
          },
          token: activeToken || 'session_active',
        });
      } else {
        setAuthState({
          status: 'unauthorized',
          user: null,
          token: null,
          error: 'Требуется авторизация в портале TMDATA',
        });
      }
    } catch (err: any) {
      setAuthState({
        status: 'unauthorized',
        user: null,
        token: null,
        error: err.message || 'Ошибка проверки авторизации портала',
      });
    }
  }, [requiredPermission]);

  useEffect(() => {
    checkAuth();
    // Перепроверка при смене роли локально (writeRole/clearRole диспатчат событие)
    const handleRoleChange = () => checkAuth();
    window.addEventListener('doc-role-changed', handleRoleChange);
    return () => window.removeEventListener('doc-role-changed', handleRoleChange);
  }, [checkAuth]);

  return authState;
}
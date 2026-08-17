import React from 'react';
import { Lock, ShieldAlert, LogIn, ExternalLink, RefreshCw } from 'lucide-react';
import { PortalAuthState } from '../hooks/usePortalAuth';

interface PortalAuthGateProps {
  authState: PortalAuthState;
  onLogin: () => void;
  requiredPermission?: string;
  children: React.ReactNode;
}

export const PortalAuthGate: React.FC<PortalAuthGateProps> = ({ authState, onLogin, children }) => {
  if (authState.status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">
            Проверка авторизации портала TMDATA...
          </p>
        </div>
      </div>
    );
  }

  if (authState.status === 'unauthorized') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/80 p-6 shadow-2xl space-y-6">
          <div className="flex items-center space-x-3 text-amber-400">
            <div className="p-3 bg-amber-400/10 rounded-xl border border-amber-400/20">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Доступ ограничен</h2>
              <p className="text-xs text-slate-400">Портал TMDATA / Генератор ГОСТ документов</p>
            </div>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 space-y-2 text-xs text-slate-300">
            <p className="font-semibold text-slate-200">Требуется авторизованная сессия</p>
            <p className="text-slate-400 leading-relaxed">
              Для работы с генератором документов необходимо войти под вашей учётной записью на портале tmdata или выбрать локальную роль доступа.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={onLogin}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition shadow-lg shadow-indigo-600/20"
            >
              <LogIn className="w-4 h-4" />
              <span>Авторизоваться / Выбрать роль</span>
            </button>

            <a
              href="/"
              className="w-full py-2 px-4 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center justify-center space-x-2 transition border border-slate-600/50"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Перейти на Главный Портал</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

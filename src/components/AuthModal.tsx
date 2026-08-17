import React, { useState } from 'react';
import { Shield, User, Lock, LogIn, CheckCircle2, AlertCircle, KeyRound, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: 'admin' | 'user' | null;
  onSelectRole: (role: 'admin' | 'user') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  onSelectRole
}) => {
  const [activeMode, setActiveMode] = useState<'choose' | 'admin_login'>('choose');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUserLogin = () => {
    onSelectRole('user');
    onClose();
  };

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate credentials (admin / admin123 or admin / admin)
    if (
      (login.trim().toLowerCase() === 'pallnash' && password === 'pallnash2026') ||
      (login.trim().toLowerCase() === 'admin' && (password === 'admin123' || password === 'admin'))
    ) {
      setError(null);
      onSelectRole('admin');
      onClose();
    } else {
      setError('Неверный логин или пароль');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 relative">
          {currentRole && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Вход в систему</h3>
              <p className="text-xs text-indigo-200">Генератор документов ГОСТ Р 7.0.97–2025</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {activeMode === 'choose' ? (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-slate-800">Выберите вариант авторизации</h4>
                <p className="text-xs text-slate-500">Система поддерживает обычный и административный доступ</p>
              </div>

              {/* Option 1: Standard User (No Registration) */}
              <button
                type="button"
                onClick={handleUserLogin}
                className="w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-600 bg-slate-50/50 hover:bg-indigo-50/40 transition-all group relative overflow-hidden shadow-xs flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <User className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 flex items-center gap-1.5">
                    Обычный пользователь
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                      Без пароля
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Быстрый доступ к созданию, заполнению и печати всех документов по ГОСТ без регистрации.
                  </p>
                </div>
              </button>

              {/* Option 2: Admin Login */}
              <button
                type="button"
                onClick={() => {
                  setActiveMode('admin_login');
                  setError(null);
                }}
                className="w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-600 bg-slate-50/50 hover:bg-indigo-50/40 transition-all group relative overflow-hidden shadow-xs flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 flex items-center gap-1.5">
                    Администратор системы
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-semibold">
                      Логин / Пароль
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Полный доступ: управление базой сотрудников Тепломаш, настройками бланка и шаблонами.
                  </p>
                </div>
              </button>
            </div>
          ) : (
            /* Admin Login Form */
            <form onSubmit={handleAdminAuth} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  Авторизация Администратора
                </span>
                <button
                  type="button"
                  onClick={() => setActiveMode('choose')}
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >
                  ← Назад к выбору
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Логин администратора</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      placeholder="admin"
                      className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Пароль</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMode('choose')}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Войти как Админ
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  FileText, 
  Trash2, 
  Pencil, 
  Check, 
  Shield, 
  KeyRound, 
  Calendar, 
  Building2, 
  User, 
  Send,
  AlertTriangle,
  RefreshCw,
  Clock,
  Sparkles,
  Download,
  Printer,
  Filter,
  BarChart3,
  List,
  Copy,
  ShieldCheck,
  AlertOctagon,
  ShieldAlert,
  RotateCcw
} from 'lucide-react';
import { 
  RegisteredDocument, 
  getDocumentRegistry, 
  updateRegisteredDocumentInDb, 
  deleteRegisteredDocumentFromDb, 
  clearDocumentRegistryDb,
  verifyRegistryIntegrity,
  rechainRegistry,
  fnv1a64Hex,
  revokeDocumentInDb,
  unrevokeDocumentInDb
} from '../constants/departmentCodes';
import { computeRegistryStats } from '../utils/registryStats';
import { RevocationModal } from './RevocationModal';

interface RegistryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: 'admin' | 'user' | null;
  onRequestAdminAuth?: () => void;
  onOpenAsDraft?: (doc: RegisteredDocument) => void;
  onSelectDocToCorrect?: (doc: RegisteredDocument) => void;
}

export const RegistryModal: React.FC<RegistryModalProps> = ({
  isOpen,
  onClose,
  userRole,
  onRequestAdminAuth,
  onOpenAsDraft,
  onSelectDocToCorrect
}) => {
  const [registryList, setRegistryList] = useState<RegisteredDocument[]>([]);
  const [search, setSearch] = useState('');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingDocData, setEditingDocData] = useState<RegisteredDocument | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [chainStatus, setChainStatus] = useState<{ valid: boolean; total: number; checked: boolean }>({ valid: true, total: 0, checked: false });
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');

  // Revocation Modal State
  const [revokingDoc, setRevokingDoc] = useState<RegisteredDocument | null>(null);
  const [isRevocationModalOpen, setIsRevocationModalOpen] = useState(false);

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (isOpen) {
      const registry = getDocumentRegistry();
      setRegistryList(registry);
      const verdict = verifyRegistryIntegrity(registry);
      setChainStatus({ valid: verdict.valid, total: verdict.total, checked: true });
    }
  }, [isOpen]);

  const availableDepts = useMemo(() => {
    const depts = new Set<string>();
    for (const doc of registryList) {
      if (doc.deptName) depts.add(doc.deptName);
    }
    return Array.from(depts).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [registryList]);

  const filteredDocs = useMemo(() => {
    const q = search.toLowerCase().trim();
    // Разбор даты 'ДД.ММ.ГГГГ' → Date для период-фильтра
    const parseRuDate = (s: string): Date | null => {
      const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s || '');
      if (!m) return null;
      const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
      return isNaN(d.getTime()) ? null : d;
    };
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return registryList.filter(doc => {
      if (deptFilter !== 'all' && doc.deptName !== deptFilter) return false;
      if (periodFilter !== 'all') {
        const d = parseRuDate(doc.date);
        if (!d) return false;
        if (periodFilter === 'today' && d.getTime() !== now.getTime()) return false;
        if (periodFilter === 'week' && d < weekStart) return false;
        if (periodFilter === 'month' && d < monthStart) return false;
      }
      if (!q) return true;
      return (
        doc.regNumber.toLowerCase().includes(q) ||
        doc.subject.toLowerCase().includes(q) ||
        doc.composerName.toLowerCase().includes(q) ||
        doc.recipientName.toLowerCase().includes(q) ||
        doc.deptCode.toLowerCase().includes(q) ||
        doc.deptName.toLowerCase().includes(q) ||
        (doc.digitalSignatureKey && doc.digitalSignatureKey.toLowerCase().includes(q))
      );
    });
  }, [registryList, search, deptFilter, periodFilter]);

  const stats = useMemo(() => computeRegistryStats(registryList), [registryList]);

  if (!isOpen) return null;

  const handleDelete = (id: string, regNumber: string) => {
    if (!isAdmin) {
      if (onRequestAdminAuth) onRequestAdminAuth();
      return;
    }
    if (window.confirm(`Вы действительно хотите удалить документ № ${regNumber} из Единого реестра?`)) {
      deleteRegisteredDocumentFromDb(id);
      const updated = getDocumentRegistry();
      setRegistryList(updated);
      setStatusMsg({ type: 'success', text: `Документ № ${regNumber} удален из реестра.` });
    }
  };

  const handleClearAll = () => {
    if (!isAdmin) {
      if (onRequestAdminAuth) onRequestAdminAuth();
      return;
    }
    if (window.confirm('ВНИМАНИЕ! Вы действительно хотите ПОЛНОСТЬЮ очистить Единый реестр исходящих писем? Все записи будут удалены безвозвратно.')) {
      clearDocumentRegistryDb();
      setRegistryList([]);
      setStatusMsg({ type: 'success', text: 'Единый реестр писем полностью очищен.' });
    }
  };

  const handleSaveEdit = () => {
    if (!editingDocData) return;
    updateRegisteredDocumentInDb(editingDocData);
    const updated = getDocumentRegistry();
    setRegistryList(updated);
    // После легального редактирования цепочка перестроена — обновляем статус целостности
    const verdict = verifyRegistryIntegrity(updated);
    setChainStatus({ valid: verdict.valid, total: verdict.total, checked: true });
    setEditingDocId(null);
    setEditingDocData(null);
    setStatusMsg({ type: 'success', text: `Изменения документа № ${editingDocData.regNumber} сохранены.` });
  };

  const handleOpenRevokeModal = (doc: RegisteredDocument) => {
    if (!isAdmin) {
      if (onRequestAdminAuth) onRequestAdminAuth();
      return;
    }
    setRevokingDoc(doc);
    setIsRevocationModalOpen(true);
  };

  const handleRevokeConfirm = (docId: string, regNumber: string, reason: string, adminName: string) => {
    const res = revokeDocumentInDb({
      id: docId,
      regNumber,
      reason,
      revokedBy: adminName
    });

    if (res.success) {
      const updated = getDocumentRegistry();
      setRegistryList(updated);
      const verdict = verifyRegistryIntegrity(updated);
      setChainStatus({ valid: verdict.valid, total: verdict.total, checked: true });
      setStatusMsg({ type: 'success', text: `Документ № ${regNumber} успешно отозван. В реестре установлена отметка об аннулировании.` });
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Ошибка при отзыве документа.' });
    }
  };

  const handleUnrevoke = (doc: RegisteredDocument) => {
    if (!isAdmin) {
      if (onRequestAdminAuth) onRequestAdminAuth();
      return;
    }
    if (window.confirm(`Снять статус отзыва с документа № ${doc.regNumber} и восстановить его действие?`)) {
      unrevokeDocumentInDb(doc.id);
      const updated = getDocumentRegistry();
      setRegistryList(updated);
      const verdict = verifyRegistryIntegrity(updated);
      setChainStatus({ valid: verdict.valid, total: verdict.total, checked: true });
      setStatusMsg({ type: 'success', text: `Документ № ${doc.regNumber} восстановлен в Едином реестре.` });
    }
  };

  const handleExportCsv = () => {
    const rows = filteredDocs.map(doc => ({
      'Исходящий №': doc.regNumber,
      'Дата': doc.date,
      'Отдел': doc.deptName,
      'Код': doc.deptCode,
      'Составитель': doc.composerName,
      'Адресат': doc.recipientName,
      'Тема': doc.subject,
      'Ключ ЭП': doc.digitalSignatureKey || '',
      'Зарегистрировано': doc.registeredAt
    }));
    const headers = Object.keys(rows[0] || {});
    const escapeCsv = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = rows.map(r => headers.map(h => escapeCsv(r[h])).join(';'));
    const csv = '\uFEFF' + [headers.map(escapeCsv).join(';'), ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Реестр_исходящих_писем_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMsg({ type: 'success', text: `Экспортировано записей: ${rows.length}. Файл CSV сохранён в Загрузки.` });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    const rowsHtml = filteredDocs.map(doc => `
      <tr>
        <td>${doc.regNumber}</td>
        <td>${doc.date}</td>
        <td>${doc.deptName}</td>
        <td>${doc.composerName}</td>
        <td>${doc.recipientName}</td>
        <td>${doc.subject}</td>
      </tr>`).join('');
    printWindow.document.write(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Реестр исходящих писем</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
    h1 { font-size: 16px; text-align: center; margin-bottom: 4px; }
    .sub { text-align: center; font-size: 12px; color: #475569; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #94a3b8; padding: 5px 7px; text-align: left; vertical-align: top; }
    th { background: #e2e8f0; font-size: 10px; text-transform: uppercase; }
    .meta { font-size: 10px; color: #64748b; margin-top: 16px; text-align: right; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="position:fixed;top:12px;right:12px;padding:8px 16px;cursor:pointer;">Печать</button>
  <h1>Единый реестр исходящих писем</h1>
  <div class="sub">АО «НПО «Тепломаш» · Записей: ${filteredDocs.length}</div>
  <table>
    <thead><tr><th>№</th><th>Дата</th><th>Отдел</th><th>Составитель</th><th>Адресат</th><th>Тема</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="meta">Сформировано ${new Date().toLocaleString('ru-RU')}</div>
</body>
</html>`);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center font-bold text-indigo-300">
              <FileText className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight flex items-center gap-2">
                Реестр зарегистрированных исходящих писем
                <span className="text-[10px] bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 px-2 py-0.5 rounded-full font-medium">
                  {registryList.length} записей
                </span>
                <span
                  className="text-[10px] bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 px-2 py-0.5 rounded-full font-medium"
                  title="Сколько документов зарегистрировано сегодня"
                >
                  сегодня: {stats.today}
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Единая база исходящих документов АО «НПО «Тепломаш»
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Search Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по исходящему №, теме, составителю, адресату или ключу ЭП..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors flex items-center gap-1 ${
                    viewMode === 'list' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Список записей"
                >
                  <List className="w-3.5 h-3.5" />
                  Список
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('stats')}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors flex items-center gap-1 ${
                    viewMode === 'stats' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Статистика реестра (доступно только администратору)"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Статистика
                </button>
              </div>
            )}

            {(viewMode === 'list' || !isAdmin) && (
            <>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
              className="text-xs py-2 px-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
              title="Фильтр по дате документа"
            >
              <option value="all">Все даты</option>
              <option value="today">За сегодня</option>
              <option value="week">За 7 дней</option>
              <option value="month">За месяц</option>
            </select>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs py-2 px-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
              title="Фильтр по отделу"
            >
              <option value="all">Все отделы</option>
              {availableDepts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredDocs.length === 0}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Выгрузить отфильтрованный список в CSV (Excel)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={filteredDocs.length === 0}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Печать отфильтрованного реестра"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Печать</span>
            </button>

            {isAdmin ? (
              <button
                type="button"
                onClick={handleClearAll}
                disabled={registryList.length === 0}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Очистить весь реестр исходящих писем"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Очистить реестр</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRequestAdminAuth && onRequestAdminAuth()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-slate-500" />
                <span>Режим управления (Админ)</span>
              </button>
            )}
            </>
            )}
          </div>
        </div>

        {/* Status Notification */}
        {statusMsg && (
          <div className={`p-3 text-xs flex items-center justify-between shrink-0 border-b ${
            statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <span className="font-bold">{statusMsg.text}</span>
            <button onClick={() => setStatusMsg(null)} className="p-0.5 hover:opacity-75">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Hash-Chain Integrity Banner (tamper-evident реестр) */}
        {chainStatus.checked && (
          <div className={`p-3 text-xs flex items-center justify-between gap-3 shrink-0 border-b ${
            chainStatus.valid
              ? 'bg-emerald-50/70 text-emerald-800 border-emerald-100'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="w-4 h-4 shrink-0" />
              <span className="font-bold shrink-0">Целостность реестра:</span>
              {chainStatus.valid ? (
                <span className="flex items-center gap-1.5 font-semibold">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  цепочка не нарушена ({chainStatus.total} записей)
                </span>
              ) : (
                <span className="font-semibold">
                  НАРУШЕНА — записи изменялись в обход приложения!
                </span>
              )}
            </div>
            {!chainStatus.valid && isAdmin && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Перестроить хеш-цепочку реестра заново? Это подтвердит текущее состояние реестра как эталонное.')) {
                    const rebuilt = rechainRegistry(registryList);
                    localStorage.setItem('teplomash_registered_docs_registry_v3', JSON.stringify(rebuilt));
                    setRegistryList(getDocumentRegistry());
                    const verdict = verifyRegistryIntegrity(getDocumentRegistry());
                    setChainStatus({ valid: verdict.valid, total: verdict.total, checked: true });
                    setStatusMsg({ type: 'success', text: 'Хеш-цепочка реестра перестроена. Реестр снова эталонный.' });
                  }
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shrink-0"
              >
                Перестроить цепочку
              </button>
            )}
          </div>
        )}

        {/* Documents Registry List Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {viewMode === 'stats' && isAdmin ? (
            /* ================= STATS DASHBOARD ================= */
            <div className="space-y-4">
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-indigo-950 text-white rounded-xl p-4 shadow-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Всего документов</div>
                  <div className="text-3xl font-bold mt-1">{stats.total}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">В среднем в месяц</div>
                  <div className="text-3xl font-bold mt-1 text-slate-900">{stats.avgPerMonth}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Отделов</div>
                  <div className="text-3xl font-bold mt-1 text-slate-900">{stats.byDept.length}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Последняя регистрация</div>
                  <div className="text-sm font-bold mt-2 text-slate-900 leading-tight">{stats.lastRegisteredAt || '—'}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* По месяцам */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Динамика по месяцам (6 мес.)
                  </h4>
                  {stats.byMonth.every(m => m.count === 0) ? (
                    <p className="text-xs text-slate-400">Нет данных за последние 6 месяцев</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.byMonth.slice().reverse().map(m => {
                        const max = Math.max(1, ...stats.byMonth.map(x => x.count));
                        return (
                          <div key={m.key} className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-slate-500 w-16 shrink-0">{m.label}</span>
                            <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                              <div
                                className={`h-full rounded flex items-center justify-end pr-1.5 text-[10px] font-bold ${
                                  m.count > 0 ? 'bg-indigo-500 text-white' : 'bg-transparent'
                                }`}
                                style={{ width: `${Math.max(4, (m.count / max) * 100)}%` }}
                              >
                                {m.count > 0 ? m.count : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* По типам */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" /> По типам документов
                  </h4>
                  {stats.byType.length === 0 ? (
                    <p className="text-xs text-slate-400">Нет данных</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.byType.map(t => (
                        <div key={t.key} className="flex items-center justify-between py-1 px-2.5 bg-slate-50 rounded-lg">
                          <span className="text-xs font-semibold text-slate-700">{t.label}</span>
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{t.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* По отделам */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" /> По отделам
                  </h4>
                  {stats.byDept.length === 0 ? (
                    <p className="text-xs text-slate-400">Нет данных</p>
                  ) : (
                    <div className="space-y-1.5">
                      {stats.byDept.map(d => (
                        <div key={d.name} className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-600 flex-1 truncate">{d.name}</span>
                          <div className="w-28 h-3 bg-slate-100 rounded overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded"
                              style={{ width: `${(d.count / stats.byDept[0].count) * 100}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-700 w-6 text-right">{d.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Топ составителей */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-500" /> Топ составителей
                  </h4>
                  {stats.byComposer.length === 0 ? (
                    <p className="text-xs text-slate-400">Нет данных</p>
                  ) : (
                    <div className="space-y-1.5">
                      {stats.byComposer.map((c, i) => (
                        <div key={c.name + i} className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-[11px] text-slate-600 flex-1 truncate">{c.name}</span>
                          <span className="text-[11px] font-bold text-slate-700">{c.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-slate-400 font-medium">
                Статистика построена по всем записям реестра ({stats.total}). Динамика по месяцам — по дате документа.
              </div>
            </div>
          ) : registryList.length > 0 && (
            <div className="text-[10px] text-slate-400 font-medium pb-1">
              Показано: <strong className="text-slate-600">{filteredDocs.length}</strong> из {registryList.length}
              {periodFilter !== 'all' && <> за период «{periodFilter === 'today' ? 'сегодня' : periodFilter === 'week' ? '7 дней' : 'месяц'}»</>}
              {deptFilter !== 'all' && <> · отдел: {deptFilter}</>}
              {deptFilter !== 'all' && <> (фильтр: {deptFilter})</>}
            </div>
          )}
          {filteredDocs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <FileText className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-bold text-slate-700">Реестр писем пуст или совпадений не найдено</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                При публикации и отправке новых документов на бланке Тепломаш записи автоматически фиксируются здесь с их уникальными номерами.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-4 transition-all shadow-2xs hover:shadow-xs space-y-3"
                >
                  {editingDocId === doc.id && editingDocData ? (
                    /* Inline Edit Mode (Admin Only) */
                    <div className="bg-indigo-50/70 border border-indigo-200 rounded-lg p-3.5 space-y-3 text-xs">
                      <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                        <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Редактирование записи № {doc.regNumber}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-700">Исходящий номер:</label>
                          <input
                            type="text"
                            value={editingDocData.regNumber}
                            onChange={(e) => setEditingDocData({ ...editingDocData, regNumber: e.target.value })}
                            className="w-full text-xs p-2 rounded border border-slate-300 bg-white font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-700">Дата регистрации:</label>
                          <input
                            type="text"
                            value={editingDocData.date}
                            onChange={(e) => setEditingDocData({ ...editingDocData, date: e.target.value })}
                            className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-700">Составитель (Исполнитель):</label>
                          <input
                            type="text"
                            value={editingDocData.composerName}
                            onChange={(e) => setEditingDocData({ ...editingDocData, composerName: e.target.value })}
                            className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-700">Получатель (Адресат):</label>
                          <input
                            type="text"
                            value={editingDocData.recipientName}
                            onChange={(e) => setEditingDocData({ ...editingDocData, recipientName: e.target.value })}
                            className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-700">Тема документа:</label>
                        <input
                          type="text"
                          value={editingDocData.subject}
                          onChange={(e) => setEditingDocData({ ...editingDocData, subject: e.target.value })}
                          className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-200">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDocId(null);
                            setEditingDocData(null);
                          }}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded transition-colors"
                        >
                          Отмена
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded shadow-xs transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Сохранить
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${doc.isRevoked ? 'opacity-85' : ''}`}>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-1 font-mono font-bold text-xs rounded-md tracking-wider shadow-2xs ${
                            doc.isRevoked ? 'bg-rose-950 text-rose-200 line-through' : 'bg-indigo-950 text-indigo-100'
                          }`}>
                            № {doc.regNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            от {doc.date}г.
                          </span>
                          <span className="text-[11px] bg-indigo-50 text-indigo-800 font-semibold px-2 py-0.5 rounded border border-indigo-200">
                            {doc.deptName}
                          </span>
                          {doc.isRevoked && (
                            <span className="px-2 py-0.5 bg-rose-600 text-white font-extrabold text-[10px] rounded tracking-wide uppercase flex items-center gap-1">
                              <AlertOctagon className="w-3 h-3" />
                              ОТОЗВАНО
                            </span>
                          )}
                          {doc.correctionsCount && doc.correctionsCount > 0 && !doc.isRevoked && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold text-[10px] rounded" title={`Внесено заверенных правок: ${doc.correctionsCount}`}>
                              ПРАВКИ ({doc.correctionsCount})
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-900 font-bold">
                          <span className="text-slate-500 font-normal">Тема:</span> {doc.subject}
                        </div>

                        <div className="flex items-center gap-4 text-[11px] text-slate-600 flex-wrap">
                          <span>Составитель: <strong className="text-slate-800">{doc.composerName}</strong> ({doc.composerDept})</span>
                          <span>Адресат: <strong className="text-slate-800">{doc.recipientName}</strong></span>
                        </div>

                        {/* Revocation Details Info Box */}
                        {doc.isRevoked && (
                          <div className="p-2 bg-rose-50 border border-rose-200 rounded text-[10.5px] text-rose-950 space-y-0.5 mt-1">
                            <div>
                              <strong className="text-rose-800">Дата отзыва:</strong> {doc.revokedAt} | <strong className="text-rose-800">Кем:</strong> {doc.revokedBy || 'Администратор'}
                            </div>
                            {doc.revocationReason && (
                              <div>
                                <strong className="text-rose-800">Причина отзыва:</strong> {doc.revocationReason}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Correction summary info */}
                        {doc.lastCorrectionReason && !doc.isRevoked && (
                          <div className="p-2 bg-indigo-50/60 border border-indigo-200 rounded text-[10.5px] text-indigo-950 space-y-0.5 mt-1">
                            <div>
                              <strong className="text-indigo-900">Последние правки:</strong> {doc.lastCorrectedAt} (Заверено подписью)
                            </div>
                            <div className="text-slate-700">
                              <strong>Основание:</strong> {doc.lastCorrectionReason}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right side info & Actions */}
                      <div className="flex flex-col md:items-end gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                        {doc.digitalSignatureKey && (
                          <div className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-md font-mono text-[10px] font-bold text-indigo-950 shadow-2xs" title="Уникальный ключ электронной подписи документа">
                            <ShieldCheck className="w-3 h-3 inline mr-1 text-indigo-700" />
                            Ключ ЭП: <span className="text-indigo-700">{doc.digitalSignatureKey}</span>
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Зарегистрировано: {doc.registeredAt}</span>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1 flex-wrap justify-end">
                          {onOpenAsDraft && (
                            <button
                              type="button"
                              onClick={() => onOpenAsDraft(doc)}
                              className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-white hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 border border-slate-200 cursor-pointer"
                              title="Открыть копию как новый черновик (без изменения реестра)"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Черновик
                            </button>
                          )}

                          {/* Admin Only: Revocation / Unrevoke button */}
                          {isAdmin && (
                            <>
                              {!doc.isRevoked ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRevokeModal(doc)}
                                  className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Отозвать опубликованное письмо (только администратор)"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                                  Отозвать
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleUnrevoke(doc)}
                                  className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Восстановить отозванный документ"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                                  Восстановить
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDocId(doc.id);
                                  setEditingDocData({ ...doc });
                                }}
                                className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                title="Редактировать запись"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Изменить
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(doc.id, doc.regNumber)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Удалить из реестра"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revocation Modal */}
        <RevocationModal
          isOpen={isRevocationModalOpen}
          onClose={() => {
            setIsRevocationModalOpen(false);
            setRevokingDoc(null);
          }}
          document={revokingDoc}
          onConfirmRevoke={handleRevokeConfirm}
        />
      </div>
    </div>
  );
};

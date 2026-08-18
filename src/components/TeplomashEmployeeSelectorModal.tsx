import React, { useState, useRef } from 'react';
import { TEPLOMASH_EMPLOYEES, TeplomashEmployee, sanitizeEmployeeDepartments } from '../constants/teplomashEmployees';
import { DEPARTMENT_CODES } from '../constants/departmentCodes';
import { declineFio, declineJobPosition } from '../utils/declensionUtils';
import { 
  X, 
  Search, 
  UserCheck, 
  Send, 
  Building2, 
  Phone, 
  Mail, 
  Check, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  Database, 
  AlertCircle,
  Lock,
  Shield
} from 'lucide-react';

interface TeplomashEmployeeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: TeplomashEmployee[];
  onUpdateEmployees: (updated: TeplomashEmployee[]) => void;
  onSelectRecipient: (emp: TeplomashEmployee) => void;
  onSelectSender: (emp: TeplomashEmployee) => void;
  userRole?: 'admin' | 'user' | null;
  onRequestAdminAuth?: () => void;
}

export const TeplomashEmployeeSelectorModal: React.FC<TeplomashEmployeeSelectorModalProps> = ({
  isOpen,
  onClose,
  employees,
  onUpdateEmployees,
  onSelectRecipient,
  onSelectSender,
  userRole,
  onRequestAdminAuth
}) => {
  const [activeTab, setActiveTab] = useState<'select' | 'manage'>('select');
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [lastSelected, setLastSelected] = useState<{ id: string; target: 'recipient' | 'sender' } | null>(null);

  // Edit / Add modal state
  const [editingEmployee, setEditingEmployee] = useState<TeplomashEmployee | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Excel import status banner
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isAdmin = userRole === 'admin';

  const departments = ['ALL', ...Array.from(new Set(employees.map(e => e.department)))];

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
      emp.position.toLowerCase().includes(search.toLowerCase()) ||
      emp.shortName.toLowerCase().includes(search.toLowerCase()) ||
      emp.department.toLowerCase().includes(search.toLowerCase());

    const matchesDept = selectedDept === 'ALL' || emp.department === selectedDept;

    return matchesSearch && matchesDept;
  });

  const handleApplyRecipient = (emp: TeplomashEmployee) => {
    onSelectRecipient(emp);
    setLastSelected({ id: emp.id, target: 'recipient' });
    setTimeout(() => onClose(), 300);
  };

  const handleApplySender = (emp: TeplomashEmployee) => {
    onSelectSender(emp);
    setLastSelected({ id: emp.id, target: 'sender' });
    setTimeout(() => onClose(), 300);
  };

  // Helper to generate short initials (e.g. "Иванов И.И.") from full name
  const generateShortName = (fullName: string): string => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} ${parts[1][0]}.`;
    return `${parts[0]} ${parts[1][0]}.${parts[2][0]}.`;
  };

  // CRUD Handlers
  const handleOpenAdd = () => {
    setEditingEmployee({
      id: 'emp-' + Date.now(),
      fullName: '',
      shortName: '',
      dativeName: '',
      position: '',
      dativePosition: '',
      department: 'Отдел продаж',
      organization: 'АО «НПО «Тепломаш»',
      email: '',
      phone: ''
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (emp: TeplomashEmployee) => {
    setEditingEmployee({ ...emp });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Вы действительно хотите удалить сотрудника «${name}» из базы данных?`)) {
      const updated = employees.filter(e => e.id !== id);
      onUpdateEmployees(updated);
      try {
        localStorage.setItem('teplomash_employees_db', JSON.stringify(updated));
      } catch (e) { console.error(e); }
      setImportStatus({ type: 'success', message: `Сотрудник «${name}» успешно удален из базы.` });
    }
  };

  const handleClearDatabase = () => {
    if (window.confirm('Вы действительно хотите полностью очистить базу данных сотрудников? Все существующие записи будут удалены.')) {
      onUpdateEmployees([]);
      try {
        localStorage.setItem('teplomash_employees_db', JSON.stringify([]));
      } catch (e) { console.error(e); }
      setImportStatus({ type: 'success', message: 'База данных сотрудников полностью очищена.' });
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Восстановить эталонный справочник сотрудников Тепломаш по умолчанию?')) {
      const sanitizedDefaults = sanitizeEmployeeDepartments(TEPLOMASH_EMPLOYEES);
      onUpdateEmployees(sanitizedDefaults);
      try {
        localStorage.setItem('teplomash_employees_db', JSON.stringify(sanitizedDefaults));
      } catch (e) { console.error(e); }
      setImportStatus({ type: 'success', message: 'Справочник сотрудников Тепломаш успешно сброшен.' });
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    if (!editingEmployee.fullName.trim() || !editingEmployee.position.trim()) {
      setFormError('Пожалуйста, укажите ФИО и Должность сотрудника.');
      return;
    }

    let finalEmp = { ...editingEmployee };
    if (!finalEmp.shortName.trim()) {
      finalEmp.shortName = generateShortName(finalEmp.fullName);
    }
    if (!finalEmp.dativeName.trim()) {
      finalEmp.dativeName = finalEmp.shortName;
    }
    if (!finalEmp.dativePosition.trim()) {
      finalEmp.dativePosition = finalEmp.position;
    }

    const exists = employees.some(e => e.id === finalEmp.id);
    let updated: TeplomashEmployee[];
    if (exists) {
      updated = employees.map(e => e.id === finalEmp.id ? finalEmp : e);
    } else {
      updated = [finalEmp, ...employees];
    }

    onUpdateEmployees(sanitizeEmployeeDepartments(updated));
    setIsFormOpen(false);
    setEditingEmployee(null);
    setImportStatus({
      type: 'success',
      message: exists
        ? `Сотрудник «${finalEmp.shortName}» успешно обновлен.`
        : `Сотрудник «${finalEmp.shortName}» добавлен в базу.`
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center font-bold text-indigo-300">
              <Building2 className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight flex items-center gap-2">
                База данных сотрудников АО «НПО «Тепломаш»
                <span className="text-[10px] bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 px-2 py-0.5 rounded-full font-medium">
                  {employees.length} записей
                </span>
                {!isAdmin && (
                  <span className="text-[10px] bg-amber-500/30 border border-amber-400/40 text-amber-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-300" /> Только чтение
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {isAdmin 
                  ? 'Редактирование, добавление, импорт и экспорт справочника из Excel'
                  : 'Выбор сотрудников для подстановки в «Кому» и «Составитель»'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 pt-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('select')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-t border-x ${
                activeTab === 'select'
                  ? 'bg-white text-indigo-700 border-slate-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border-transparent'
              }`}
            >
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>Выбор для документа</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('manage')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-t border-x ${
                activeTab === 'manage'
                  ? 'bg-white text-indigo-700 border-slate-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border-transparent'
              }`}
            >
              <Database className="w-4 h-4 text-slate-600" />
              <span>
                {isAdmin ? `Управление базой (${employees.length})` : `База сотрудников (${employees.length})`}
              </span>
            </button>
          </div>

          <div className="pb-2 flex items-center gap-2">
            {isAdmin && (
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded flex items-center gap-1.5 border border-emerald-200">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Режим Администратора — Полный доступ</span>
              </span>
            )}
          </div>
        </div>

        {/* Import Status Banner */}
        {importStatus && (
          <div className={`p-3 text-xs flex items-center justify-between shrink-0 border-b ${
            importStatus.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{importStatus.message}</span>
            </div>
            <button 
              onClick={() => setImportStatus(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter Controls (Search & Dept & Add) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 gap-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по ФИО, должности или отделу..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 shrink-0">Отдел:</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs py-2 px-3 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
            >
              <option value="ALL">Все подразделения ({employees.length})</option>
              {departments.filter(d => d !== 'ALL').map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 shrink-0">
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs"
                  title="Добавить нового сотрудника в базу данных"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Добавить сотрудника</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          
          {/* TAB 1: SELECT FOR DOCUMENT */}
          {activeTab === 'select' && (
            <div className="space-y-3 divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                  <p className="text-xs font-medium">Сотрудники не найдены по данному запросу</p>
                </div>
              ) : (
                filteredEmployees.map(emp => {
                  const isJustAppliedRecipient = lastSelected?.id === emp.id && lastSelected.target === 'recipient';
                  const isJustAppliedSender = lastSelected?.id === emp.id && lastSelected.target === 'sender';

                  return (
                    <div
                      key={emp.id}
                      className="pt-3 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-3 group hover:bg-slate-50/80 p-2.5 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {emp.fullName}
                          </span>
                          {emp.department && (
                            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium border border-slate-200">
                              {emp.department}
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-medium text-slate-700">
                          {emp.position}
                        </div>

                        <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-0.5">
                          {emp.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {emp.email}
                            </span>
                          )}
                          {emp.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {emp.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleApplyRecipient(emp)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                            isJustAppliedRecipient
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                          }`}
                        >
                          {isJustAppliedRecipient ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Назначен «Кому»
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              Указать как Адресат («Кому»)
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApplySender(emp)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                            isJustAppliedSender
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-800 hover:bg-slate-900 text-white border-slate-800'
                          }`}
                        >
                          {isJustAppliedSender ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-300" />
                              Назначен «Подписантом»
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5 text-indigo-300" />
                              Указать как Составитель
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(emp.id, emp.shortName || emp.fullName)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 ml-1"
                          title="Удалить сотрудника из базы"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: DATABASE MANAGEMENT & TMDATA INTEGRATION */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              
              {/* Quick Actions Panel */}
              <div className="bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600" />
                    <span>Справочник сотрудников Тепломаш (синхронизация с tmdata/)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    База данных сотрудников загружается из каталога tmdata/ и обновляется автоматически.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-md transition-colors"
                    title="Восстановить эталонный список сотрудников Тепломаш"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                    Обновить из tmdata/
                  </button>

                  <button
                    type="button"
                    onClick={handleClearDatabase}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-md shadow-2xs transition-colors"
                    title="Полностью очистить базу данных сотрудников"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Очистить базу
                  </button>
                </div>
              </div>

              {/* Employee Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">ФИО полностью</th>
                        <th className="p-3">Инициалы</th>
                        <th className="p-3">Должность</th>
                        <th className="p-3">Отдел</th>
                        <th className="p-3">Контакты</th>
                        <th className="p-3 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            Сотрудники не найдены
                          </td>
                        </tr>
                      ) : (
                        filteredEmployees.map(emp => (
                          <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 font-semibold text-slate-900">
                              {emp.fullName}
                            </td>
                            <td className="p-3 text-slate-700">
                              {emp.shortName}
                            </td>
                            <td className="p-3 text-slate-700">
                              {emp.position}
                            </td>
                            <td className="p-3 text-slate-600">
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                                {emp.department}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500 text-[11px]">
                              <div>{emp.email}</div>
                              <div className="text-slate-400">{emp.phone}</div>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(emp)}
                                  className="p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors"
                                  title="Изменить сотрудника"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(emp.id, emp.shortName || emp.fullName)}
                                  className="p-1.5 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded transition-colors"
                                  title="Удалить сотрудника из базы"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div>
            База АО «НПО «Тепломаш»: <strong className="text-slate-800 font-semibold">{employees.length} сотрудников</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-md transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Modal for Add / Edit Employee */}
      {isFormOpen && editingEmployee && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                {employees.some(e => e.id === editingEmployee.id) ? 'Редактирование сотрудника' : 'Новый сотрудник'}
              </h4>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-4 space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ФИО полностью *</label>
                <input
                  type="text"
                  required
                  value={editingEmployee.fullName}
                  onChange={e => {
                    const fullName = e.target.value;
                    const autoShort = generateShortName(fullName);
                    const autoDative = declineFio(fullName, 'dative');
                    setEditingEmployee(prev => {
                      if (!prev) return null;
                      return {
                        ...prev,
                        fullName,
                        shortName: (!prev.shortName || prev.shortName === generateShortName(prev.fullName)) ? autoShort : prev.shortName,
                        dativeName: (!prev.dativeName || prev.dativeName === declineFio(prev.fullName, 'dative') || prev.dativeName === prev.shortName) ? autoDative : prev.dativeName
                      };
                    });
                  }}
                  placeholder="Например: Иванов Сергей Петрович"
                  className="w-full px-3 py-2 bg-white rounded border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Инициалы (ФИО кратко)</label>
                  <input
                    type="text"
                    value={editingEmployee.shortName}
                    onChange={e => setEditingEmployee({ ...editingEmployee, shortName: e.target.value })}
                    placeholder="С.П. Иванов"
                    className="w-full px-3 py-2 bg-white rounded border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ФИО в дательном падеже</label>
                  <input
                    type="text"
                    value={editingEmployee.dativeName}
                    onChange={e => setEditingEmployee({ ...editingEmployee, dativeName: e.target.value })}
                    placeholder="Иванову С. П."
                    className="w-full px-3 py-2 bg-white rounded border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Должность *</label>
                <input
                  type="text"
                  required
                  list="employee-position-presets"
                  value={editingEmployee.position}
                  onChange={e => {
                    const position = e.target.value;
                    const autoDativePos = declineJobPosition(position, 'dative');
                    setEditingEmployee(prev => {
                      if (!prev) return null;
                      return {
                        ...prev,
                        position,
                        dativePosition: (!prev.dativePosition || prev.dativePosition === declineJobPosition(prev.position, 'dative') || prev.dativePosition === prev.position) ? autoDativePos : prev.dativePosition
                      };
                    });
                  }}
                  placeholder="Например: Программист приложений"
                  className="w-full px-3 py-2 bg-white rounded border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <datalist id="employee-position-presets">
                  <option value="Программист приложений" />
                  <option value="Начальник отдела цифровых технологий и автоматизации" />
                  <option value="Инженер-программист" />
                  <option value="Ведущий программист" />
                  <option value="Начальник отдела" />
                  <option value="Главный инженер" />
                  <option value="Генеральный директор" />
                </datalist>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Должность в дательном падеже («Кому»)</label>
                <input
                  type="text"
                  value={editingEmployee.dativePosition}
                  onChange={e => setEditingEmployee({ ...editingEmployee, dativePosition: e.target.value })}
                  placeholder="Программисту приложений"
                  className="w-full px-3 py-2 bg-white rounded border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Отдел / Подразделение</label>
                  <input
                    type="text"
                    list="employee-dept-presets"
                    value={editingEmployee.department}
                    onChange={e => setEditingEmployee({ ...editingEmployee, department: e.target.value })}
                    placeholder="Отдел цифровых технологий и автоматизации"
                    className="w-full px-3 py-2 bg-white rounded border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <datalist id="employee-dept-presets">
                    {DEPARTMENT_CODES.map(d => (
                      <option key={d.code} value={d.name}>{`[${d.code}] ${d.name}`}</option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Организация</label>
                  <input
                    type="text"
                    value={editingEmployee.organization}
                    onChange={e => setEditingEmployee({ ...editingEmployee, organization: e.target.value })}
                    placeholder="АО «НПО «Тепломаш»"
                    className="w-full px-3 py-2 bg-white rounded border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingEmployee.email}
                    onChange={e => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                    placeholder="ivanov@teplomash.ru"
                    className="w-full px-3 py-2 bg-white rounded border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Телефон</label>
                  <input
                    type="text"
                    value={editingEmployee.phone}
                    onChange={e => setEditingEmployee({ ...editingEmployee, phone: e.target.value })}
                    placeholder="+7 (812) 301-99-40"
                    className="w-full px-3 py-2 bg-white rounded border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded shadow-2xs"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { 
  AlertOctagon, 
  X, 
  ShieldAlert, 
  Check, 
  FileText,
  User,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { RegisteredDocument } from '../types';

interface RevocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: RegisteredDocument | null;
  onConfirmRevoke: (docId: string, regNumber: string, reason: string, adminName: string) => void;
}

export const RevocationModal: React.FC<RevocationModalProps> = ({
  isOpen,
  onClose,
  document,
  onConfirmRevoke
}) => {
  const [reason, setReason] = useState('');
  const [adminName, setAdminName] = useState('Администратор (Смирнов А.В.)');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !document) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Укажите обязательную причину отзыва документа.');
      return;
    }
    if (reason.trim().length < 5) {
      setError('Причина отзыва должна содержать не менее 5 символов.');
      return;
    }
    setError(null);
    onConfirmRevoke(document.id, document.regNumber, reason.trim(), adminName.trim());
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-rose-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-rose-950 text-white px-5 py-4 flex items-center justify-between border-b border-rose-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 rounded-lg text-rose-300 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Отзыв исходящего документа</h3>
              <p className="text-xs text-rose-200">Операция доступна исключительно Администратору</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-rose-300 hover:text-white hover:bg-rose-900 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Target Document Card */}
          <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="px-2.5 py-0.5 bg-rose-900 text-rose-100 font-mono font-bold text-xs rounded">
                № {document.regNumber}
              </span>
              <span className="text-slate-600 font-medium">от {document.date}г.</span>
            </div>
            <div className="text-slate-900 font-bold text-xs">
              <span className="text-slate-500 font-normal">Тема: </span>
              {document.subject}
            </div>
            <div className="text-[11px] text-slate-600 flex items-center justify-between">
              <span>Составитель: <strong className="text-slate-800">{document.composerName}</strong></span>
              <span>Адресат: <strong className="text-slate-800">{document.recipientName}</strong></span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Внимание:</strong> При отзыве в Едином реестре делается официальная пометка «ОТОЗВАНО». 
              На бланке документа появится гербовый штамп об аннулировании с указанием даты, лица и причины отзыва.
            </div>
          </div>

          {/* Form Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Причина отзыва документа <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError(null);
                }}
                rows={3}
                placeholder="Например: В связи с аннулированием договора № 45/26 и изменением условий поставки..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none text-slate-900 resize-none bg-white"
              />
              <span className="text-[10px] text-slate-400">Обязательное основание для фиксации в журнале и на бланке</span>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                ФИО администратора (ответственное лицо) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Администратор (ФИО)"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none text-slate-900 bg-white"
              />
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] font-semibold">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>Отозвать письмо</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

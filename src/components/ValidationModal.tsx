import React from 'react';
import { ValidationError } from '../utils/validationUtils';
import { AlertTriangle, X, FileText, UserCheck, Users, ArrowRight } from 'lucide-react';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  errors: ValidationError[];
  actionName?: string;
  onFixField?: (field: ValidationError['field']) => void;
}

export const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  onClose,
  errors,
  actionName = 'выполнения действия',
  onFixField
}) => {
  if (!isOpen || errors.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-5 text-slate-900">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Заполните обязательные поля
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Обнаружены ошибки для {actionName}:
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error List */}
        <div className="space-y-2.5">
          {errors.map((err, idx) => {
            const getIcon = () => {
              if (err.field === 'content') return <FileText className="w-4 h-4 text-rose-600" />;
              if (err.field === 'sender') return <UserCheck className="w-4 h-4 text-rose-600" />;
              return <Users className="w-4 h-4 text-rose-600" />;
            };

            return (
              <div
                key={idx}
                className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-rose-100 rounded-lg shrink-0 mt-0.5">
                    {getIcon()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-rose-950">{err.title}</h4>
                    <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">{err.message}</p>
                  </div>
                </div>

                {onFixField && (
                  <button
                    type="button"
                    onClick={() => {
                      onFixField(err.field);
                      onClose();
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 rounded text-[11px] font-bold transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                  >
                    <span>Заполнить</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed">
          💡 <strong>Примечание:</strong> Письмо считается заполненным, если внесен текст обращения, указан составитель, а также указан конкретный адресат (или выбрана рассылка «Всем сотрудникам компании» / «Всем партнерам»).
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
          >
            Понятно, исправить
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  FileEdit, 
  X, 
  Check, 
  ShieldCheck, 
  AlertTriangle,
  PenTool,
  Sparkles
} from 'lucide-react';
import { DocumentData, DocumentCorrection, SignatureType } from '../types';

interface CorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentData: DocumentData;
  onConfirmCorrection: (correction: DocumentCorrection, updatedDoc: DocumentData) => void;
}

export const CorrectionModal: React.FC<CorrectionModalProps> = ({
  isOpen,
  onClose,
  documentData,
  onConfirmCorrection
}) => {
  const [reason, setReason] = useState('');
  const [changesSummary, setChangesSummary] = useState('');
  const [correctedBy, setCorrectedBy] = useState(documentData.signature.senderName || '');
  const [correctedByPosition, setCorrectedByPosition] = useState(
    documentData.signature.senderPosition || 'Ответственный исполнитель'
  );
  const [signatureType, setSignatureType] = useState<'existing' | 'digital' | 'manual'>('existing');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Укажите обязательную причину внесения правок в опубликованный документ.');
      return;
    }
    if (reason.trim().length < 5) {
      setError('Причина правок должна содержать подробное обоснование (от 5 символов).');
      return;
    }
    if (!correctedBy.trim()) {
      setError('Укажите ФИО лица, заверяющего исправления.');
      return;
    }

    const timestamp = new Date().toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    let effectiveSigType: SignatureType = documentData.signature.type;
    let sigImg: string | null = documentData.signature.imageUrl;
    let digitalKey: string | undefined = documentData.signature.digitalSignatureKey;

    if (signatureType === 'digital') {
      effectiveSigType = 'none';
      if (!digitalKey) {
        digitalKey = `CORR-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      }
    }

    const newCorrection: DocumentCorrection = {
      id: `corr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp,
      reason: reason.trim(),
      changesSummary: changesSummary.trim() || 'Внесены корректировки в текст/реквизиты документа',
      correctedBy: correctedBy.trim(),
      correctedByPosition: correctedByPosition.trim(),
      signatureType: effectiveSigType,
      signatureImageUrl: sigImg,
      digitalSignatureKey: digitalKey
    };

    const existingCorrections = documentData.corrections || [];
    const updatedDoc: DocumentData = {
      ...documentData,
      isPublished: true, // Remains published under the same registration number
      corrections: [...existingCorrections, newCorrection]
    };

    onConfirmCorrection(newCorrection, updatedDoc);
    setReason('');
    setChangesSummary('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-indigo-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-indigo-950 text-white px-5 py-4 flex items-center justify-between border-b border-indigo-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-300 border border-indigo-500/30">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Внесение заверенных правок</h3>
              <p className="text-xs text-indigo-200">Опубликованный документ № {documentData.refNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-indigo-300 hover:text-white hover:bg-indigo-900 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 space-y-1 text-slate-800">
            <div className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Регламент внесения исправлений в зарегистрированные письма</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Опубликованный документ сохраняет свой регистрационный номер. На бланке документа формируется 
              официальная отметка с причиной правок, датой и личной подписью лица, внесшего исправления.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Обязательная причина правок (основание) <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError(null);
                }}
                rows={3}
                placeholder="Например: Исправление технической опечатки в наименовании оборудования и спецификации..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900 resize-none bg-white font-normal"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Краткое описание сути исправлений
              </label>
              <input
                type="text"
                value={changesSummary}
                onChange={(e) => setChangesSummary(e.target.value)}
                placeholder="Например: Уточнен пункт 2.1, исправлена цена за единицу"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900 bg-white font-normal"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  ФИО заверителя (подпись) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={correctedBy}
                  onChange={(e) => setCorrectedBy(e.target.value)}
                  placeholder="Иванов И.И."
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900 bg-white font-normal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Должность заверителя
                </label>
                <input
                  type="text"
                  value={correctedByPosition}
                  onChange={(e) => setCorrectedByPosition(e.target.value)}
                  placeholder="Должность"
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900 bg-white font-normal"
                />
              </div>
            </div>

            {/* Signature Verification Type */}
            <div className="space-y-1.5 pt-1">
              <label className="block font-bold text-slate-800">
                Способ заверения подписью:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  signatureType === 'existing' 
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold' 
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 font-normal'
                }`}>
                  <input
                    type="radio"
                    name="sigType"
                    checked={signatureType === 'existing'}
                    onChange={() => setSignatureType('existing')}
                    className="accent-indigo-600"
                  />
                  <span>Текущая подпись автора</span>
                </label>

                <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  signatureType === 'digital' 
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold' 
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 font-normal'
                }`}>
                  <input
                    type="radio"
                    name="sigType"
                    checked={signatureType === 'digital'}
                    onChange={() => setSignatureType('digital')}
                    className="accent-indigo-600"
                  />
                  <span>Электронный штамп ЭП</span>
                </label>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] font-semibold">
              {error}
            </div>
          )}

          {/* Action Buttons */}
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Заверить и сохранить правки</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

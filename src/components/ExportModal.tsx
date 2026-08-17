import React, { useState } from 'react';
import { DocumentData } from '../types';
import { downloadDocumentAsEml } from '../utils/emlUtils';
import { downloadSvgFile } from '../utils/stampUtils';
import { 
  X, 
  Download, 
  Mail, 
  CheckCircle2, 
  AlertCircle,
  FileCheck2,
  Sparkles
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  docData: DocumentData;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, docData }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Export EML Email Package
  const handleExportEml = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setStatusMessage('Подготовка почтового сообщения .EML...');

      await downloadDocumentAsEml(docData);

      setStatusMessage('Письмо .EML успешно сформировано и загружено!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      console.error('Error generating EML email package:', err);
      setErrorMessage(err?.message || 'Ошибка при создании EML пакета.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Экспорт документа в .EML</h2>
              <p className="text-xs text-slate-300">Сохранение в формат почтового сообщения для Outlook / Thunderbird</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          
          {/* Main Document Summary Card */}
          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-lg p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Документ готов к отправке
              </div>
              <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
                {docData.docType || 'СЛУЖЕБНАЯ ЗАПИСКА'}
                {docData.docSubject ? `: ${docData.docSubject}` : ''}
              </div>
              <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-3">
                <span>Дата: <strong>{docData.date || 'Текущая'}</strong></span>
                <span>Исх. №: <strong>{docData.refNumber || 'без №'}</strong></span>
                <span>Получатель: <strong>{docData.recipient.name || docData.recipient.organization || 'Не указан'}</strong></span>
              </div>
            </div>
          </div>

          {/* Status and Error Messages */}
          {statusMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2.5 rounded-lg text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2.5 rounded-lg text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Info Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text.xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Экспорт почтового файла:</span>
            </div>
            <p className="text-xs text-slate-500">
              Файл .EML открывается в любом почтовом клиенте (Outlook, Thunderbird) как готовое черновик-сообщение с форматированным текстом документа, фирменной шапкой и печатью.
            </p>
          </div>
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Закрыть
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Download SVG Stamp/Header Button */}
            {(docData.header.imageUrl || docData.signature.stampImageUrl) && (
              <button
                type="button"
                onClick={() => {
                  if (docData.signature.stampImageUrl) {
                    downloadSvgFile(docData.signature.stampImageUrl, 'pechat-teplomash.svg');
                  }
                  if (docData.header.imageUrl && docData.header.imageUrl.includes('svg')) {
                    downloadSvgFile(docData.header.imageUrl, 'shapka-teplomash.svg');
                  }
                  setStatusMessage('Файлы .SVG успешно сохранены!');
                  setTimeout(() => setStatusMessage(null), 2500);
                }}
                disabled={isProcessing}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-300"
                title="Скачать элементы (шапку и печать) в векторе (.svg)"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Скачать .SVG</span>
              </button>
            )}

            {/* EML Button */}
            <button
              type="button"
              onClick={handleExportEml}
              disabled={isProcessing}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-xs"
            >
              <Mail className="w-4 h-4" />
              <span>{isProcessing ? 'Обработка...' : 'Экспорт в .EML'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

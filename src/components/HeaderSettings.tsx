import React, { useRef } from 'react';
import { HeaderConfig } from '../types';
import { SAMPLE_HEADERS } from '../constants/presets';
import { Upload, Image as ImageIcon, Trash2, AlignLeft, AlignCenter, AlignRight, Maximize2, Sparkles, AlertCircle, Shield, KeyRound, Lock, Download } from 'lucide-react';
import { downloadSvgFile } from '../utils/stampUtils';
import { PdfHeaderRenderer } from './PdfHeaderRenderer';

interface HeaderSettingsProps {
  header: HeaderConfig;
  onChange: (header: HeaderConfig) => void;
  userRole?: 'admin' | 'user' | null;
  onRequestAdminAuth?: () => void;
}

export const HeaderSettings: React.FC<HeaderSettingsProps> = ({ 
  header, 
  onChange,
  userRole,
  onRequestAdminAuth
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = userRole === 'admin';

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Размер картинки не должен превышать 5 МБ');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onChange({
            ...header,
            type: 'image',
            imageUrl: event.target.result as string
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    if (!isAdmin) return;
    onChange({
      ...header,
      imageUrl: null
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-slate-900 text-white border border-slate-700 rounded-xl p-5 text-xs leading-relaxed flex flex-col items-start gap-4 shadow-md">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-amber-300 uppercase tracking-wider block mb-1">
              Настройка шапки бланка недоступна
            </span>
            <p className="text-slate-300 text-[11.5px] leading-relaxed">
              Вам установлен официальный фирменный бланк АО «НПО «Тепломаш». Управление шапкой и логотипом доступно исключительно Администратору.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role Restriction Banner */}
      {!isAdmin ? (
        <div className="bg-slate-900 text-white border border-slate-700 rounded-xl p-4 text-xs leading-relaxed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-amber-300 uppercase tracking-wider block mb-0.5 flex items-center gap-1.5">
                Смена шапки бланка заблокирована
                <span className="text-[10px] bg-amber-500/20 border border-amber-400/40 text-amber-200 px-1.5 py-0.2 rounded font-normal">
                  Обычный пользователь
                </span>
              </span>
              <p className="text-slate-300 text-[11px]">
                Вам установлен официальный бланк АО «НПО «Тепломаш». Изменение логотипа и загрузка собственных шапок доступны только Администратору.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-xs text-amber-900 leading-relaxed flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-950 uppercase tracking-wider block mb-0.5 flex items-center gap-2">
              Фирменная шапка бланка (Режим Администратора)
              <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                Админ-доступ
              </span>
            </span>
            Загрузите изображение логотипа или готовой шапки вашей организации (PNG, JPG, SVG). Вы также можете настроить размеры и выравнивание.
          </div>
        </div>
      )}

      {/* Upload Zone */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Изображение шапки (Логотип / Бланк)</label>
        
        {header.imageUrl ? (
          <div className="relative border border-slate-200 rounded p-3 bg-slate-50 group hover:border-slate-300 transition-colors">
            <div className="h-28 flex items-center justify-center overflow-hidden rounded bg-white border border-slate-200 p-2">
              <PdfHeaderRenderer 
                url={header.imageUrl} 
                alt="Шапка бланка" 
                className="max-h-full max-w-full object-contain"
              />
            </div>
            
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Официальная шапка бланка установлена
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadSvgFile(header.imageUrl!, 'shapka-teplomash.svg')}
                  className="flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-semibold bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded transition-colors"
                  title="Скачать фирменный бланк шапки в векторе (.svg)"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  Скачать в .SVG
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 font-medium hover:bg-red-50 px-2 py-1 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Удалить шапку
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => {
              if (isAdmin) fileInputRef.current?.click();
              else if (onRequestAdminAuth) onRequestAdminAuth();
            }}
            className={`border-2 border-dashed rounded p-6 text-center group transition-all ${
              isAdmin 
                ? 'border-slate-300 hover:border-indigo-500 cursor-pointer bg-slate-50 hover:bg-indigo-50/20' 
                : 'border-slate-200 bg-slate-100/60 cursor-not-allowed'
            }`}
          >
            <div className="w-10 h-10 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {isAdmin ? 'Нажмите для загрузки картинки шапки' : 'Загрузка логотипа недоступна обычным пользователям'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {isAdmin ? 'Поддерживаются PDF, PNG, JPG, WebP, SVG (до 5 МБ)' : 'Для загрузки собственного бланка авторизуйтесь под администратором'}
            </p>
          </div>
        )}
        
        {isAdmin && (
          <input 
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.pdf"
            onChange={handleImageUpload}
            className="hidden"
          />
        )}
      </div>

      {/* Default Official Header Notice */}
      <div className="p-3 bg-slate-100/80 border border-slate-200 rounded text-xs text-slate-700 leading-relaxed">
        <p className="font-semibold text-slate-900 mb-0.5">Официальный фирменный бланк АО «НПО «Тепломаш»</p>
        <p className="text-[11px] text-slate-500">Установлен по умолчанию на документе согласно регламенту предприятия.</p>
      </div>

      {/* Header Dimensions & Alignment Controls (Editable only by Admin) */}
      {header.imageUrl && (
        <div className={`space-y-4 pt-4 border-t border-slate-200 ${!isAdmin ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Параметры отображения шапки</h4>
            {!isAdmin && (
              <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-500" /> Только чтение
              </span>
            )}
          </div>

          {/* Alignment */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">Выравнивание картинки</label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => onChange({ ...header, alignment: 'stretch' })}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  header.alignment === 'stretch'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                На ширину
              </button>
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => onChange({ ...header, alignment: 'left' })}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  header.alignment === 'left'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
                Слева
              </button>
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => onChange({ ...header, alignment: 'center' })}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  header.alignment === 'center'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
                По центру
              </button>
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => onChange({ ...header, alignment: 'right' })}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  header.alignment === 'right'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AlignRight className="w-3.5 h-3.5" />
                Справа
              </button>
            </div>
          </div>

          {/* Height Slider */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-700 mb-1">
              <span>Высота шапки</span>
              <span className="font-semibold">{header.height} px</span>
            </div>
            <input
              type="range"
              disabled={!isAdmin}
              min={60}
              max={280}
              step={5}
              value={header.height}
              onChange={(e) => onChange({ ...header, height: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Bottom Margin Slider */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-700 mb-1">
              <span>Отступ снизу от текста</span>
              <span className="font-semibold">{header.marginBottom} px</span>
            </div>
            <input
              type="range"
              disabled={!isAdmin}
              min={0}
              max={60}
              step={5}
              value={header.marginBottom}
              onChange={(e) => onChange({ ...header, marginBottom: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Divider Line */}
          <div className="flex items-center justify-between pt-1">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={header.showDividerLine}
                onChange={(e) => onChange({ ...header, showDividerLine: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              Добавить разделительную линию снизу
            </label>
            
            {header.showDividerLine && (
              <input
                type="color"
                disabled={!isAdmin}
                value={header.dividerColor}
                onChange={(e) => onChange({ ...header, dividerColor: e.target.value })}
                className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0.5"
                title="Цвет линии"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

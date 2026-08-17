import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Check, PenTool } from 'lucide-react';

interface SignatureCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string, title?: string) => void;
  defaultTitle?: string;
}

export const SignatureCanvasModal: React.FC<SignatureCanvasModalProps> = ({ isOpen, onClose, onSave, defaultTitle = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#1e3a8a'); // dark blue ink
  const [lineWidth, setLineWidth] = useState(2.5);
  const [isEmpty, setIsEmpty] = useState(true);
  const [signatureTitle, setSignatureTitle] = useState(defaultTitle);

  useEffect(() => {
    if (isOpen) {
      setSignatureTitle(defaultTitle || '');
      setTimeout(() => {
        clearCanvas();
      }, 50);
    }
  }, [isOpen, defaultTitle]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl, signatureTitle.trim() || undefined);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Нарисовать электронную подпись</h3>
              <p className="text-[11px] text-slate-500">Распишитесь мышью или пальцем на экране</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Название подписи для сохранения (необязательно)
            </label>
            <input
              type="text"
              value={signatureTitle}
              onChange={(e) => setSignatureTitle(e.target.value)}
              placeholder="Например: Личная подпись Д.С. Орлова"
              className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">Цвет чернил:</span>
              <button
                type="button"
                onClick={() => setColor('#1e3a8a')}
                className={`w-6 h-6 rounded-full bg-blue-900 border-2 ${color === '#1e3a8a' ? 'border-amber-400 scale-110' : 'border-transparent'}`}
                title="Темно-синие чернила"
              />
              <button
                type="button"
                onClick={() => setColor('#0f172a')}
                className={`w-6 h-6 rounded-full bg-slate-900 border-2 ${color === '#0f172a' ? 'border-amber-400 scale-110' : 'border-transparent'}`}
                title="Черные чернила"
              />
              <button
                type="button"
                onClick={() => setColor('#1d4ed8')}
                className={`w-6 h-6 rounded-full bg-blue-600 border-2 ${color === '#1d4ed8' ? 'border-amber-400 scale-110' : 'border-transparent'}`}
                title="Синяя паста"
              />
            </div>

            <button
              type="button"
              onClick={clearCanvas}
              className="flex items-center gap-1 text-slate-600 hover:text-slate-800 font-medium hover:bg-slate-100 px-2.5 py-1 rounded-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Очистить
            </button>
          </div>

          {/* Canvas Box */}
          <div className="relative border-2 border-slate-300 rounded-xl bg-slate-50/50 shadow-inner overflow-hidden cursor-crosshair">
            <canvas
              ref={canvasRef}
              width={460}
              height={180}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-[180px] touch-none bg-transparent"
            />

            {/* Baseline Guideline */}
            <div className="absolute left-6 right-6 bottom-8 border-b border-dashed border-slate-300 pointer-events-none flex items-center justify-between text-[10px] text-slate-300 uppercase tracking-widest px-2">
              <span>Линия подписи</span>
              <span>X</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={isEmpty}
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all ${
              isEmpty 
                ? 'bg-slate-300 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
            }`}
          >
            <Check className="w-4 h-4" />
            Сохранить подпись
          </button>
        </div>
      </div>
    </div>
  );
};

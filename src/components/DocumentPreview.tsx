import React from 'react';
import { DocumentData } from '../types';
import { generateDocumentNumber, guessDepartmentCode, getNextDepartmentSeq, getDocumentRegistry } from '../constants/departmentCodes';
import { sanitizeHtml } from '../utils/sanitizeUtils';
import { PdfHeaderRenderer } from './PdfHeaderRenderer';

interface DocumentPreviewProps {
  data: DocumentData;
  scale?: number; // Zoom level e.g. 1.0, 0.9, 1.1
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = React.memo(({ data, scale = 1.0 }) => {
  const { header, recipient, docType, docSubject, date, refNumber, inRefNumber, city, content, signature, fontFamily, fontSize, lineSpacing, margins } = data;

  // Determine effective outgoing registration number (saved or dynamically projected for draft)
  const deptCode = guessDepartmentCode(signature.senderDepartment, signature.senderPosition);
  const projectedSeq = getNextDepartmentSeq(deptCode);
  const computedNumber = generateDocumentNumber(date || new Date().toLocaleDateString('ru-RU'), projectedSeq, deptCode);
  const effectiveRefNumber = refNumber && refNumber.trim() ? refNumber.trim() : computedNumber;

  const cleanDate = (date || new Date().toLocaleDateString('ru-RU'))
    .trim()
    .replace(/г\.?$/i, '')
    .trim();

  // Check effective revocation status by either document state or matching registry record with same outgoing refNumber
  const registry = React.useMemo(() => {
    try {
      return getDocumentRegistry();
    } catch {
      return [];
    }
  }, [effectiveRefNumber, data.isRevoked, data.updatedAt]);

  const matchingRecord = React.useMemo(() => {
    if (!effectiveRefNumber) return undefined;
    const cleanNum = effectiveRefNumber.trim().toUpperCase();
    return registry.find(r => r.regNumber && r.regNumber.trim().toUpperCase() === cleanNum);
  }, [registry, effectiveRefNumber]);

  const isEffectivelyRevoked = Boolean(data.isRevoked || matchingRecord?.isRevoked);
  const effectiveRevokedAt = data.revokedAt || matchingRecord?.revokedAt || cleanDate;
  const effectiveRevokedBy = data.revokedBy || matchingRecord?.revokedBy || 'Администратор';
  const effectiveRevocationReason = data.revocationReason || matchingRecord?.revocationReason;

  // Compute font family CSS value
  const fontStyle = {
    fontFamily: fontFamily === 'Times New Roman' ? '"Times New Roman", Times, serif' : 
                fontFamily === 'Georgia' ? 'Georgia, serif' : 
                fontFamily === 'Arial' ? 'Arial, Helvetica, sans-serif' : 
                fontFamily === 'Calibri' ? 'Calibri, sans-serif' : 'Roboto, sans-serif',
    fontSize: `${fontSize}pt`,
    lineHeight: lineSpacing
  };

  // Header alignment classes
  const getHeaderAlignClass = () => {
    switch (header.alignment) {
      case 'left': return 'justify-start';
      case 'right': return 'justify-end';
      case 'center': return 'justify-center';
      case 'stretch': default: return 'w-full';
    }
  };

  return (
    <div className="flex justify-center w-full overflow-auto py-4 print:p-0 print:m-0 print:overflow-hidden bg-slate-100/70">
      {/* A4 Sheet Container */}
      <div
        id="document-a4-sheet"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          fontFamily: fontStyle.fontFamily,
          paddingTop: `${margins.top}mm`,
          paddingBottom: `${margins.bottom}mm`,
          paddingLeft: `${margins.left}mm`,
          paddingRight: `${margins.right}mm`
        }}
        className="w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-xl print:shadow-none print:w-[210mm] print:h-[297mm] print:m-0 rounded-xs transition-transform duration-150 relative flex flex-col justify-start box-border overflow-hidden"
      >
        {/* Diagonal Page Background Watermark when revoked */}
        {isEffectivelyRevoked && (
          <div 
            aria-hidden="true" 
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
          >
            <div className="transform -rotate-35 border-[6px] border-red-600/20 px-8 py-3 rounded text-center">
              <div className="text-red-600/20 text-5xl sm:text-6xl font-black tracking-[0.25em] uppercase font-mono">
                АННУЛИРОВАНО
              </div>
              <div className="text-red-600/25 text-xs font-bold tracking-widest mt-1">
                {effectiveRevokedAt} • {effectiveRevokedBy}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 relative z-10">
          {/* ================= 1. HEADER IMAGE (ONLY SHOWN FOR EXTERNAL ORGANIZATIONS) ================= */}
          {recipient.recipientType === 'external' && (
            <>
              {header.imageUrl ? (
                <div 
                  className="w-full flex" 
                  style={{ marginBottom: `${header.marginBottom}px` }}
                >
                  <div className={`flex ${getHeaderAlignClass()} w-full`}>
                    <PdfHeaderRenderer
                      url={header.imageUrl}
                      alt="Фирменный бланк организации"
                      className="w-full h-auto object-contain transition-all block"
                    />
                  </div>
                </div>
              ) : (
                <div 
                  style={{ marginBottom: `${header.marginBottom}px` }}
                  className="w-full border-b-2 border-slate-900 pb-3 mb-6 text-center"
                >
                  <h1 className="font-bold text-lg uppercase tracking-wider">ФИРМЕННЫЙ БЛАНК ОРГАНИЗАЦИИ</h1>
                  <p className="text-xs text-slate-500">Загрузите картинку шапки бланка в панели настроек</p>
                </div>
              )}

              {header.showDividerLine && (
                <div 
                  className="w-full my-3"
                  style={{ borderBottom: `1.5px solid ${header.dividerColor}` }}
                />
              )}
            </>
          )}

          {/* ================= 2. RECIPIENT BLOCK ("Кому") ================= */}
          <div className="flex justify-end w-full mb-6">
            <div className="w-[48%] text-right space-y-0.5 text-slate-900 leading-snug font-sans" style={{ fontSize: '11pt' }}>
              {recipient.position && (
                <div className="whitespace-pre-line font-normal">{recipient.position}</div>
              )}
              {recipient.organization && (
                <div className="font-semibold">{recipient.organization}</div>
              )}
              {recipient.name && (
                <div className="font-bold pt-0.5">{recipient.name}</div>
              )}
              {recipient.address && (
                <div className="text-slate-600 font-normal pt-0.5 text-[10.5pt]">{recipient.address}</div>
              )}
              {recipient.inn && (
                <div className="text-slate-500 font-normal text-[10pt]">{recipient.inn}</div>
              )}
            </div>
          </div>

          {/* ================= 3. DATE & REF NUMBER LINE (STRICT SANS-SERIF GOST STYLE) ================= */}
          <div className="flex items-end justify-between w-full border-b border-slate-300 pb-2 mb-6 text-xs text-slate-900 font-sans tracking-tight">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold flex-wrap">
                <span>Исх. № {effectiveRefNumber} от {cleanDate}г.</span>
                {isEffectivelyRevoked && (
                  <span className="px-2 py-0.5 bg-red-600 text-white font-bold text-[9pt] rounded tracking-wide uppercase">
                    ОТОЗВАНО / АННУЛИРОВАНО
                  </span>
                )}
                {data.corrections && data.corrections.length > 0 && !isEffectivelyRevoked && (
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold text-[8.5pt] rounded tracking-tight">
                    С ИСПРАВЛЕНИЯМИ ({data.corrections.length})
                  </span>
                )}
              </div>
              {inRefNumber && inRefNumber.trim() !== '' && (
                <div className="text-[11px] text-slate-600 font-normal">{inRefNumber}</div>
              )}
            </div>
            {city && (
              <div className="font-medium text-slate-800 text-xs">
                {city}
              </div>
            )}
          </div>

          {/* ================= RED CLERICAL STAMP: "АННУЛИРОВАНО (дата подпись)" ================= */}
          {isEffectivelyRevoked && (
            <div className="annulled-stamp-wrapper mb-6 flex justify-end w-full relative z-20 select-none">
              <div className="border-[3.5px] border-red-600 rounded-xs p-3 bg-red-50/95 text-red-600 font-sans shadow-md transform -rotate-3 hover:rotate-0 transition-transform duration-200 max-w-sm w-full relative overflow-hidden backdrop-blur-2xs">
                {/* Inner decorative double stamp frame */}
                <div className="border border-red-500 p-2.5 space-y-2">
                  {/* Main stamp header */}
                  <div className="text-center">
                    <div className="text-[17pt] font-black tracking-[0.22em] uppercase text-red-600 font-mono leading-none flex items-center justify-center gap-1.5">
                      <span className="text-[11pt]">★</span>
                      <span>АННУЛИРОВАНО</span>
                      <span className="text-[11pt]">★</span>
                    </div>
                    <div className="text-[7.5pt] uppercase tracking-widest text-red-700 font-bold mt-1">
                      АО «НПО «Тепломаш»
                    </div>
                  </div>

                  {/* Stamp separator line */}
                  <div className="h-[2px] bg-red-600 w-full" />

                  {/* Date and Signature: (дата подпись) */}
                  <div className="space-y-1.5 text-[8.5pt] text-red-800 font-semibold">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-950">Дата:</span>
                      <span className="font-mono font-bold text-red-600 border-b border-red-600 px-1 text-[9pt]">
                        {effectiveRevokedAt}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-1 pt-0.5">
                      <span className="font-bold text-red-950 shrink-0">Подпись:</span>
                      <span className="flex-1 border-b border-red-600 text-right font-serif italic text-[8.5pt] text-red-800 pr-1 truncate">
                        {effectiveRevokedBy ? `/${effectiveRevokedBy}/` : '___________'}
                      </span>
                    </div>

                    {effectiveRevocationReason && (
                      <div className="pt-1 border-t border-red-300 text-[7.5pt] text-red-900 leading-tight break-words">
                        <span className="font-bold">Основание: </span>
                        <span className="font-normal italic">{effectiveRevocationReason}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REVOCATION WATERMARK / OFFICIAL NOTICE BANNER */}
          {isEffectivelyRevoked && (
            <div className="mb-6 p-3 bg-red-50/90 border-2 border-red-600 rounded-sm text-red-950 font-sans text-[9pt] leading-tight space-y-1">
              <div className="font-extrabold uppercase text-[10pt] text-red-700 flex items-center gap-1.5">
                <span>⛔ ДОКУМЕНТ ОТОЗВАН И УТРАТИЛ ЮРИДИЧЕСКУЮ СИЛУ</span>
              </div>
              <div className="text-slate-800">
                <strong>Дата отзыва:</strong> {effectiveRevokedAt} | <strong>Отозвано:</strong> {effectiveRevokedBy}
              </div>
              {effectiveRevocationReason && (
                <div className="text-slate-900 pt-0.5">
                  <strong>Причина отзыва:</strong> {effectiveRevocationReason}
                </div>
              )}
            </div>
          )}

          {/* ================= 4. DOCUMENT TYPE & SUBJECT ("Тип (заголовок)") ================= */}
          <div className="text-center mb-8 space-y-1.5">
            <h2 className="font-bold uppercase tracking-widest text-slate-950" style={{ fontSize: `${fontSize + 3}pt` }}>
              {docType || 'ДОКУМЕНТ'}
            </h2>
            {docSubject && (
              <p className="font-semibold italic text-slate-800 max-w-xl mx-auto" style={{ fontSize: `${fontSize}pt` }}>
                {docSubject.startsWith('О ') || docSubject.startsWith('Об ') ? docSubject : `О ${docSubject}`}
              </p>
            )}
          </div>

          {/* ================= 5. MAIN CONTENT BODY ================= */}
          <div 
            className="w-full text-justify text-slate-900 leading-relaxed font-normal space-y-4 font-serif"
            style={{ 
              fontSize: `${fontSize}pt`,
              lineHeight: lineSpacing
            }}
          >
            {content ? (
              <div 
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
                className="[&_p]:mb-3 [&_p]:break-words [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-8 [&_ol]:list-decimal [&_ol]:pl-8 [&_strong]:font-bold"
              />
            ) : (
              <p className="italic text-slate-400">
                (Текст документа появится здесь по мере ввода в левой панели...)
              </p>
            )}
          </div>
        </div>

        {/* ================= 6. SENDER & SIGNATURE BLOCK ("Кто написал письмо") ================= */}
        <div className="signature-block mt-10 pt-4 border-t border-slate-200 w-full relative z-10 shrink-0 bg-transparent">
          <div className="flex items-center justify-between gap-4 w-full relative z-10">
            {/* Sender Title and Department */}
            <div className="w-[40%] text-left leading-snug" style={{ fontSize: `${fontSize - 1}pt` }}>
              <div className="font-medium text-slate-900">
                {signature.senderPosition}
                {signature.senderDepartment && !signature.senderPosition.toLowerCase().includes(signature.senderDepartment.toLowerCase()) && (
                  <span>, {signature.senderDepartment}</span>
                )}
              </div>
              {signature.senderOrganization && (
                <div className="text-slate-600 text-xs mt-0.5 font-normal">{signature.senderOrganization}</div>
              )}
            </div>

            {/* Signature Graphic / Digital Signature Stamp / Line */}
            <div className="w-[42%] flex items-center justify-center relative z-10 min-h-[60px] border-none bg-transparent shadow-none">
              {signature.useDigitalSignature ? (
                <div className="w-full border-2 border-[#1e3a8a] rounded-xs bg-[#f8fafc] p-2 font-sans text-slate-900 shadow-none text-[7.5pt] leading-tight select-none">
                  <div className="border-b-2 border-[#1e3a8a] pb-1 mb-1 font-bold flex items-center justify-center gap-1 text-[8pt] text-[#1e3a8a] tracking-tight">
                    <svg className="w-3.5 h-3.5 text-[#1e3a8a] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-5.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                    </svg>
                    <span className="uppercase font-extrabold tracking-tight">ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ</span>
                  </div>
                  <div className="space-y-0.5 font-sans text-[#0f172a] text-[7pt]">
                    <div className="flex items-start justify-start gap-1">
                      <span className="font-bold text-[#1e3a8a] shrink-0">Сертификат:</span>
                      <span className="font-mono font-semibold break-all">{signature.digitalSignatureKey || '4F8A-9C12-8B0E-3D77'}</span>
                    </div>
                    <div className="flex items-start justify-start gap-1">
                      <span className="font-bold text-[#1e3a8a] shrink-0">Владелец:</span>
                      <strong className="font-bold text-slate-950 uppercase">{signature.senderName || 'Сотрудник Тепломаш'}</strong>
                    </div>
                    <div className="flex items-start justify-start gap-1">
                      <span className="font-bold text-[#1e3a8a] shrink-0">Действителен:</span>
                      <span>с {cleanDate} по {(() => {
                        try {
                          const parts = cleanDate.split('.');
                          if (parts.length === 3) {
                            return `${parts[0]}.${parts[1]}.${parseInt(parts[2], 10) + 1}`;
                          }
                        } catch {}
                        return '13.08.2027';
                      })()}</span>
                    </div>
                  </div>
                </div>
              ) : signature.type === 'placeholder' || !signature.imageUrl ? (
                <div className="w-full border-b border-slate-900 text-center pb-1 text-[10px] leading-tight font-sans text-slate-400 select-none">
                  (подпись)
                </div>
              ) : (
                <img
                  src={signature.imageUrl}
                  alt="Подпись"
                  className="max-h-16 max-w-full object-contain mx-auto border-none bg-transparent shadow-none"
                />
              )}
            </div>

            {/* Sender Name */}
            <div className="w-[30%] text-right font-bold text-slate-900 relative z-10" style={{ fontSize: `${fontSize - 1}pt` }}>
              {signature.senderName || 'Ф.И.О.'}
            </div>
          </div>
        </div>

        {/* ================= 7. SIGNED CORRECTIONS BLOCK ("Исправление заверено") ================= */}
        {data.corrections && data.corrections.length > 0 && (
          <div className="corrections-block mt-4 pt-3 border-t-2 border-dashed border-indigo-300 w-full relative z-10 shrink-0 bg-indigo-50/40 p-3 rounded space-y-2">
            <div className="flex items-center justify-between text-indigo-950 font-bold text-[8.5pt] uppercase tracking-wide border-b border-indigo-200 pb-1">
              <span>Официальная отметка о внесенных исправлениях (заверено подписью)</span>
              <span className="font-mono text-[8pt] text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded">
                Записей: {data.corrections.length}
              </span>
            </div>

            <div className="space-y-2">
              {data.corrections.map((corr, idx) => (
                <div key={corr.id || idx} className="text-[8pt] font-sans text-slate-800 space-y-1 bg-white p-2 rounded border border-indigo-100 shadow-2xs">
                  <div className="flex items-center justify-between flex-wrap gap-1 text-[7.5pt] text-slate-500">
                    <span>Правка № {idx + 1} от <strong>{corr.timestamp}</strong></span>
                    <span className="text-indigo-700 font-medium">Заверил: {corr.correctedByPosition ? `${corr.correctedByPosition} ` : ''}{corr.correctedBy}</span>
                  </div>

                  <div className="text-slate-900">
                    <strong className="text-indigo-950">Причина правок:</strong> {corr.reason}
                  </div>

                  {corr.changesSummary && (
                    <div className="text-slate-600 text-[7.5pt]">
                      <strong>Суть исправлений:</strong> {corr.changesSummary}
                    </div>
                  )}

                  {/* Signature attestation line / key */}
                  <div className="pt-1 flex items-center justify-between border-t border-slate-100 text-[7pt]">
                    <div className="flex items-center gap-1 text-emerald-800 font-semibold">
                      <svg className="w-3 h-3 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Исправление заверено личной подписью: {corr.correctedBy}</span>
                    </div>

                    {corr.digitalSignatureKey ? (
                      <span className="font-mono text-indigo-700 font-semibold bg-indigo-50 px-1 rounded">
                        ЭП: {corr.digitalSignatureKey}
                      </span>
                    ) : corr.signatureImageUrl ? (
                      <img src={corr.signatureImageUrl} alt="Подпись" className="max-h-5 object-contain" />
                    ) : (
                      <span className="italic text-slate-400 font-serif">(подпись)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

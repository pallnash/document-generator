import React, { useMemo, useState, useEffect, useRef } from 'react';
import { DocumentData, DocumentAttachment } from '../types';
import { generateDocumentNumber, guessDepartmentCode, getNextDepartmentSeq, getDocumentRegistry } from '../constants/departmentCodes';
import { sanitizeHtml } from '../utils/sanitizeUtils';
import { PdfHeaderRenderer } from './PdfHeaderRenderer';
import { AlertTriangle, Plus, CheckCircle2, ChevronRight, FileText, Sparkles, Layers } from 'lucide-react';

interface DocumentPreviewProps {
  data: DocumentData;
  scale?: number; // Zoom level e.g. 1.0, 0.9, 1.1
  onUpdateDocData?: (updated: DocumentData) => void;
}

// Split HTML into structural blocks (<p>, <ul>, <ol>, <table>, etc.)
// For long paragraphs, splits them at sentence boundaries to prevent single-page overflow
function splitHtmlIntoAtomicBlocks(html: string): string[] {
  if (!html) return [];
  const cleaned = html.trim();
  if (!cleaned) return [];
  
  const blockRegex = /(<(p|ul|ol|table|blockquote|div)[^>]*>[\s\S]*?<\/\2>|<hr\s*\/?>)/gi;
  const matches = cleaned.match(blockRegex);
  const rawBlocks = (matches && matches.length > 0)
    ? matches
    : cleaned.split(/\n\n+/).filter(Boolean).map(p => `<p>${p}</p>`);

  const atomicBlocks: string[] = [];

  for (const block of rawBlocks) {
    // Preserve tables, lists, and short blocks without splitting
    if (block.startsWith('<table') || block.startsWith('<ul') || block.startsWith('<ol') || getPlainTextLength(block) < 400) {
      atomicBlocks.push(block);
      continue;
    }

    // Split long paragraphs at sentence boundaries (. ! ?)
    if (block.startsWith('<p') && block.endsWith('</p>')) {
      const inner = block.slice(block.indexOf('>') + 1, block.lastIndexOf('</p>'));
      const sentences = inner.split(/(?<=[.!?])\s+(?=[А-ЯA-Z0-9«"])/);
      
      if (sentences.length <= 1) {
        atomicBlocks.push(block);
        continue;
      }

      let currentChunk = '';
      for (const sent of sentences) {
        if ((currentChunk + ' ' + sent).length > 320 && currentChunk.length > 100) {
          atomicBlocks.push(`<p>${currentChunk.trim()}</p>`);
          currentChunk = sent;
        } else {
          currentChunk = currentChunk ? `${currentChunk} ${sent}` : sent;
        }
      }
      if (currentChunk.trim()) {
        atomicBlocks.push(`<p>${currentChunk.trim()}</p>`);
      }
    } else {
      atomicBlocks.push(block);
    }
  }

  return atomicBlocks;
}

// Strip HTML tags for character length estimation
function getPlainTextLength(html: string): number {
  return html.replace(/<[^>]*>/g, '').length;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = React.memo(({ data, scale = 1.0, onUpdateDocData }) => {
  const { 
    header, 
    recipient, 
    docType, 
    docSubject, 
    date, 
    refNumber, 
    inRefNumber, 
    city, 
    content, 
    signature, 
    fontFamily, 
    fontSize, 
    lineSpacing, 
    margins,
    allowMultiPage,
    showAttachmentsMark,
    attachmentsMarkText,
    attachments = []
  } = data;

  const firstPageRef = useRef<HTMLDivElement>(null);
  const [isDomOverflowing, setIsDomOverflowing] = useState(false);

  // Determine effective outgoing registration number
  const deptCode = guessDepartmentCode(signature.senderDepartment, signature.senderPosition);
  const projectedSeq = getNextDepartmentSeq(deptCode);
  const computedNumber = generateDocumentNumber(date || new Date().toLocaleDateString('ru-RU'), projectedSeq, deptCode);
  const effectiveRefNumber = data.isPublished && refNumber && refNumber.trim() 
    ? refNumber.trim() 
    : (refNumber && refNumber.trim() && refNumber !== '0508/1И' ? refNumber.trim() : computedNumber);

  const cleanDate = (date || new Date().toLocaleDateString('ru-RU'))
    .trim()
    .replace(/г\.?$/i, '')
    .trim();

  // Registry & Revocation status
  const registry = useMemo(() => {
    try {
      return getDocumentRegistry();
    } catch {
      return [];
    }
  }, [effectiveRefNumber, data.isRevoked, data.updatedAt]);

  const matchingRecord = useMemo(() => {
    if (!effectiveRefNumber) return undefined;
    const cleanNum = effectiveRefNumber.trim().toUpperCase();
    return registry.find(r => r.regNumber && r.regNumber.trim().toUpperCase() === cleanNum);
  }, [registry, effectiveRefNumber]);

  const isEffectivelyRevoked = Boolean(data.isRevoked || matchingRecord?.isRevoked);
  const effectiveRevokedAt = data.revokedAt || matchingRecord?.revokedAt || cleanDate;
  const effectiveRevokedBy = data.revokedBy || matchingRecord?.revokedBy || 'Администратор';
  const effectiveRevocationReason = data.revocationReason || matchingRecord?.revocationReason;

  // Font styling (ГОСТ Р 7.0.97-2025)
  const fontStyle = {
    fontFamily: fontFamily === 'PT Astra Serif' ? '"PT Astra Serif", "PT Serif", "Times New Roman", Times, serif' :
                fontFamily === 'PT Astra Sans' ? '"PT Astra Sans", "PT Sans", Arial, Helvetica, sans-serif' :
                fontFamily === 'Times New Roman' ? '"Times New Roman", Times, serif' : 
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

  // Content Blocks and Page Distribution
  const blocks = useMemo(() => splitHtmlIntoAtomicBlocks(content), [content]);

  // GOST Р 7.0.97-2025 vertical line and character density calculation
  // 14pt with 1.5 line spacing is ~7.4mm/line and ~75 chars/line.
  const fontRatio = 14 / (fontSize || 14);
  const spacingRatio = 1.5 / (lineSpacing || 1.5);
  const scaleFactor = Math.max(0.6, fontRatio * spacingRatio);

  // Single page capacity (Header + Recipient + Title/Subject + Body + Signature + Attachment Mark + 35mm bottom clearance)
  const singlePageBudget = Math.round(580 * scaleFactor);

  // Page 1 budget when multi-page (Header + Recipient + Title/Subject + Body + 35mm bottom clearance)
  const page1Budget = Math.round(850 * scaleFactor);

  // Intermediate page budget (Top page number + Body + 40mm bottom clearance so text doesn't touch the bottom)
  const pageNextBudget = Math.round(1400 * scaleFactor);

  // Last page budget with Signature + Attachment mark
  const pageLastBudget = Math.round(950 * scaleFactor);

  const totalContentChars = useMemo(() => getPlainTextLength(content), [content]);
  const isMultiPageNeeded = totalContentChars > singlePageBudget;
  const isEffectivelyMultiPage = allowMultiPage || isMultiPageNeeded;

  const estimatedPagesCount = useMemo(() => {
    if (totalContentChars <= singlePageBudget) return 1;
    const remaining = totalContentChars - page1Budget;
    return 1 + Math.max(1, Math.ceil(remaining / pageNextBudget));
  }, [totalContentChars, singlePageBudget, page1Budget, pageNextBudget]);

  const isEstimatedOverflow = estimatedPagesCount > 1 && !allowMultiPage;

  // DOM height overflow measurement
  useEffect(() => {
    const el = firstPageRef.current;
    if (!el) return;
    const scrollH = el.scrollHeight;
    const clientH = el.clientHeight;
    setIsDomOverflowing(scrollH > clientH + 15 || isEstimatedOverflow);
  }, [content, fontSize, lineSpacing, margins, header.height, isEstimatedOverflow]);

  // Paginate blocks cleanly according to GOST rules
  const pages = useMemo(() => {
    if (!isEffectivelyMultiPage || blocks.length <= 1) {
      return [blocks];
    }

    const rawPages: string[][] = [];
    let currentPageBlocks: string[] = [];
    let currentChars = 0;
    let isFirstPage = true;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const bLen = getPlainTextLength(block);
      const limit = isFirstPage ? page1Budget : pageNextBudget;

      if (currentPageBlocks.length > 0 && (currentChars + bLen > limit)) {
        rawPages.push(currentPageBlocks);
        currentPageBlocks = [block];
        currentChars = bLen;
        isFirstPage = false;
      } else {
        currentPageBlocks.push(block);
        currentChars += bLen;
      }
    }

    if (currentPageBlocks.length > 0) {
      rawPages.push(currentPageBlocks);
    }

    // GOST Rule: The signature block on the last page must NEVER be orphaned without text.
    // If the last page has less than 150 characters and there is a previous page with multiple blocks,
    // move the last block of the previous page to the last page.
    if (rawPages.length > 1) {
      const lastPageIdx = rawPages.length - 1;
      const lastPageChars = rawPages[lastPageIdx].reduce((sum, b) => sum + getPlainTextLength(b), 0);
      const prevPage = rawPages[lastPageIdx - 1];

      if (lastPageChars < 180 && prevPage.length > 1) {
        const movedBlock = prevPage.pop()!;
        rawPages[lastPageIdx].unshift(movedBlock);
      }
    }

    return rawPages.length > 0 ? rawPages : [[]];
  }, [blocks, isEffectivelyMultiPage, page1Budget, pageNextBudget]);

  // Formatted Attachment mark text (Реквизит 19 ГОСТ Р 7.0.97-2025)
  const computedAttachmentMark = useMemo(() => {
    if (!showAttachmentsMark && (!attachments || attachments.length === 0)) {
      return null;
    }
    if (attachmentsMarkText && attachmentsMarkText.trim()) {
      return attachmentsMarkText.trim();
    }
    if (!attachments || attachments.length === 0) {
      return 'Приложение: на 1 л. в 1 экз.';
    }
    if (attachments.length === 1) {
      const att = attachments[0];
      return `Приложение: ${att.title || 'по тексту'} на ${att.sheetsCount || 1} л. в ${att.copiesCount || 1} экз.`;
    }
    return (
      `Приложение: ` +
      attachments
        .map((att, idx) => `${idx + 1}. ${att.title || `Приложение № ${idx + 1}`} на ${att.sheetsCount || 1} л. в ${att.copiesCount || 1} экз.`)
        .join('\n            ')
    );
  }, [showAttachmentsMark, attachmentsMarkText, attachments]);

  const handleEnableMultiPage = () => {
    if (onUpdateDocData) {
      onUpdateDocData({
        ...data,
        allowMultiPage: true
      });
    }
  };

  const handleFitToOnePage = () => {
    if (onUpdateDocData) {
      onUpdateDocData({
        ...data,
        fontSize: 12,
        lineSpacing: 1.15,
        allowMultiPage: false
      });
    }
  };

  const handleResetToStandard14pt = () => {
    if (onUpdateDocData) {
      onUpdateDocData({
        ...data,
        fontSize: 14,
        lineSpacing: 1.5,
        allowMultiPage: true
      });
    }
  };

  const totalSheetsCount = pages.length + (attachments ? attachments.length : 0);

  return (
    <div className="flex flex-col items-center w-full overflow-auto py-4 print:p-0 print:m-0 print:overflow-hidden bg-slate-100/70">
      
      {/* ================= OVERFLOW WARNING ALERT BANNER ================= */}
      {(!allowMultiPage && (isDomOverflowing || isEstimatedOverflow)) && (
        <div className="no-print max-w-[210mm] w-full mb-4 mx-auto p-3.5 bg-amber-500/10 border-2 border-amber-500 rounded-xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-2.5">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-lg shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-xs uppercase tracking-wide text-amber-900 flex items-center gap-1.5">
                <span>Текст не помещается на 1 лист (при 14 кегле Times New Roman)</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed mt-0.5">
                Текст документа выходит за границы одного листа. Желаете уместить всё на одном листе (уменьшив кегль до 12 pt) или перенести на следующие страницы?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleFitToOnePage}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              title="Уменьшить кегль шрифта до 12 pt и интервал для вмещения на 1 листе"
            >
              <span>Уместить на 1 листе (12 pt)</span>
            </button>
            <button
              type="button"
              onClick={handleEnableMultiPage}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <span>Разрешить страницы (ГОСТ)</span>
            </button>
          </div>
        </div>
      )}

      {/* MULTI-PAGE BADGE / INDICATOR WHEN ENABLED */}
      {allowMultiPage && totalSheetsCount > 1 && (
        <div className="no-print max-w-[210mm] w-full mb-3 mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 px-1 font-sans">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold border border-indigo-200">
              Многостраничный документ: {pages.length} стр.{attachments && attachments.length > 0 ? ` + ${attachments.length} прилож.` : ''}
            </span>
            <span className="text-[11px] text-slate-400">ГОСТ Р 7.0.97-2025 • Нумерация со 2-й страницы</span>
          </div>

          <div className="flex items-center gap-2">
            {fontSize === 14 ? (
              <button
                type="button"
                onClick={handleFitToOnePage}
                className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded transition-colors flex items-center gap-1 cursor-pointer"
                title="Попробовать уместить текст на 1 листе, уменьшив кегль до 12 pt"
              >
                <span>Уместить на 1 листе (12 pt)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResetToStandard14pt}
                className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded transition-colors cursor-pointer"
              >
                <span>Вернуть 14 pt</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= PRINTABLE AREA CONTAINER ================= */}
      <div id="document-printable-area" className="flex flex-col items-center gap-6 print:gap-0 w-full">
        
        {/* ================= PAGE 1 (OFFICIAL LETTERHEAD) ================= */}
        <div
          id="document-a4-sheet"
          ref={firstPageRef}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            fontFamily: fontStyle.fontFamily,
            paddingTop: `${margins.top}mm`,
            paddingBottom: `${margins.bottom}mm`,
            paddingLeft: `${margins.left}mm`,
            paddingRight: `${margins.right}mm`
          }}
          className="a4-page w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-xl print:shadow-none print:w-[210mm] print:h-[297mm] print:m-0 rounded-xs transition-transform duration-150 relative flex flex-col justify-between box-border overflow-hidden"
        >
          {/* Diagonal Watermark when revoked */}
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

          {/* PAGE 1 CONTENT */}
          <div className="flex-1 relative z-10">
            {/* 1. HEADER (Only shown for external organizations) */}
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

            {/* 2. RECIPIENT BLOCK ("Кому") */}
            <div className="flex justify-end w-full mb-6">
              <div className="w-[48%] text-right space-y-0.5 text-slate-900 leading-snug font-sans" style={{ fontSize: '11pt' }}>
                {recipient.position && (
                  <div className="whitespace-pre-line font-normal">{recipient.position}</div>
                )}
                {recipient.organization && recipient.recipientType !== 'internal' && (
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

            {/* 3. DATE & REF NUMBER LINE */}
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

            {/* REVOCATION OFFICIAL NOTICE BANNER */}
            {isEffectivelyRevoked && (
              <div className="mb-6 p-3 bg-red-50/95 border-2 border-red-600 rounded-sm text-red-950 font-sans text-[9pt] leading-tight space-y-1">
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

            {/* 4. DOCUMENT TYPE & SUBJECT */}
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

            {/* 5. MAIN CONTENT BODY (PAGE 1) */}
            <div 
              className="w-full text-justify text-slate-900 leading-relaxed font-normal space-y-3 font-serif"
              style={{ 
                fontSize: `${fontSize}pt`,
                lineHeight: lineSpacing
              }}
            >
              {pages[0] && pages[0].length > 0 ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(pages[0].join('')) }}
                  className="[&_p]:mb-2.5 [&_p]:indent-[1.25cm] [&_p]:leading-relaxed [&_p]:text-justify [&_ul]:list-disc [&_ul]:pl-8 [&_ol]:list-decimal [&_ol]:pl-8 [&_strong]:font-bold [&_table]:indent-0"
                />
              ) : (
                <p className="italic text-slate-400 indent-[1.25cm]">
                  (Текст документа появится здесь по мере ввода в левой панели...)
                </p>
              )}
            </div>
          </div>

          {/* If Single Page: Attachment Mark & Signature are on Page 1 */}
          {pages.length === 1 && (
            <div className="w-full mt-6">
              {/* РЕКВИЗИТ 19: ОТМЕТКА О НАЛИЧИИ ПРИЛОЖЕНИЯ */}
              {computedAttachmentMark && (
                <div 
                  className="mb-4 text-slate-900 font-medium font-serif leading-relaxed text-justify whitespace-pre-line indent-[1.25cm]"
                  style={{ fontSize: `${fontSize}pt` }}
                >
                  {computedAttachmentMark}
                </div>
              )}

              {/* 6. SENDER & SIGNATURE BLOCK */}
              <div className="signature-block mt-6 pt-4 border-t border-slate-200 w-full relative z-10 shrink-0 bg-transparent">
                <div className="flex items-center justify-between gap-4 w-full relative z-10">
                  <div className="w-[40%] text-left leading-snug" style={{ fontSize: `${fontSize - 1}pt` }}>
                    <div className="font-medium text-slate-900 whitespace-pre-line">
                      {signature.senderPosition || 'Должность'}
                    </div>
                  </div>

                  <div className="w-[42%] flex items-center justify-center relative z-10 min-h-[60px] border-none bg-transparent shadow-none">
                    {signature.type === 'placeholder' || !signature.imageUrl ? (
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

                  <div className="w-[30%] text-right font-bold text-slate-900 relative z-10" style={{ fontSize: `${fontSize - 1}pt` }}>
                    {signature.senderName || 'Ф.И.О.'}
                  </div>
                </div>
              </div>

              {/* 7. SIGNED CORRECTIONS BLOCK */}
              {data.corrections && data.corrections.length > 0 && (
                <div className="corrections-block mt-4 pt-3 border-t-2 border-dashed border-indigo-300 w-full relative z-10 shrink-0 bg-indigo-50/40 p-3 rounded space-y-2">
                  <div className="flex items-center justify-between text-indigo-950 font-bold text-[8.5pt] uppercase tracking-wide border-b border-indigo-200 pb-1">
                    <span>Официальная отметка о внесенных исправлениях</span>
                    <span className="font-mono text-[8pt] text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded">
                      Записей: {data.corrections.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {data.corrections.map((corr, idx) => (
                      <div key={corr.id || idx} className="text-[8pt] font-sans text-slate-800 space-y-1 bg-white p-2 rounded border border-indigo-100 shadow-2xs">
                        <div className="flex items-center justify-between flex-wrap gap-1 text-[7.5pt] text-slate-500">
                          <span>Правка № {idx + 1} от <strong>{corr.timestamp}</strong></span>
                          <span className="text-indigo-700 font-medium">Заверил: {corr.correctedBy}</span>
                        </div>
                        <div className="text-slate-900">
                          <strong className="text-indigo-950">Причина правок:</strong> {corr.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================= CONTINUATION PAGES (PAGE 2, 3, etc.) ================= */}
        {isEffectivelyMultiPage && pages.length > 1 && pages.slice(1).map((pageBlocks, pageIdx) => {
          const pageNum = pageIdx + 2;
          const isLastTextPage = pageNum === pages.length;

          return (
            <div
              key={`doc-page-${pageNum}`}
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                fontFamily: fontStyle.fontFamily,
                paddingTop: `${margins.top}mm`,
                paddingBottom: `${margins.bottom}mm`,
                paddingLeft: `${margins.left}mm`,
                paddingRight: `${margins.right}mm`
              }}
              className="a4-page w-[210mm] min-h-[297mm] h-[297mm] max-h-[297mm] bg-white text-slate-900 shadow-xl print:shadow-none print:w-[210mm] print:h-[297mm] print:m-0 rounded-xs transition-transform duration-150 relative flex flex-col justify-between box-border overflow-hidden"
            >
              {/* Top Center Page Number per GOST (e.g. "2", "3" or "- 2 -") */}
              <div className="text-center font-serif text-slate-800 pt-0 pb-4 font-bold select-none tracking-widest text-[11pt]">
                - {pageNum} -
              </div>

              {/* Page Body Text */}
              <div 
                className="flex-1 w-full text-justify text-slate-900 leading-relaxed font-normal space-y-3 font-serif"
                style={{ 
                  fontSize: `${fontSize}pt`,
                  lineHeight: lineSpacing
                }}
              >
                <div 
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(pageBlocks.join('')) }}
                  className="[&_p]:mb-2.5 [&_p]:indent-[1.25cm] [&_p]:leading-relaxed [&_p]:text-justify [&_ul]:list-disc [&_ul]:pl-8 [&_ol]:list-decimal [&_ol]:pl-8 [&_strong]:font-bold [&_table]:indent-0"
                />
              </div>

              {/* Last Page: Attachment Mark and Signature Block */}
              {isLastTextPage && (
                <div className="w-full mt-6">
                  {/* РЕКВИЗИТ 19: ОТМЕТКА О НАЛИЧИИ ПРИЛОЖЕНИЯ */}
                  {computedAttachmentMark && (
                    <div 
                      className="mb-4 text-slate-900 font-medium font-serif leading-relaxed text-justify whitespace-pre-line indent-[1.25cm]"
                      style={{ fontSize: `${fontSize}pt` }}
                    >
                      {computedAttachmentMark}
                    </div>
                  )}

                  {/* SENDER & SIGNATURE BLOCK */}
                  <div className="signature-block mt-6 pt-4 border-t border-slate-200 w-full relative z-10 shrink-0 bg-transparent">
                    <div className="flex items-center justify-between gap-4 w-full relative z-10">
                      <div className="w-[40%] text-left leading-snug" style={{ fontSize: `${fontSize - 1}pt` }}>
                        <div className="font-medium text-slate-900 whitespace-pre-line">
                          {signature.senderPosition || 'Должность'}
                        </div>
                      </div>

                      <div className="w-[42%] flex items-center justify-center relative z-10 min-h-[60px] border-none bg-transparent shadow-none">
                        {signature.type === 'placeholder' || !signature.imageUrl ? (
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

                      <div className="w-[30%] text-right font-bold text-slate-900 relative z-10" style={{ fontSize: `${fontSize - 1}pt` }}>
                        {signature.senderName || 'Ф.И.О.'}
                      </div>
                    </div>
                  </div>

                  {/* SIGNED CORRECTIONS BLOCK */}
                  {data.corrections && data.corrections.length > 0 && (
                    <div className="corrections-block mt-4 pt-3 border-t-2 border-dashed border-indigo-300 w-full relative z-10 shrink-0 bg-indigo-50/40 p-3 rounded space-y-2">
                      <div className="flex items-center justify-between text-indigo-950 font-bold text-[8.5pt] uppercase tracking-wide border-b border-indigo-200 pb-1">
                        <span>Официальная отметка о внесенных исправлениях</span>
                      </div>
                      <div className="space-y-2">
                        {data.corrections.map((corr, idx) => (
                          <div key={corr.id || idx} className="text-[8pt] font-sans text-slate-800 space-y-1 bg-white p-2 rounded border border-indigo-100 shadow-2xs">
                            <div className="flex items-center justify-between flex-wrap gap-1 text-[7.5pt] text-slate-500">
                              <span>Правка № {idx + 1} от <strong>{corr.timestamp}</strong></span>
                              <span className="text-indigo-700 font-medium">Заверил: {corr.correctedBy}</span>
                            </div>
                            <div className="text-slate-900">
                              <strong className="text-indigo-950">Причина правок:</strong> {corr.reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* ================= ATTACHMENT SHEETS (ЛИСТЫ ПРИЛОЖЕНИЙ) ================= */}
        {attachments && attachments.length > 0 && attachments.map((att, attIdx) => {
          return (
            <div
              key={att.id || `att-${attIdx}`}
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                fontFamily: fontStyle.fontFamily,
                paddingTop: `${margins.top}mm`,
                paddingBottom: `${margins.bottom}mm`,
                paddingLeft: `${margins.left}mm`,
                paddingRight: `${margins.right}mm`
              }}
              className="a4-page w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-xl print:shadow-none print:w-[210mm] print:h-[297mm] print:m-0 rounded-xs transition-transform duration-150 relative flex flex-col justify-between box-border overflow-hidden"
            >
              <div>
                {/* Official Attachment Header (Top Right Stamp) per GOST Р 7.0.97 */}
                <div className="flex justify-end w-full mb-6">
                  <div className="text-right text-xs leading-snug font-sans text-slate-800 space-y-0.5 max-w-xs">
                    <div className="font-bold">Приложение № {att.number || attIdx + 1}</div>
                    <div className="text-slate-600">к письму АО «НПО «Тепломаш»</div>
                    <div className="text-slate-600">от {cleanDate}г. № {effectiveRefNumber}</div>
                  </div>
                </div>

                {/* Centered Attachment Title */}
                <div className="text-center mb-6 space-y-1">
                  <h3 className="font-bold uppercase tracking-wider text-slate-950 font-serif" style={{ fontSize: `${fontSize + 1}pt` }}>
                    {att.title || `ПРИЛОЖЕНИЕ № ${att.number || attIdx + 1}`}
                  </h3>
                  {att.sheetsCount && (
                    <p className="text-xs text-slate-500 italic font-sans">
                      (на {att.sheetsCount} л.{att.copiesCount ? `, в ${att.copiesCount} экз.` : ''})
                    </p>
                  )}
                </div>

                {/* Attachment Body / Content */}
                <div 
                  className="w-full text-justify text-slate-900 leading-relaxed font-serif space-y-3"
                  style={{ 
                    fontSize: `${fontSize}pt`,
                    lineHeight: lineSpacing
                  }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(att.content) }}
                />
              </div>

              {/* Bottom footer sheet note */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[9pt] text-slate-400 font-sans select-none">
                <span>АО «НПО «Тепломаш»</span>
                <span>Лист приложения {att.number || attIdx + 1}</span>
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
});

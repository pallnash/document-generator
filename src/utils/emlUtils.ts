import { DocumentData } from '../types';
import { TEPLOMASH_EMPLOYEES, TeplomashEmployee } from '../constants/teplomashEmployees';
import { sanitizeHtml } from './sanitizeUtils';

const transliterateToLatin = (str: string): string => {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
    з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
    п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
    ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
  };
  return str
    .toLowerCase()
    .split('')
    .map(ch => map[ch] || ch)
    .join('')
    .replace(/[^a-z0-9]/g, '');
};

/**
 * Resolves an email address for a recipient or sender.
 * Uses explicitEmail if provided, otherwise matches by name/surname in employee database,
 * or transliterates surname, or falls back to standard domain address.
 */
export const resolveEmployeeEmail = (
  nameStr: string,
  explicitEmail?: string,
  fallbackDefault: string = 'info@teplomash.ru'
): string => {
  if (explicitEmail && explicitEmail.trim() && explicitEmail.includes('@')) {
    return explicitEmail.trim();
  }

  if (!nameStr) return fallbackDefault;

  // 1. Try to load database from localStorage or TEPLOMASH_EMPLOYEES
  let employees: TeplomashEmployee[] = TEPLOMASH_EMPLOYEES;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('teplomash_employees_db');
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          employees = parsed;
        }
      }
    } catch {
      // fallback to TEPLOMASH_EMPLOYEES
    }
  }

  const cleanQuery = nameStr.toLowerCase().trim();

  // 2. Direct match in database
  for (const emp of employees) {
    if (!emp.email) continue;

    const fn = (emp.fullName || '').toLowerCase();
    const sn = (emp.shortName || '').toLowerCase();
    const dn = (emp.dativeName || '').toLowerCase();

    if (
      (cleanQuery && sn && (cleanQuery.includes(sn) || sn.includes(cleanQuery))) ||
      (cleanQuery && dn && (cleanQuery.includes(dn) || dn.includes(cleanQuery))) ||
      (cleanQuery && fn && (cleanQuery.includes(fn) || fn.includes(cleanQuery)))
    ) {
      return emp.email;
    }
  }

  // 3. Match surname tokens (e.g., "Кузнецов", "Кузнецову", "Романов", "Романову")
  const words = cleanQuery
    .replace(/[.,()]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3);

  for (const word of words) {
    // Cut common Russian dative/genitive noun endings (ову, еву, ину, ова, ева, ина) to find base stem
    const stem = word.replace(/(ову|еву|ину|ова|ева|ина|ом|ем|ам|ям|а|у|е|и|ы)$/i, '');

    if (stem.length >= 3) {
      for (const emp of employees) {
        if (!emp.email) continue;
        const empFull = (emp.fullName || '').toLowerCase();
        const empShort = (emp.shortName || '').toLowerCase();

        if (empFull.includes(stem) || empShort.includes(stem)) {
          return emp.email;
        }
      }
    }
  }

  // 4. Fallback: transliterate surname if possible or return default
  if (words.length > 0) {
    const mainWord = words[0].replace(/(ову|еву|ину|ова|ева|ина|ом|ем|ам|ям|а|у|е|и|ы)$/i, '');
    if (mainWord.length >= 3) {
      const latinSurname = transliterateToLatin(mainWord);
      if (latinSurname) {
        return `${latinSurname}@teplomash.ru`;
      }
    }
  }

  return fallbackDefault;
};

/**
 * Escapes HTML characters for safe string rendering in templates
 */
const escapeHtml = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Helper interface for embedded MIME images
 */
export interface MimeImageAttachment {
  cid: string;
  filename: string;
  mimeType: string;
  base64Data: string;
}

/**
 * Converts any image input (SVG data URL, PNG/JPEG data URL, Blob URL, or HTTP URL)
 * into a clean PNG Base64 string for Outlook MIME embedding.
 */
export const convertImageUrlToPngBase64 = (
  imageUrl: string | null | undefined,
  targetWidth = 600,
  targetHeight = 150
): Promise<{ base64: string; mimeType: string } | null> => {
  return new Promise((resolve) => {
    if (!imageUrl) return resolve(null);

    // If already PNG or JPEG data URL
    if (imageUrl.startsWith('data:image/png;base64,') || imageUrl.startsWith('data:image/jpeg;base64,')) {
      const mimeType = imageUrl.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';
      const base64 = imageUrl.split(',')[1];
      if (base64 && base64.length > 20) {
        return resolve({ base64, mimeType });
      }
    }

    // Handle SVG Data URLs or external URLs safely
    let src = imageUrl;
    let createdBlobUrl = false;

    if (imageUrl.startsWith('data:image/svg+xml')) {
      let svgText = '';
      if (imageUrl.includes(';base64,')) {
        try {
          const base64Str = imageUrl.split(';base64,')[1];
          svgText = atob(base64Str);
        } catch (e) {
          svgText = '';
        }
      } else {
        const commaIdx = imageUrl.indexOf(',');
        const rawContent = commaIdx !== -1 ? imageUrl.slice(commaIdx + 1) : imageUrl;
        try {
          svgText = decodeURIComponent(rawContent);
        } catch (e) {
          // If decodeURIComponent throws due to raw '%' or malformed sequence, fallback to raw string
          svgText = rawContent;
        }
      }

      if (svgText) {
        try {
          const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
          src = URL.createObjectURL(blob);
          createdBlobUrl = true;
        } catch (e) {
          console.warn('Failed to create Blob for SVG:', e);
        }
      }
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    let resolved = false;

    const cleanup = () => {
      if (createdBlobUrl && src.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(src);
        } catch (e) {
          // ignore
        }
      }
    };

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(null);
      }
    }, 4000);

    img.onload = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        const w = img.naturalWidth || img.width || targetWidth;
        const h = img.naturalHeight || img.height || targetHeight;
        
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          return resolve(null);
        }

        ctx.drawImage(img, 0, 0, w, h);
        const pngDataUrl = canvas.toDataURL('image/png');
        const base64 = pngDataUrl.split(',')[1];
        cleanup();
        
        if (base64 && base64.length > 20) {
          resolve({ base64, mimeType: 'image/png' });
        } else {
          resolve(null);
        }
      } catch (err) {
        console.warn('Canvas export error for EML conversion:', err);
        cleanup();
        resolve(null);
      }
    };

    img.onerror = (err) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      console.warn('Image loading error for EML conversion:', err);
      cleanup();
      resolve(null);
    };

    img.src = src;
  });
};

/**
 * Builds a bulletproof HTML email body compatible with Microsoft Outlook 2013+ (Word rendering engine)
 * using cid: image references for embedded MIME attachments.
 */
export const buildEmailHtmlWithCids = (
  data: DocumentData,
  attachments: {
    headerCid?: string;
    signatureCid?: string;
    stampCid?: string;
  }
): string => {
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
    lineSpacing 
  } = data;

  const fontCss = 
    fontFamily === 'Times New Roman' ? "'Times New Roman', Times, serif" : 
    fontFamily === 'Georgia' ? "Georgia, serif" : 
    fontFamily === 'Calibri' ? "Calibri, Arial, sans-serif" : "Arial, Helvetica, sans-serif";

  // Format paragraph lines (sanitized: контент письма — недоверенный ввод)
  let formattedContent = sanitizeHtml(content) || '<p>Текст обращения...</p>';
  if (!formattedContent.includes('<p>') && !formattedContent.includes('<div')) {
    formattedContent = formattedContent
      .split('\n')
      .filter(paragraph => paragraph.trim().length > 0)
      .map(paragraph => `<p style="margin: 0 0 12px 0;">${escapeHtml(paragraph)}</p>`)
      .join('');
  }

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="ru">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(docType)} - ${escapeHtml(docSubject)}</title>
<!--[if mso]>
<style type="text/css">
  table {border-collapse: collapse !important; mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important;}
  td {font-family: Arial, sans-serif !important;}
</style>
<![endif]-->
<style type="text/css">
  body { margin: 0; padding: 0; background-color: #f1f5f9; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table { border-spacing: 0; border-collapse: collapse; }
  td { padding: 0; }
  img { border: 0; outline: none; text-decoration: none; }
  .doc-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9pt; }
  .doc-table th, .doc-table td { border: 1px solid #334155; padding: 5px 6px; }
  .doc-table th { background-color: #f1f5f9; font-weight: bold; }
</style>
</head>
<body style="margin: 0; padding: 20px 0; background-color: #f1f5f9;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center">
        <!--[if mso]>
        <table width="680" align="center" border="0" cellspacing="0" cellpadding="0"><tr><td>
        <![endif]-->
        <table width="680" border="0" cellpadding="0" cellspacing="0" style="max-width: 680px; width: 100%; background-color: #ffffff; border: 1px solid #cbd5e1; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding: 36px 44px; font-family: ${fontCss}; color: #0f172a;">
              
              <!-- OFFICIAL LETTERHEAD HEADER -->
              ${attachments.headerCid ? `
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                  <tr>
                    <td align="center">
                      <img src="cid:${attachments.headerCid}" alt="Бланк организации" width="600" style="max-width: 100%; height: auto; display: block; border: 0;" />
                    </td>
                  </tr>
                </table>
              ` : `
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px;">
                  <tr>
                    <td align="center">
                      <div style="font-family: 'Times New Roman', Times, serif; font-size: 13pt; font-weight: bold; text-transform: uppercase; color: #0f172a; letter-spacing: 1px;">
                        АКЦИОНЕРНОЕ ОБЩЕСТВО «НПО «ТЕПЛОМАШ»
                      </div>
                      <div style="font-family: Arial, sans-serif; font-size: 8pt; color: #475569; margin-top: 4px; line-height: 1.35;">
                        «Тепломаш» ИНН 7806112986, КПП 780601001, ОГРН 1027809212573 | р/с 40702810055130177203 в Северо-Западном Банке ПАО «Сбербанк»
                        <br />
                        Адрес: 195279, г. Санкт-Петербург, шоссе Революции, д. 90, л. А | тел.: +7 (812) 301-99-40 | root@teplomash.ru
                      </div>
                    </td>
                  </tr>
                </table>
              `}

              ${header.showDividerLine ? `
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                  <tr>
                    <td style="border-bottom: 1.5px solid ${header.dividerColor || '#1e293b'}; height: 1px; font-size: 1px; line-height: 1px;">&nbsp;</td>
                  </tr>
                </table>
              ` : ''}

              <!-- RECIPIENT BLOCK -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="46%">&nbsp;</td>
                  <td width="54%" align="left" style="font-family: ${fontCss}; font-size: ${fontSize - 1}pt; line-height: 1.35; color: #0f172a;">
                    ${recipient.position ? `<div style="white-space: pre-line;">${escapeHtml(recipient.position)}</div>` : ''}
                    ${recipient.organization ? `<div style="font-weight: bold; margin-top: 3px;">${escapeHtml(recipient.organization)}</div>` : ''}
                    ${recipient.name ? `<div style="font-weight: bold; margin-top: 3px; color: #020617;">${escapeHtml(recipient.name)}</div>` : ''}
                    ${recipient.address ? `<div style="color: #475569; margin-top: 2px; font-size: 9.5pt;">${escapeHtml(recipient.address)}</div>` : ''}
                  </td>
                </tr>
              </table>

              <!-- DATE & REF NUMBER ROW -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 24px;">
                <tr>
                  <td align="left" valign="bottom" style="font-family: Arial, sans-serif; font-size: 10pt; font-weight: bold; color: #0f172a;">
                    <div>
                      ${date ? `<span>${escapeHtml(date)}г.</span>` : ''}
                      ${refNumber ? `<span style="margin-left: 16px;">Исх. № ${escapeHtml(refNumber)}</span>` : ''}
                      ${inRefNumber ? `<div style="font-size: 9pt; color: #64748b; font-weight: normal; margin-top: 2px;">${escapeHtml(inRefNumber)}</div>` : ''}
                    </div>
                  </td>
                  <td align="right" valign="bottom" style="font-family: Arial, sans-serif; font-size: 10pt; font-weight: bold; color: #0f172a;">
                    ${city ? escapeHtml(city) : 'г. Санкт-Петербург'}
                  </td>
                </tr>
              </table>

              <!-- DOCUMENT TYPE & SUBJECT -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <div style="font-family: ${fontCss}; font-size: ${fontSize + 3}pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; color: #020617;">
                      ${escapeHtml(docType || 'СЛУЖЕБНАЯ ЗАПИСКА')}
                    </div>
                    ${docSubject ? `
                      <div style="font-family: ${fontCss}; font-size: ${fontSize}pt; font-style: italic; font-weight: bold; color: #334155; margin-top: 6px;">
                        ${escapeHtml(docSubject.startsWith('О ') || docSubject.startsWith('Об ') ? docSubject : `О ${docSubject}`)}
                      </div>
                    ` : ''}
                  </td>
                </tr>
              </table>

              <!-- DOCUMENT CONTENT BODY -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="justify" style="font-family: ${fontCss}; font-size: ${fontSize}pt; line-height: ${lineSpacing || 1.35}; color: #0f172a;">
                    ${formattedContent}
                  </td>
                </tr>
              </table>

              ${(data.showAttachmentsMark || (data.attachments && data.attachments.length > 0)) ? `
                <!-- ATTACHMENTS NOTE (ГОСТ Р 7.0.97) -->
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                  <tr>
                    <td align="left" style="font-family: ${fontCss}; font-size: ${fontSize}pt; line-height: 1.4; color: #0f172a;">
                      ${escapeHtml(
                        data.attachmentsMarkText || 
                        (data.attachments && data.attachments.length > 0 
                          ? (data.attachments.length === 1 
                              ? `Приложение: ${data.attachments[0].title} на ${data.attachments[0].sheetsCount || 1} л. в ${data.attachments[0].copiesCount || 1} экз.`
                              : `Приложение: ` + data.attachments.map((a, i) => `${i + 1}. ${a.title} на ${a.sheetsCount || 1} л. в ${a.copiesCount || 1} экз.`).join('\n            '))
                          : 'Приложение: на 1 л. в 1 экз.')
                      ).replace(/\n/g, '<br/>')}
                    </td>
                  </tr>
                </table>
              ` : ''}

              <!-- SIGNATURE & SENDER ROW -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #cbd5e1; padding-top: 20px; margin-top: 24px;">
                <tr>
                  <td width="42%" align="left" valign="top" style="font-family: ${fontCss}; font-size: ${fontSize - 1}pt; line-height: 1.35; color: #0f172a;">
                    <div style="font-weight: 500;">
                      ${escapeHtml(signature.senderPosition || 'Должность')}
                    </div>
                  </td>

                  <td width="30%" align="center" valign="middle" style="position: relative;">
                    ${signature.useDigitalSignature ? `
                      <div style="border: 2px solid #312e81; background-color: #f0fdf4; border-radius: 4px; padding: 6px 8px; font-family: Arial, sans-serif; font-size: 8pt; color: #1e1b4b; text-align: left; line-height: 1.3;">
                        <div style="font-weight: bold; border-bottom: 1px solid #4338ca; padding-bottom: 3px; margin-bottom: 3px; font-size: 7.5pt; color: #312e81;">
                          🛡 ДОКУМЕНТ ПОДПИСАН ЭП
                        </div>
                        <div><b>Ключ:</b> <span style="font-family: monospace; font-weight: bold;">${escapeHtml(signature.digitalSignatureKey || '4F8A-9C12-8B0E-3D77')}</span></div>
                        <div><b>Владелец:</b> ${escapeHtml(signature.senderName || 'Сотрудник')}</div>
                        <div><b>Дата:</b> ${escapeHtml(signature.digitalSignatureDate || date || new Date().toLocaleDateString('ru-RU'))}</div>
                      </div>
                    ` : attachments.signatureCid ? `
                      <img src="cid:${attachments.signatureCid}" alt="Подпись" height="52" style="max-height: 52px; width: auto; display: block; margin: 0 auto; border: 0;" />
                    ` : `
                      <div style="border-bottom: 1px solid #0f172a; width: 85%; margin: 0 auto; text-align: center; font-size: 8pt; color: #94a3b8; font-family: Arial, sans-serif;">
                        (подпись)
                      </div>
                    `}
                  </td>

                  <td width="28%" align="right" valign="top" style="font-family: ${fontCss}; font-size: ${fontSize - 1}pt; color: #0f172a;">
                    <div style="font-weight: bold;">
                      ${escapeHtml(signature.senderName || 'Ф.И.О.')}
                    </div>
                  </td>
                </tr>
              </table>

              ${(data.attachments && data.attachments.length > 0) ? `
                <!-- ATTACHMENT SHEETS CONTENT -->
                <div style="margin-top: 40px; border-top: 2px dashed #94a3b8; padding-top: 30px;">
                  ${data.attachments.map((att, idx) => `
                    <div style="margin-bottom: 36px; padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                      <div style="text-align: right; font-family: Arial, sans-serif; font-size: 8.5pt; color: #475569; margin-bottom: 16px;">
                        <b>Приложение № ${att.number || idx + 1}</b><br/>
                        к письму АО «НПО «Тепломаш»<br/>
                        от ${escapeHtml(date || '')}г. № ${escapeHtml(data.refNumber || '')}
                      </div>
                      <div style="text-align: center; font-family: ${fontCss}; font-size: ${fontSize}pt; font-weight: bold; text-transform: uppercase; margin-bottom: 14px; color: #0f172a;">
                        ${escapeHtml(att.title || `ПРИЛОЖЕНИЕ № ${att.number || idx + 1}`)}
                      </div>
                      <div style="font-family: ${fontCss}; font-size: ${fontSize - 1}pt; line-height: 1.4; color: #1e293b; text-align: justify;">
                        ${sanitizeHtml(att.content)}
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

            </td>
          </tr>
        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Encodes a string in RFC 2047 UTF-8 Base64 format for email headers
 */
const encodeMimeHeader = (str: string): string => {
  if (!str) return '';
  try {
    const utf8Bytes = new TextEncoder().encode(str);
    let binary = '';
    utf8Bytes.forEach(b => binary += String.fromCharCode(b));
    return `=?UTF-8?B?${btoa(binary)}?=`;
  } catch {
    return str;
  }
};

/**
 * Formats base64 data strings to standard 76-character wrapped lines for RFC 2045 MIME compliance
 */
const formatBase64ForMime = (base64Str: string): string => {
  if (!base64Str) return '';
  const clean = base64Str.replace(/\s/g, '');
  const chunks = clean.match(/.{1,76}/g);
  return chunks ? chunks.join('\r\n') : clean;
};

export interface ExtraPdfAttachment {
  filename: string;
  base64Data: string;
}

/**
 * Generates full .eml file content string compliant with RFC 822 / RFC 2045 MIME specifications
 * with embedded inline image attachments (header, signature, PNG seal/stamp) and attached PDF document(s).
 */
export const generateEmlFileContentAsync = async (
  data: DocumentData,
  extraAttachments?: ExtraPdfAttachment[]
): Promise<string> => {
  const mimeAttachments: MimeImageAttachment[] = [];
  const cidMap: { headerCid?: string; signatureCid?: string; stampCid?: string } = {};

  // 1. Process Header Image
  if (data.header.imageUrl) {
    const headerPng = await convertImageUrlToPngBase64(data.header.imageUrl, 1200, 240);
    if (headerPng) {
      const cid = `header_img_${Date.now()}@teplomash.doc`;
      cidMap.headerCid = cid;
      mimeAttachments.push({
        cid,
        filename: 'header.png',
        mimeType: headerPng.mimeType,
        base64Data: headerPng.base64,
      });
    }
  }

  // 2. Process Signature Image
  if (data.signature.imageUrl) {
    const sigPng = await convertImageUrlToPngBase64(data.signature.imageUrl, 300, 100);
    if (sigPng) {
      const cid = `signature_img_${Date.now()}@teplomash.doc`;
      cidMap.signatureCid = cid;
      mimeAttachments.push({
        cid,
        filename: 'signature.png',
        mimeType: sigPng.mimeType,
        base64Data: sigPng.base64,
      });
    }
  }

  // Build HTML body with CIDs
  const htmlBody = buildEmailHtmlWithCids(data, cidMap);
  const subjectText = `${data.docType || 'Документ'}${data.docSubject ? `: ${data.docSubject}` : ''}`;

  const recipientName = data.recipient.name || data.recipient.position || 'Адресат';
  const recipientOrg = data.recipient.organization ? ` (${data.recipient.organization})` : '';
  const toDisplay = `${recipientName}${recipientOrg}`;
  const toEmail = resolveEmployeeEmail(
    data.recipient.name || data.recipient.position || '',
    data.recipient.email,
    'recipient@teplomash.ru'
  );

  const senderName = data.signature.senderName || 'Составитель';
  const senderOrg = data.signature.senderOrganization ? ` (${data.signature.senderOrganization})` : '';
  const fromDisplay = `${senderName}${senderOrg}`;
  const fromEmail = resolveEmployeeEmail(
    data.signature.senderName || '',
    data.signature.senderEmail,
    'sender@teplomash.ru'
  );

  const rfcDate = new Date().toUTCString();
  const timestamp = Date.now();
  const mixedBoundary = `----=_NextPart_MIXED_${timestamp}`;
  const relatedBoundary = `----=_NextPart_RELATED_${timestamp}`;

  const emlLines: string[] = [
    `From: ${encodeMimeHeader(fromDisplay)} <${fromEmail}>`,
    `To: ${encodeMimeHeader(toDisplay)} <${toEmail}>`,
    `Subject: ${encodeMimeHeader(subjectText)}`,
    `Date: ${rfcDate}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    `X-Unsent: 1`, // Special Outlook header to open directly as draft/editable email
    ``,
    `--${mixedBoundary}`,
    `Content-Type: multipart/related; boundary="${relatedBoundary}"`,
    ``,
    `--${relatedBoundary}`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    htmlBody,
  ];

  // Append each inline MIME image attachment section (header, signature, stamp PNG)
  mimeAttachments.forEach((att) => {
    emlLines.push(
      ``,
      `--${relatedBoundary}`,
      `Content-Type: ${att.mimeType}; name="${att.filename}"`,
      `Content-Transfer-Encoding: base64`,
      `Content-ID: <${att.cid}>`,
      `Content-Disposition: inline; filename="${att.filename}"`,
      ``,
      formatBase64ForMime(att.base64Data)
    );
  });

  emlLines.push(``, `--${relatedBoundary}--`);
  emlLines.push(``, `--${mixedBoundary}--`, ``);

  return emlLines.join('\r\n');
};

/**
 * Triggers a client-side file download for the .eml email file with embedded images
 */
export const downloadDocumentAsEml = async (
  data: DocumentData
): Promise<string> => {
  const emlContent = await generateEmlFileContentAsync(data);
  const blob = new Blob([emlContent], { type: 'message/rfc822;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  
  // Format clean filename e.g. "Служебная_записка_О_закупке_06.08.2026.eml"
  const cleanDocType = (data.docType || 'Документ').trim().replace(/[\\/:*?"<>|]/g, '_');
  const cleanSubject = (data.docSubject || '').trim().slice(0, 30).replace(/[\\/:*?"<>|]/g, '_');
  const dateStr = (data.date || new Date().toLocaleDateString('ru-RU')).replace(/\./g, '_');
  
  const filename = cleanSubject 
    ? `${cleanDocType}_${cleanSubject}_${dateStr}.eml`
    : `${cleanDocType}_${dateStr}.eml`;

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
};

import { DocumentData } from '../types';

/**
 * Maps Windows-1251 charCode to byte value (0x00 - 0xFF)
 */
function win1251ToByte(ch: string): number {
  const code = ch.charCodeAt(0);
  if (code < 128) return code;

  const table: Record<number, number> = {
    0x0402: 0x80, 0x0403: 0x81, 0x201A: 0x82, 0x0453: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
    0x20AC: 0x88, 0x2030: 0x89, 0x0409: 0x8A, 0x2039: 0x8B, 0x040A: 0x8C, 0x040C: 0x8D, 0x040B: 0x8E, 0x040F: 0x8F,
    0x0452: 0x90, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
    0x2122: 0x99, 0x0459: 0x9A, 0x203A: 0x9B, 0x045A: 0x9C, 0x045C: 0x9D, 0x045B: 0x9E, 0x045F: 0x9F,
    0x00A0: 0xA0, 0x040E: 0xA1, 0x045E: 0xA2, 0x0408: 0xA3, 0x00A4: 0xA4, 0x0490: 0xA5, 0x00A6: 0xA6, 0x00A7: 0xA7,
    0x0401: 0xA8, 0x00A9: 0xA9, 0x0404: 0xAA, 0x00AB: 0xAB, 0x00AC: 0xAC, 0x00AD: 0xAD, 0x00AE: 0xAE, 0x0407: 0xAF,
    0x00B0: 0xB0, 0x00B1: 0xB1, 0x0406: 0xB2, 0x0456: 0xB3, 0x0491: 0xB4, 0x00B5: 0xB5, 0x00B6: 0xB6, 0x00B7: 0xB7,
    0x0451: 0xB8, 0x2116: 0xB9, 0x0454: 0xBA, 0x00BB: 0xBB, 0x0458: 0xBC, 0x0405: 0xBD, 0x0455: 0xBE, 0x0457: 0xBF
  };

  if (table[code] !== undefined) return table[code];
  if (code >= 0x0410 && code <= 0x044F) {
    return code - 0x0410 + 0xC0;
  }
  return code;
}

/**
 * Detects and repairs UTF-8 text mistakenly decoded as Windows-1251 / ISO-8859-1 (Mojibake).
 */
export function fixMojibake(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // Mojibake marker detection: Cyrillic 'Р' or 'С' followed by second byte chars
  if (!/[\u0420\u0421][\u0400-\u04FF\u2018-\u201E\u2013\u2014\u2122\u00A0-\u00FF]/.test(text)) {
    return text;
  }

  try {
    const bytes: number[] = [];
    for (let i = 0; i < text.length; i++) {
      bytes.push(win1251ToByte(text[i]));
    }
    const uint8Array = new Uint8Array(bytes);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const decoded = decoder.decode(uint8Array);
    
    // Check if result is valid non-empty string and doesn't introduce replacement chars excessively
    if (decoded && !decoded.includes('\uFFFD')) {
      return decoded;
    }
  } catch {
    // Fallback to original if decoding fails
  }

  return text;
}

/**
 * Cleans all fields of a DocumentData object from potential mojibake encoding errors.
 */
export function sanitizeDocumentDataEncoding(doc: DocumentData): DocumentData {
  if (!doc) return doc;

  const sanitizeRecipient = {
    ...doc.recipient,
    position: fixMojibake(doc.recipient?.position || ''),
    organization: fixMojibake(doc.recipient?.organization || ''),
    name: fixMojibake(doc.recipient?.name || ''),
    address: fixMojibake(doc.recipient?.address || ''),
    inn: fixMojibake(doc.recipient?.inn || '')
  };

  const sanitizeSignature = {
    ...doc.signature,
    senderPosition: fixMojibake(doc.signature?.senderPosition || ''),
    senderDepartment: fixMojibake(doc.signature?.senderDepartment || ''),
    senderOrganization: fixMojibake(doc.signature?.senderOrganization || ''),
    senderName: fixMojibake(doc.signature?.senderName || '')
  };

  return {
    ...doc,
    docType: fixMojibake(doc.docType || ''),
    docSubject: fixMojibake(doc.docSubject || ''),
    city: fixMojibake(doc.city || ''),
    content: fixMojibake(doc.content || ''),
    refNumber: fixMojibake(doc.refNumber || ''),
    inRefNumber: fixMojibake(doc.inRefNumber || ''),
    recipient: sanitizeRecipient,
    signature: sanitizeSignature
  };
}

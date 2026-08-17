import { describe, it, expect } from 'vitest';
import { INITIAL_DOCUMENT, getInitialBlankDocument } from './presets';

describe('базовые документы', () => {
  it('INITIAL_DOCUMENT — полный валидный каркас', () => {
    expect(INITIAL_DOCUMENT.docType).toBeTruthy();
    expect(INITIAL_DOCUMENT.recipient.recipientType).toBe('internal');
    // Примеры без вымышленных людей: ФИО должны быть пустыми
    expect(INITIAL_DOCUMENT.recipient.name).toBe('');
    expect(INITIAL_DOCUMENT.signature.senderName).toBe('');
  });

  it('getInitialBlankDocument создаёт новый id при каждом вызове', () => {
    const a = getInitialBlankDocument();
    const b = getInitialBlankDocument();
    expect(a.id).not.toBe(b.id);
    // Пустой бланк: content пуст по смыслу
    expect(a.content).toBe('');
    expect(a.docType).toBeTruthy();
  });
});
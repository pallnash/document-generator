import { describe, it, expect } from 'vitest';
import {
  MASS_RECIPIENT_KEYWORDS,
  isMassRecipientText,
  isValidEmail,
  validateDocument,
  getFieldErrors,
  isDocumentValid,
} from './validationUtils';
import type { DocumentData } from '../types';

const mkDoc = (overrides: Partial<DocumentData>): DocumentData => ({
  id: 'test-doc',
  updatedAt: new Date().toISOString(),
  header: {
    type: 'preset',
    imageUrl: '',
    height: 140,
    alignment: 'stretch',
    marginTop: 0,
    marginBottom: 20,
    showDividerLine: false,
    dividerColor: '#cbd5e1'
  },
  recipient: {
    recipientType: 'internal',
    position: 'Начальнику бюро автоматики',
    organization: 'АО «НПО «Тепломаш»',
    name: 'Романову А. А.'
  },
  docType: 'СЛУЖЕБНАЯ ЗАПИСКА',
  docSubject: 'О доступе к папке',
  date: '14.08.2026',
  refNumber: '',
  showInRefNumber: false,
  inRefNumber: '',
  city: 'г. Санкт-Петербург',
  content: '<p>Текст документа</p>',
  signature: {
    type: 'placeholder',
    imageUrl: null,
    senderPosition: 'Ведущий инженер-программист',
    senderDepartment: 'Бюро автоматики',
    senderOrganization: 'АО «НПО «Тепломаш»',
    senderName: 'Д.С. Орлов',
    showStamp: false,
    stampImageUrl: null
  },
  fontFamily: 'Times New Roman',
  fontSize: 14,
  lineSpacing: 1.25,
  margins: { top: 20, bottom: 20, left: 20, right: 10 },
  ...overrides,
});

describe('isMassRecipientText', () => {
  it('распознаёт «всем сотрудникам» в разных регистрах', () => {
    expect(isMassRecipientText('Всем сотрудникам компании')).toBe(true);
    expect(isMassRecipientText('всем сотрудникам')).toBe(true);
    expect(isMassRecipientText('ВСЕМ СОТРУДНИКАМ')).toBe(true);
    expect(isMassRecipientText('всем работникам')).toBe(true);
  });

  it('не распознаёт обычных адресатов', () => {
    expect(isMassRecipientText('Начальнику отдела кадров')).toBe(false);
    expect(isMassRecipientText('')).toBe(false);
  });

  it('покрывает все ключевые слова справочника', () => {
    for (const kw of MASS_RECIPIENT_KEYWORDS) {
      expect(isMassRecipientText('Адресат: ' + kw)).toBe(true);
    }
  });

  it('покрывает все ключевые слова справочника без регистра', () => {
    for (const kw of MASS_RECIPIENT_KEYWORDS) {
      expect(isMassRecipientText(kw.toUpperCase())).toBe(true);
    }
  });
});

describe('isValidEmail', () => {
  it('валидные адреса', () => {
    expect(isValidEmail('ivanov@teplomash.ru')).toBe(true);
    expect(isValidEmail('a.b+c@sub.example.org')).toBe(true);
  });

  it('невалидные адреса', () => {
    expect(isValidEmail('ivanov')).toBe(false);
    expect(isValidEmail('ivanov@')).toBe(false);
    expect(isValidEmail('@teplomash.ru')).toBe(false);
    expect(isValidEmail('ivanov@teplomash')).toBe(false);
  });

  it('пустой email — валиден (поле опционально)', () => {
    expect(isValidEmail('')).toBe(true);
    expect(isValidEmail(undefined)).toBe(true);
    expect(isValidEmail('   ')).toBe(true);
  });
});

describe('validateDocument', () => {
  it('валидный документ — без ошибок', () => {
    expect(validateDocument(mkDoc({}))).toEqual([]);
  });

  it('пустое содержимое — ошибка content (HTML-теги не считаются текстом)', () => {
    const errors = validateDocument(mkDoc({ content: '<p><br></p>' }));
    expect(errors.some(e => e.field === 'content')).toBe(true);
  });

  it('нет получателя — ошибка recipient', () => {
    const errors = validateDocument(mkDoc({ recipient: { recipientType: 'internal', position: '', organization: 'АО «НПО «Тепломаш»', name: '' } }));
    expect(errors.some(e => e.field === 'recipient')).toBe(true);
  });

  it('массовый адресат — исключение для recipient', () => {
    const errors = validateDocument(mkDoc({ recipient: { recipientType: 'internal', position: 'Всем сотрудникам компании', organization: 'АО «НПО «Тепломаш»', name: '' } }));
    expect(errors.some(e => e.field === 'recipient')).toBe(false);
  });

  it('нет типа документа — ошибка docType', () => {
    const errors = validateDocument(mkDoc({ docType: '' }));
    expect(errors.some(e => e.field === 'docType')).toBe(true);
  });

  it('требуется входящий номер — ошибка inRefNumber', () => {
    const errors = validateDocument(mkDoc({ showInRefNumber: true, inRefNumber: '  ' }));
    expect(errors.some(e => e.field === 'inRefNumber')).toBe(true);
  });

  it('невалидный email — ошибка email', () => {
    const errors = validateDocument(mkDoc({ recipient: { recipientType: 'internal', position: 'Начальнику бюро', organization: 'АО «НПО «Тепломаш»', name: 'Романову А.А.', email: 'не-адрес' } }));
    expect(errors.some(e => e.field === 'email')).toBe(true);
  });
});

describe('getFieldErrors && isDocumentValid', () => {
  it('isDocumentValid согласуется с validateDocument (валид)', () => {
    const doc = mkDoc({});
    expect(isDocumentValid(doc)).toBe(true);
  });

  it('isDocumentValid согласуется с validateDocument (невалид)', () => {
    const doc = mkDoc({ content: '', recipient: { recipientType: 'internal', position: '', organization: 'АО «НПО «Тепломаш»', name: '' }, docType: '' });
    expect(isDocumentValid(doc)).toBe(false);
    const fieldErrors = getFieldErrors(doc);
    expect(fieldErrors.content).toBeTruthy();
    // recipient-ошибки лежат в recipientPos/recipientName (поле для подсказки под инпутом)
    expect(fieldErrors.recipientPos || fieldErrors.recipientName).toBeTruthy();
    expect(fieldErrors.docType).toBeTruthy();
  });
});
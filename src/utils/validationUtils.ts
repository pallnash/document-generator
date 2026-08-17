import { DocumentData } from '../types';

export interface ValidationError {
  field: 'content' | 'sender' | 'recipient' | 'docType' | 'inRefNumber' | 'email';
  title: string;
  message: string;
}

/**
 * Единый справочник массовых адресатов («всем сотрудникам», «всем партнёрам»).
 * Используется и в validateDocument, и в getFieldErrors — один источник правды.
 */
export const MASS_RECIPIENT_KEYWORDS: readonly string[] = [
  'всем сотрудникам',
  'всем работникам',
  'все сотрудники',
  'все работники',
  'всем подразделениям',
  'все подразделения',
  'всем партнерам',
  'все партнеры',
  'все партнеры компании',
  'всем партнерам компании',
  'руководителям подразделений',
  'всем филиалам',
  'всем контрагентам'
];

export const isMassRecipientText = (fullRecipientText: string): boolean =>
  MASS_RECIPIENT_KEYWORDS.some(kw => fullRecipientText.toLowerCase().includes(kw));

export function isValidEmail(email: string | undefined): boolean {
  if (!email || !email.trim()) return true; // empty email is valid if optional
  // Standard RFC 5322 regex for basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates mandatory document fields according to business rules:
 * 1. Text content must not be empty.
 * 2. Sender (составитель) must be specified (name or position).
 * 3. Recipient (кому адресовано) must be specified.
 *    EXCEPTION: If addressed to all company employees or all partners.
 * 4. Document type must not be empty.
 * 5. Incoming ref number must be present if showInRefNumber is true.
 * 6. Email addresses (recipient & sender) must be valid if provided.
 */
export function validateDocument(doc: DocumentData): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Text field check (содержание документа)
  const cleanContent = (doc.content || '').replace(/<[^>]+>/g, '').trim();
  if (!cleanContent) {
    errors.push({
      field: 'content',
      title: 'Не заполнено поле текста',
      message: 'Поле текста документа не может быть пустым. Введите текст обращения, письма или записки.'
    });
  }

  // 2. Document Type check
  if (!(doc.docType || '').trim()) {
    errors.push({
      field: 'docType',
      title: 'Не указан вид документа',
      message: 'Укажите вид документа (например: СЛУЖЕБНАЯ ЗАПИСКА, ИСХОДЯЩЕЕ ПИСЬМО).'
    });
  }

  // 3. Incoming ref number check
  if (doc.showInRefNumber && !(doc.inRefNumber || '').trim()) {
    errors.push({
      field: 'inRefNumber',
      title: 'Не указана ссылка на входящий номер',
      message: 'Заполните поле ссылки на входящий номер или отключите данный переключатель.'
    });
  }

  // 4. Sender check (составитель / подписант)
  const senderName = (doc.signature.senderName || '').trim();
  const senderPosition = (doc.signature.senderPosition || '').trim();

  const isSenderEmpty =
    (!senderName || senderName === 'Не указан') && !senderPosition;

  if (isSenderEmpty) {
    errors.push({
      field: 'sender',
      title: 'Не указан составитель документа',
      message: 'Необходимо указать ФИО или должность составителя/подписанта в блоке подписи.'
    });
  }

  if (doc.signature.senderEmail && !isValidEmail(doc.signature.senderEmail)) {
    errors.push({
      field: 'email',
      title: 'Неверный формат E-mail составителя',
      message: 'Укажите корректный E-mail адрес составителя (например: name@teplomash.ru).'
    });
  }

  // 5. Recipient check (кому адресовано)
  const recOrg = (doc.recipient.organization || '').trim();
  const recPos = (doc.recipient.position || '').trim();
  const recName = (doc.recipient.name || '').trim();
  const fullRecipientText = `${recOrg} ${recPos} ${recName}`.toLowerCase();

  if (doc.recipient.email && !isValidEmail(doc.recipient.email)) {
    errors.push({
      field: 'email',
      title: 'Неверный формат E-mail адресата',
      message: 'Укажите корректный E-mail адрес получателя (например: recipient@company.ru).'
    });
  }

  // EXCEPTION KEYWORDS ("письмо адресовано всем сотрудникам компании либо всем партнерам"):
  const isMassRecipient = isMassRecipientText(fullRecipientText);

  if (!isMassRecipient) {
    const isInternal = doc.recipient.recipientType !== 'external';
    if (isInternal) {
      // Internal recipient: requires position OR name
      if (!recPos && !recName) {
        errors.push({
          field: 'recipient',
          title: 'Не указан адресат («Кому»)',
          message: 'Укажите должность или ФИО сотрудника-получателя (или выберите «Всем сотрудникам компании»).'
        });
      }
    } else {
      // External recipient: requires organization AND (position OR name)
      if (!recOrg && !recPos && !recName) {
        errors.push({
          field: 'recipient',
          title: 'Не указан адресат («Кому»)',
          message: 'Укажите наименование сторонней организации, должность или ФИО адресата (или выберите «Всем партнерам»).'
        });
      } else if (!recOrg) {
        errors.push({
          field: 'recipient',
          title: 'Не указана организация адресата',
          message: 'Укажите наименование сторонней компании/организации получателя.'
        });
      } else if (!recPos && !recName) {
        errors.push({
          field: 'recipient',
          title: 'Не указано должностное лицо или ФИО адресата',
          message: 'Укажите должность или ФИО получателя в сторонней компании (или выберите «Всем партнерам»).'
        });
      }
    }
  }

  return errors;
}

export interface FieldErrors {
  recipientOrg?: string;
  recipientPos?: string;
  recipientName?: string;
  recipientEmail?: string;
  docType?: string;
  inRefNumber?: string;
  content?: string;
  senderName?: string;
  senderEmail?: string;
}

export function getFieldErrors(doc: DocumentData): FieldErrors {
  const errors: FieldErrors = {};

  // Email format checks
  if (doc.recipient.email && !isValidEmail(doc.recipient.email)) {
    errors.recipientEmail = 'Некорректный формат E-mail (пример: name@domain.ru)';
  }
  if (doc.signature.senderEmail && !isValidEmail(doc.signature.senderEmail)) {
    errors.senderEmail = 'Некорректный формат E-mail составителя (пример: user@teplomash.ru)';
  }

  // Recipient checks
  const recOrg = (doc.recipient.organization || '').trim();
  const recPos = (doc.recipient.position || '').trim();
  const recName = (doc.recipient.name || '').trim();
  const fullRecipientText = `${recOrg} ${recPos} ${recName}`.toLowerCase();

  const isMassRecipient = isMassRecipientText(fullRecipientText);

  if (!isMassRecipient) {
    const isInternal = doc.recipient.recipientType !== 'external';
    if (!isInternal) {
      if (!recOrg) {
        errors.recipientOrg = 'Поле обязательно для заполнения (название сторонней компании)';
      }
      if (!recPos && !recName) {
        errors.recipientPos = 'Укажите должность или ФИО адресата';
        errors.recipientName = 'Укажите должность или ФИО адресата';
      }
    } else {
      if (!recPos && !recName) {
        errors.recipientPos = 'Укажите должность или ФИО сотрудника-получателя';
        errors.recipientName = 'Укажите должность или ФИО сотрудника-получателя';
      }
    }
  }

  // Document Type check
  if (!(doc.docType || '').trim()) {
    errors.docType = 'Укажите вид документа';
  }

  // Inbound ref number check
  if (doc.showInRefNumber && !(doc.inRefNumber || '').trim()) {
    errors.inRefNumber = 'Заполните номер входящего письма или отключите переключатель';
  }

  // Content check
  const cleanContent = (doc.content || '').replace(/<[^>]+>/g, '').trim();
  if (!cleanContent) {
    errors.content = 'Поле текста документа обязательно для заполнения';
  }

  return errors;
}

export function isDocumentValid(doc: DocumentData): boolean {
  return validateDocument(doc).length === 0;
}


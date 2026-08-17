import { DocumentData } from '../types';
import { buildStampSvg } from '../utils/stampUtils';

// Locked Official Teplomash Header SVG Data URL
export const TEPLOMASH_OFFICIAL_HEADER_URL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 240" width="1200" height="240"><rect width="1200" height="240" fill="%23ffffff"/><g transform="translate(10, 5)"><g transform="translate(0, 5)"><path d="M 22,0 L 44,32 L 35,32 L 35,105 L 9,105 L 9,32 L 0,32 Z" fill="%23111827"/><path d="M 22,20 L 36,44 L 29,44 L 29,98 L 15,98 L 15,44 L 8,44 Z" fill="%23ffffff"/><path d="M 22,38 L 30,56 L 25,56 L 25,92 L 19,98 L 19,56 L 14,56 Z" fill="%23111827"/><path d="M 54,0 L 76,32 L 67,32 L 67,105 L 41,105 L 41,32 L 32,32 Z" fill="%23111827"/><path d="M 54,20 L 68,44 L 61,44 L 61,98 L 47,98 L 47,44 L 40,44 Z" fill="%23ffffff"/><path d="M 54,38 L 62,56 L 57,56 L 57,92 L 51,98 L 51,56 L 46,56 Z" fill="%23111827"/><path d="M 86,0 L 108,32 L 99,32 L 99,105 L 73,105 L 73,32 L 64,32 Z" fill="%23111827"/><path d="M 86,20 L 100,44 L 93,44 L 93,98 L 79,98 L 79,44 L 72,44 Z" fill="%23ffffff"/><path d="M 86,38 L 94,56 L 89,56 L 89,92 L 83,98 L 83,56 L 78,56 Z" fill="%23111827"/></g><text x="122" y="78" font-family="'Arial Black', Arial, sans-serif" font-weight="900" font-size="80" fill="%23111827" letter-spacing="-1">Тепломаш</text><text x="698" y="32" font-family="Arial, sans-serif" font-size="20" fill="%23111827">®</text></g><g transform="translate(10, 122)"><text x="0" y="0" font-family="Arial, sans-serif" font-weight="bold" font-size="15" fill="%23111827">Акционерное общество</text><text x="0" y="18" font-family="Arial, sans-serif" font-weight="bold" font-size="15" fill="%23111827">«Научно-производственное объединение «Тепломаш»</text><text x="0" y="35" font-family="Arial, sans-serif" font-size="14" fill="%23111827">АО «НПО «Тепломаш»</text><text x="0" y="51" font-family="Arial, sans-serif" font-size="14" fill="%23111827">ИНН 7806112986, КПП 780601001, ОГРН 1027809212573</text><text x="0" y="67" font-family="Arial, sans-serif" font-size="14" fill="%23111827">р/с 40702810055130177203</text><text x="0" y="83" font-family="Arial, sans-serif" font-size="14" fill="%23111827">Северо-Западный Банк ПАО «Сбербанк» г. Санкт-Петербург</text><text x="0" y="99" font-family="Arial, sans-serif" font-size="14" fill="%23111827">к/с 30101810500000000653 БИК 044030653</text></g><g transform="translate(1190, 42)" text-anchor="end"><text x="0" y="0" font-family="Arial, sans-serif" font-size="15" fill="%23111827">Адрес: 195279, Санкт-Петербург,</text><text x="0" y="18" font-family="Arial, sans-serif" font-size="15" fill="%23111827">шоссе Революции, д.90, л.А</text><text x="0" y="38" font-family="Arial, sans-serif" font-size="15" fill="%23111827">тел. +7 (812) <tspan font-weight="bold">301-99-40</tspan></text><text x="0" y="56" font-family="Arial, sans-serif" font-size="15" fill="%23111827">тел./факс +7 (812) <tspan font-weight="bold">327-63-82</tspan></text><text x="0" y="100" font-family="Arial, sans-serif" font-style="italic" font-size="15" fill="%23111827">root@teplomash.ru</text><text x="0" y="118" font-family="Arial, sans-serif" font-style="italic" font-size="15" fill="%23111827">www.teplomash.ru</text></g><line x1="0" y1="230" x2="1200" y2="230" stroke="%23111827" stroke-width="3"/><line x1="0" y1="234" x2="1200" y2="234" stroke="%23111827" stroke-width="1"/></svg>`;

export const SAMPLE_HEADERS = [
  {
    id: 'teplomash-official',
    name: 'АО «НПО «Тепломаш» (Официальный фирменный бланк)',
    url: TEPLOMASH_OFFICIAL_HEADER_URL
  }
];

export const SAMPLE_STAMPS = [
  {
    id: 'teplomash-stamp',
    name: 'Печать АО «НПО «Тепломаш»',
    url: buildStampSvg('АКЦИОНЕРНОЕ ОБЩЕСТВО «НПО «ТЕПЛОМАШ»', 'САНКТ-ПЕТЕРБУРГ * ОГРН 1027809212573', 'Бюро автоматики', 'Инженер-программист', 'ДЛЯ ДОКУМЕНТОВ', '#1d4ed8')
  },
  {
    id: 'stamp-vector',
    name: 'Синяя универсальная печать',
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240"><circle cx="120" cy="120" r="112" stroke="%231d4ed8" stroke-width="4" fill="none" opacity="0.85"/><circle cx="120" cy="120" r="64" stroke="%231d4ed8" stroke-width="2" fill="none" opacity="0.85"/><path id="textArcTop" d="M 28,120 A 92,92 0 1,1 212,120" fill="none"/><path id="textArcBottom" d="M 28,120 A 92,92 0 0,1 28,120" fill="none"/><text fill="%231d4ed8" font-family="Arial, sans-serif" font-size="10.5" font-weight="bold" opacity="0.85"><textPath href="%23textArcTop" startOffset="50%" text-anchor="middle">ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ</textPath></text><text fill="%231d4ed8" font-family="Arial, sans-serif" font-size="10.5" font-weight="bold" opacity="0.85"><textPath href="%23textArcBottom" startOffset="50%" text-anchor="middle">МОСКВА * ОГРН 1027700123456</textPath></text><text x="120" y="112" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="%231d4ed8" text-anchor="middle" opacity="0.85">ДЛЯ</text><text x="120" y="132" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="%231d4ed8" text-anchor="middle" opacity="0.85">ДОКУМЕНТОВ</text></svg>`
  }
];

export const INITIAL_DOCUMENT: DocumentData = {
  id: 'doc-initial',
  updatedAt: new Date().toISOString(),
  header: {
    type: 'preset',
    imageUrl: TEPLOMASH_OFFICIAL_HEADER_URL,
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
    name: ''
  },
  docType: 'СЛУЖЕБНАЯ ЗАПИСКА',
  docSubject: 'О предоставлении доступа к папке \\\\Electrica',
  date: new Date().toLocaleDateString('ru-RU'),
  refNumber: '0508/1И',
  showInRefNumber: false,
  inRefNumber: '',
  city: 'г. Санкт-Петербург',
  content: `<p>Прошу Вас предоставить доступ к сетевой папке \\\\Electrica сотрудникам отдела автоматики для проведения проектных и пусконаладочных работ.</p>`,
  signature: {
    type: 'placeholder',
    imageUrl: null,
    senderPosition: 'Ведущий инженер-программист',
    senderDepartment: 'Бюро автоматики',
    senderOrganization: 'АО «НПО «Тепломаш»',
    senderName: '',
    showStamp: false,
    stampImageUrl: null
  },
  fontFamily: 'Times New Roman',
  fontSize: 14,
  lineSpacing: 1.5,
  margins: {
    top: 20,
    bottom: 20,
    left: 20,
    right: 10
  }
};

export const getInitialBlankDocument = (): DocumentData => ({
  id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  updatedAt: new Date().toISOString(),
  header: {
    type: 'preset',
    imageUrl: TEPLOMASH_OFFICIAL_HEADER_URL,
    height: 140,
    alignment: 'stretch',
    marginTop: 0,
    marginBottom: 20,
    showDividerLine: false,
    dividerColor: '#cbd5e1'
  },
  recipient: {
    recipientType: 'internal',
    position: '',
    organization: 'АО «НПО «Тепломаш»',
    name: ''
  },
  docType: 'СЛУЖЕБНАЯ ЗАПИСКА',
  docSubject: '',
  date: new Date().toLocaleDateString('ru-RU'),
  refNumber: '',
  showInRefNumber: false,
  inRefNumber: '',
  city: 'г. Санкт-Петербург',
  content: '',
  signature: {
    type: 'placeholder',
    imageUrl: null,
    senderPosition: 'Сотрудник',
    senderDepartment: 'Бюро автоматики',
    senderOrganization: 'АО «НПО «Тепломаш»',
    senderName: '',
    showStamp: false,
    stampImageUrl: null
  },
  fontFamily: 'Times New Roman',
  fontSize: 14,
  lineSpacing: 1.5,
  margins: {
    top: 20,
    bottom: 20,
    left: 20,
    right: 10
  }
});

import { DocumentData } from '../types';
import { TEPLOMASH_HEADER_PNG_DATA_URL } from './teplomashHeaderPng';

// Official Teplomash Header Image (Exact replica of Corporate Letterhead)
// ЗАХАРДКОЖЕНО: PNG-бланк встроен как data-URL — не зависит от файлов public/ и сети.
export const TEPLOMASH_OFFICIAL_HEADER_URL = TEPLOMASH_HEADER_PNG_DATA_URL;

export const SAMPLE_HEADERS = [
  {
    id: 'teplomash-official',
    name: 'АО «НПО «Тепломаш» (Официальный фирменный бланк)',
    url: TEPLOMASH_OFFICIAL_HEADER_URL
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
    senderName: ''
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
    senderName: ''
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

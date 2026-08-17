export type HeaderAlignment = 'left' | 'center' | 'right' | 'stretch';

export interface HeaderConfig {
  type: 'image' | 'preset' | 'text';
  imageUrl: string | null;
  height: number; // in pixels (e.g. 100 to 250)
  alignment: HeaderAlignment;
  marginTop: number;
  marginBottom: number;
  showDividerLine: boolean;
  dividerColor: string;
}

export interface SavedSignatureItem {
  id: string;
  title: string;
  imageUrl: string;
  createdAt: string;
  senderName?: string;
  senderPosition?: string;
  senderDepartment?: string;
}

export type SignatureType = 'none' | 'placeholder' | 'image' | 'canvas';

export interface SignatureConfig {
  type: SignatureType;
  imageUrl: string | null; // loaded PNG or drawn data URL
  senderPosition: string; // e.g. "Генеральный директор"
  senderDepartment?: string; // e.g. "Лаборатория", "Бухгалтерия", "Бюро автоматики"
  senderOrganization: string; // e.g. "АО «НПО «Тепломаш»"
  senderName: string; // e.g. "А.В. Смирнов"
  senderEmail?: string; // e.g. "romanov@teplomash.ru"
  showStamp: boolean;
  stampImageUrl: string | null;
  // Electronic Digital Signature (ЭП / ЭЦП)
  useDigitalSignature?: boolean;
  digitalSignatureKey?: string;
  digitalSignatureDate?: string;
}

export interface DocumentData {
  id: string;
  updatedAt: string;
  // Header configuration
  header: HeaderConfig;
  
  // Mandatory Fields requested by user:
  // 1. "Кому"
  recipient: {
    recipientType?: 'internal' | 'external'; // 'internal' = сотруднику компании, 'external' = другой компании
    position: string; // e.g. "Директору департамента"
    organization: string; // e.g. "ПАО «Газпром»" или "АО «НПО «Тепломаш»"
    name: string; // e.g. "Иванову Ивану Ивановичу"
    address?: string; // Почтовый адрес (для внешних организаций)
    inn?: string; // ИНН / КПП (для внешних организаций)
    email?: string; // E-mail адрес (например kuznetsov@teplomash.ru)
  };
  
  // 2. "Тип (заголовок)"
  docType: string; // e.g. "СЛУЖЕБНАЯ ЗАПИСКА", "ИНФОРМАЦИОННОЕ ПИСЬМО", etc.
  docSubject: string; // Subtitle / theme e.g. "О закупке нового оборудования"
  
  // 3. "Дата" and Ref Number
  date: string; // ISO or formatted date e.g. "04.08.2026"
  refNumber: string; // e.g. "Исх. № 102/26"
  showInRefNumber?: boolean; // Whether to display incoming reference field/line
  inRefNumber?: string; // e.g. "на № 15/А от 01.08.2026"
  city: string; // e.g. "г. Москва"
  showBarcode?: boolean; // Automatic barcode above date & ref number (deprecated)
  isPublished?: boolean; // True when published and locked in database
  publishedAt?: string; // Timestamp when published
  
  // Content Body
  content: string; // HTML or multi-paragraph text
  
  // 4. "Кто написал письмо" and Signature
  signature: SignatureConfig;

  // Styling & Typography
  fontFamily: 'Times New Roman' | 'Arial' | 'Roboto' | 'Georgia' | 'Calibri';
  fontSize: number; // base font size in pt or px (e.g. 14)
  lineSpacing: number; // 1.15, 1.5, etc.
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };

  // Version Control (major.minor e.g. "1.0", "1.1", "2.0")
  version?: string; // Default '1.0'
  versionHistory?: DocumentVersion[];
}

export interface DocumentVersion {
  id?: string;
  version: string; // e.g. '1.0', '1.1', '2.0'
  timestamp: string; // ISO or formatted date
  createdAt?: string; // alias for timestamp
  comment?: string; // e.g. "Добавлены реквизиты", "Исправлен текст"
  updatedBy?: string;
  author?: string; // alias for updatedBy
  dataSnapshot: DocumentData;
}

export interface RegisteredDocument {
  id: string;
  regNumber: string;
  date: string;
  seq: number;
  deptCode: string;
  deptName: string;
  composerName: string;
  composerDept: string;
  recipientName: string;
  subject: string;
  registeredAt: string;
  registeredByRole: 'admin' | 'user';
  digitalSignatureKey?: string;
  /** Hash-chain целостности реестра: хэш предыдущей записи (GENESIS для самой старой). */
  prevHash?: string;
  /** Hash-chain целостности реестра: FNV-1a 64 от канонической записи + prevHash. */
  hash?: string;
}

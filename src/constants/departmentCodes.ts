import { activeRegistryStorage, activeCounterStorage } from '../services/registryStorage';
import type { CounterState } from '../services/registryStorage';

export interface DepartmentCodeInfo {
  name: string;
  code: string;
  description?: string;
  keywords: string[];
}

export const DEPARTMENT_CODES: DepartmentCodeInfo[] = [
  {
    name: 'Дирекция, отдел персонала',
    code: 'Д',
    description: 'Руководство, отдел кадров, подбор и работа с персоналом',
    keywords: ['дирекция', 'кадр', 'персонал', 'администрация', 'руководство', 'директор', 'hr', 'управление']
  },
  {
    name: 'Бухгалтерия',
    code: 'Б',
    description: 'Бухгалтерский и налоговый учет, финансовый отдел',
    keywords: ['бухгалтерия', 'бухгалтер', 'учет', 'финанс', 'расчет', 'главный бухгалтер']
  },
  {
    name: 'Отдел планирования импортных закупок',
    code: 'Э',
    description: 'ВЭД, импорт, зарубежные закупки и логистика',
    keywords: ['импорт', 'планирование импорт', 'вэд', 'зарубеж', 'закуп']
  },
  {
    name: 'Служба главного инженера',
    code: 'Н',
    description: 'Главный инженер, конструкторское бюро, техническое развитие',
    keywords: ['главного инженера', 'главный инженер', 'конструктор', 'кб', 'инженеринг', 'техническ', 'разработк']
  },
  {
    name: 'Служба эксплуатации инженерной инфраструктуры',
    code: 'Т',
    description: 'Эксплуатация зданий, энергоснабжение, инфраструктура',
    keywords: ['эксплуатац', 'инженерной инфраструктур', 'инфраструктур', 'энергет', 'механик', 'сетей', 'сэии']
  },
  {
    name: 'Служба качества',
    code: 'К',
    description: 'Контроль качества, ОТК, лаборатория и сертификация',
    keywords: ['качества', 'отк', 'контроль', 'лаборатор', 'сертификац']
  },
  {
    name: 'Служба продаж',
    code: 'М',
    description: 'Отдел продаж, работа с клиентами, коммерческая служба',
    keywords: ['продаж', 'коммерческ', 'клиент', 'сбыт', 'маркетинг', 'менеджер по продажам']
  },
  {
    name: 'Отдел материально-технического снабжения',
    code: 'С',
    description: 'Снабжение, МТС, материалы и комплектующие',
    keywords: ['снабжен', 'мтс', 'склад', 'материал', 'комплектующие', 'омтс']
  },
  {
    name: 'Отдел информационного обеспечения',
    code: 'И',
    description: 'ИТ, автоматика, ПО, базы данных и связь',
    keywords: ['информацион', 'автоматик', 'ит', 'it', 'программист', 'связь', 'вычислительн', 'бюро автоматики', 'системный']
  },
  {
    name: 'Транспортный участок, АХО',
    code: 'А',
    description: 'Автотранспорт, хозяйственная служба, АХО',
    keywords: ['транспорт', 'ахо', 'хозяйствен', 'авто', 'гараж', 'логистик']
  },
  {
    name: 'Производство',
    code: 'П',
    description: 'Производственные цехи, участки сборки и изготовления',
    keywords: ['производство', 'цех', 'сборк', 'изготовлен', 'участок', 'завод']
  }
];

export const DEPT_COUNTERS_KEY = 'teplomash_doc_dept_counters_v3';
export const DEPT_COUNTERS_DATE_KEY = 'teplomash_doc_dept_counters_date_v3';
export const DOC_REGISTRY_KEY = 'teplomash_registered_docs_registry_v3';

export interface DeptCounters {
  [deptCode: string]: number;
}

export interface RegisteredDocument {
  id: string;
  regNumber: string; // e.g. "0708/1И"
  date: string; // Document date e.g. "07.08.2026"
  seq: number;
  deptCode: string;
  deptName: string;
  composerName: string;
  composerDept: string;
  recipientName: string;
  subject: string;
  registeredAt: string; // ISO date timestamp
  registeredByRole: 'admin' | 'user';
  digitalSignatureKey?: string;
  
  // Revocation in Registry
  isRevoked?: boolean;
  revokedAt?: string;
  revokedBy?: string;
  revocationReason?: string;

  // Corrections count / summary in Registry
  correctionsCount?: number;
  lastCorrectionReason?: string;
  lastCorrectedAt?: string;

  /** Hash-chain целостности реестра: хэш предыдущей записи (GENESIS для самой старой). */
  prevHash?: string;
  /** Hash-chain целостности реестра: FNV-1a 64 от канонической записи + prevHash. */
  hash?: string;
}

/* =========================================================================
   HASH-CHAIN ЦЕЛОСТНОСТИ РЕЕСТРА (tamper-evident журнал)
   Паттерн из SINT: каждая запись хранит хэш предыдущей (prev_hash).
   Любая правка записи в обход кода (devtools, ручной localStorage) ломает
   цепочку — проверка verifyRegistryIntegrity() это обнаруживает.
   Реестр хранится [новая ... старая]; цепочка строится от самой старой
   (конец массива) к самой новой (начало).
   ========================================================================= */

const FNV_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;

/** FNV-1a 64-bit, hex-16. Синхронный, детерминированный, без WebCrypto. */
export const fnv1a64Hex = (str: string): string => {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * FNV_PRIME) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, '0');
};

export const GENESIS_HASH = '0'.repeat(16);

/** Каноническая сериализация записи БЕЗ hash/prevHash (стабильный порядок ключей).
 *  undefined-поля исключаются — точно так же, как их выбрасывает JSON.stringify
 *  при сохранении в localStorage. Иначе хэш, посчитанный в памяти (с
 *  `digitalSignatureKey: undefined`), не совпадёт с хэшем после чтения из
 *  хранилища, где поля нет → целостность ложно нарушена. */
const canonicalRegistryRecord = (doc: RegisteredDocument): string => {
  const keys = Object.keys(doc)
    .filter(k => k !== 'hash' && k !== 'prevHash')
    .filter(k => (doc as unknown as Record<string, unknown>)[k] !== undefined)
    .sort();
  const record = doc as unknown as Record<string, unknown>;
  const parts = keys.map(k => `${k}:${JSON.stringify(record[k])}`);
  return parts.join('|');
};

/** Хэш одной записи: fnv1a64(канон + prevHash). */
export const registryRecordHash = (doc: RegisteredDocument): string =>
  fnv1a64Hex(canonicalRegistryRecord(doc) + ':' + (doc.prevHash || GENESIS_HASH));

/** Перестроить цепочку от самой старой к самой новой. Возвращает новый массив. */
export const rechainRegistry = (records: RegisteredDocument[]): RegisteredDocument[] => {
  let prev = GENESIS_HASH;
  const chained = records.map(doc => ({ ...doc }));
  for (let i = chained.length - 1; i >= 0; i--) {
    chained[i].prevHash = prev;
    chained[i].hash = registryRecordHash(chained[i]);
    prev = chained[i].hash!;
  }
  return chained;
};

/** Проверка целостности цепочки. valid=false → записи менялись в обход кода. */
export const verifyRegistryIntegrity = (
  records: RegisteredDocument[]
): { valid: boolean; brokenAt: number; total: number; hasUnchained: boolean } => {
  const total = records.length;
  let prev = GENESIS_HASH;
  let hasUnchained = false;
  for (let i = total - 1; i >= 0; i--) {
    const doc = records[i];
    if (!doc.hash || !doc.prevHash) {
      hasUnchained = true;
      return { valid: false, brokenAt: i, total, hasUnchained };
    }
    if (doc.prevHash !== prev || registryRecordHash(doc) !== doc.hash) {
      return { valid: false, brokenAt: i, total, hasUnchained };
    }
    prev = doc.hash;
  }
  return { valid: true, brokenAt: -1, total, hasUnchained };
};

export const getDefaultDeptCounters = (): DeptCounters => {
  return {
    'Д': 1,
    'Б': 1,
    'Э': 1,
    'Н': 1,
    'Т': 1,
    'К': 1,
    'М': 1,
    'С': 1,
    'И': 1,
    'А': 1,
    'П': 1
  };
};

export const getDeptCounters = (): DeptCounters => {
  try {
    const todayStr = new Date().toLocaleDateString('ru-RU');
    const state = activeCounterStorage.loadCounters();

    // DAILY COUNTER RESET: If a new calendar day has started, reset sequence counters back to 1
    if (!state || state.date !== todayStr) {
      const defaultCounters = getDefaultDeptCounters();
      const nextState: CounterState = { counters: defaultCounters, date: todayStr };
      activeCounterStorage.saveCounters(nextState);
      return defaultCounters;
    }

    return { ...getDefaultDeptCounters(), ...state.counters };
  } catch (e) {
    console.error('Error reading department counters', e);
  }
  return getDefaultDeptCounters();
};

export const saveDeptCounters = (counters: DeptCounters): void => {
  try {
    const todayStr = new Date().toLocaleDateString('ru-RU');
    activeCounterStorage.saveCounters({ counters, date: todayStr });
  } catch (e) {
    console.error('Error saving department counters', e);
  }
};

export const getNextDepartmentSeq = (deptCode: string): number => {
  const counters = getDeptCounters();
  const cleanCode = (deptCode || 'Д').toUpperCase().trim();
  return counters[cleanCode] || 1;
};

export const incrementAndGetDepartmentSeq = (deptCode: string): number => {
  const counters = getDeptCounters();
  const cleanCode = (deptCode || 'Д').toUpperCase().trim();
  const currentSeq = counters[cleanCode] || 1;
  counters[cleanCode] = currentSeq + 1;
  saveDeptCounters(counters);
  return currentSeq;
};

export const setDepartmentSeq = (deptCode: string, seq: number): void => {
  const counters = getDeptCounters();
  const cleanCode = (deptCode || 'Д').toUpperCase().trim();
  counters[cleanCode] = Math.max(1, seq);
  saveDeptCounters(counters);
};

/* =========================================================================
   REGISTERED DOCUMENTS DATABASE (PERSISTENT LOG & UNIQUE NUMBER GUARANTEE)
   ========================================================================= */

/** Канон со старым поведением (undefined-поля входят) — для детекта записей,
 *  хэшированных до фикса канона (баг: undefined-поле ломало цепочку). */
const legacyCanonicalRegistryRecord = (doc: RegisteredDocument): string => {
  const keys = Object.keys(doc)
    .filter(k => k !== 'hash' && k !== 'prevHash')
    .sort();
  const record = doc as unknown as Record<string, unknown>;
  const parts = keys.map(k => `${k}:${JSON.stringify(record[k])}`);
  return parts.join('|');
};

/** true, если запись была захэширована старым (до фикса) каноном — т.е. сломан
 *  не из-за ручной правки, а из-за бага с undefined-полями. */
const wasHashedWithLegacyCanon = (doc: RegisteredDocument): boolean => {
  if (!doc.hash || !doc.prevHash) return false;
  const legacy = fnv1a64Hex(legacyCanonicalRegistryRecord(doc) + ':' + (doc.prevHash || GENESIS_HASH));
  return legacy === doc.hash;
};

export const getDocumentRegistry = (): RegisteredDocument[] => {
  try {
    const parsed = activeRegistryStorage.loadRegistry();
    if (!Array.isArray(parsed)) return [];
    // Миграция: если есть записи без hash (старый формат) — перестроить цепочку
    const needsRechain = parsed.some((r: RegisteredDocument) => !r.hash || !r.prevHash);
    if (needsRechain) {
      const chained = rechainRegistry(parsed);
      saveDocumentRegistry(chained);
      return chained;
    }
    // Миграция бага undefined-полей: все записи цепочки валидны только по
    // старому канону → сломаны самим приложением, а не ручной правкой → пересобрать.
    const verdict = verifyRegistryIntegrity(parsed);
    if (!verdict.valid) {
      const allBrokenByLegacy = parsed.every(doc => wasHashedWithLegacyCanon(doc));
      if (allBrokenByLegacy) {
        const chained = rechainRegistry(parsed);
        saveDocumentRegistry(chained);
        return chained;
      }
    }
    return parsed;
  } catch (e) {
    console.error('Error loading document registry database', e);
  }
  return [];
};

export const saveDocumentRegistry = (list: RegisteredDocument[]): void => {
  try {
    // Все записи в реестр идут через hash-chain: пересобираем цепочку перед сохранением
    activeRegistryStorage.saveRegistry(rechainRegistry(list));
  } catch (e) {
    console.error('Error saving document registry database', e);
  }
};

export const isRegistrationNumberTaken = (regNumber: string): boolean => {
  if (!regNumber) return false;
  const registry = getDocumentRegistry();
  const clean = regNumber.trim().toUpperCase();
  return registry.some(item => item.regNumber.trim().toUpperCase() === clean);
};

export const registerDocumentInDb = (params: {
  dateStr: string;
  deptCode: string;
  composerName?: string;
  composerDept?: string;
  recipientName?: string;
  subject?: string;
  role?: 'admin' | 'user';
  manualRequestedSeq?: number;
  digitalSignatureKey?: string;
}): { registeredDoc: RegisteredDocument; wasAdjustedForUniqueness: boolean } => {
  const registry = getDocumentRegistry();
  const deptCode = (params.deptCode || 'Д').toUpperCase().trim();
  
  // Starting sequence candidate
  let candidateSeq = params.manualRequestedSeq && params.manualRequestedSeq > 0 
    ? params.manualRequestedSeq 
    : getNextDepartmentSeq(deptCode);

  let candidateNumber = generateDocumentNumber(params.dateStr, candidateSeq, deptCode);
  let wasAdjustedForUniqueness = false;

  // Keep incrementing sequence if candidate number already exists in registry
  while (isRegistrationNumberTaken(candidateNumber)) {
    wasAdjustedForUniqueness = true;
    candidateSeq++;
    candidateNumber = generateDocumentNumber(params.dateStr, candidateSeq, deptCode);
  }

  const deptInfo = DEPARTMENT_CODES.find(d => d.code === deptCode);

  const registeredDoc: RegisteredDocument = {
    id: `reg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    regNumber: candidateNumber,
    date: params.dateStr || new Date().toLocaleDateString('ru-RU'),
    seq: candidateSeq,
    deptCode,
    deptName: deptInfo?.name || deptCode,
    composerName: params.composerName || 'Не указан',
    composerDept: params.composerDept || deptInfo?.name || '',
    recipientName: params.recipientName || 'Внутренний адресат',
    subject: params.subject || 'Служебная записка / Письмо',
    registeredAt: new Date().toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }),
    registeredByRole: params.role || 'user',
    ...(params.digitalSignatureKey ? { digitalSignatureKey: params.digitalSignatureKey } : {})
  };

  const updatedRegistry = [registeredDoc, ...registry];
  saveDocumentRegistry(updatedRegistry);

  // Update persistent counter so next document naturally continues from candidateSeq + 1
  setDepartmentSeq(deptCode, candidateSeq + 1);

  return { registeredDoc, wasAdjustedForUniqueness };
};

export const updateRegisteredDocumentInDb = (updatedDoc: RegisteredDocument): void => {
  const registry = getDocumentRegistry();
  const updated = registry.map(item => item.id === updatedDoc.id ? updatedDoc : item);
  saveDocumentRegistry(updated);
};

export const revokeDocumentInDb = (params: {
  id: string;
  regNumber?: string;
  reason: string;
  revokedBy: string;
}): { success: boolean; error?: string } => {
  const registry = getDocumentRegistry();
  let target = registry.find(item => item.id === params.id);
  if (!target && params.regNumber) {
    const cleanNumber = params.regNumber.trim().toUpperCase();
    target = registry.find(item => item.regNumber.trim().toUpperCase() === cleanNumber);
  }
  if (!target) {
    return { success: false, error: 'Документ не найден в Едином реестре.' };
  }

  const updated: RegisteredDocument = {
    ...target,
    isRevoked: true,
    revokedAt: new Date().toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }),
    revokedBy: params.revokedBy || 'Администратор',
    revocationReason: params.reason || 'Отозвано администратором'
  };

  updateRegisteredDocumentInDb(updated);
  return { success: true };
};

export const unrevokeDocumentInDb = (id: string): { success: boolean } => {
  const registry = getDocumentRegistry();
  const target = registry.find(item => item.id === id);
  if (!target) return { success: false };

  const updated: RegisteredDocument = {
    ...target,
    isRevoked: false,
    revokedAt: undefined,
    revokedBy: undefined,
    revocationReason: undefined
  };

  updateRegisteredDocumentInDb(updated);
  return { success: true };
};

export const recordCorrectionInRegistry = (params: {
  regNumber: string;
  reason: string;
}): void => {
  if (!params.regNumber) return;
  const registry = getDocumentRegistry();
  const cleanNumber = params.regNumber.trim().toUpperCase();
  const target = registry.find(item => item.regNumber.trim().toUpperCase() === cleanNumber);
  if (!target) return;

  const currentCount = target.correctionsCount || 0;
  const updated: RegisteredDocument = {
    ...target,
    correctionsCount: currentCount + 1,
    lastCorrectionReason: params.reason,
    lastCorrectedAt: new Date().toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  };

  updateRegisteredDocumentInDb(updated);
};

export const deleteRegisteredDocumentFromDb = (id: string): void => {
  const registry = getDocumentRegistry();
  const updated = registry.filter(item => item.id !== id);
  saveDocumentRegistry(updated);
};

export const clearDocumentRegistryDb = (): void => {
  activeRegistryStorage.clearRegistry();
};

/**
 * Extracts DDMM (4 digits) from date string like "01.08.2016" or "2026-08-04" or current date
 */
export const extractDDMM = (dateStr?: string): string => {
  if (!dateStr || !dateStr.trim()) {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${d}${m}`;
  }

  const str = dateStr.trim();

  // Match DD.MM.YYYY or DD.MM.YY or DD.MM
  const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})/);
  if (dotMatch) {
    const day = String(dotMatch[1]).padStart(2, '0');
    const month = String(dotMatch[2]).padStart(2, '0');
    return `${day}${month}`;
  }

  // Match YYYY-MM-DD (ISO)
  const isoMatch = str.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const month = isoMatch[1];
    const day = isoMatch[2];
    return `${day}${month}`;
  }

  // Fallback to current date
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${d}${m}`;
};

/**
 * Formats official document ref number according to GOST standard:
 * DDMM/SEQ_NUMBER + DEPT_CODE
 * Example: 01.08.2016, seq 1, code М -> "0108/1М"
 */
export const generateDocumentNumber = (
  dateStr: string,
  seqNumber: number | string = 1,
  deptCode: string = 'М'
): string => {
  const ddmm = extractDDMM(dateStr);
  const cleanCode = (deptCode || 'М').toUpperCase().trim();
  const seq = Math.max(1, parseInt(String(seqNumber), 10) || 1);
  return `${ddmm}/${seq}${cleanCode}`;
};

/**
 * Parses existing ref number like "0108/1М" or "Исх. № 0108/2Б"
 */
export const parseRefNumber = (refNum?: string) => {
  if (!refNum) return null;
  const match = refNum.match(/(\d{4})\/(\d+)([А-ЯA-Zа-яa-z])/);
  if (match) {
    return {
      ddmm: match[1],
      seq: parseInt(match[2], 10),
      code: match[3].toUpperCase()
    };
  }
  return null;
};

export const guessDepartmentCode = (departmentName?: string, positionName?: string): string => {
  const text = `${departmentName || ''} ${positionName || ''}`.toLowerCase();
  
  for (const dept of DEPARTMENT_CODES) {
    for (const kw of dept.keywords) {
      if (text.includes(kw)) {
        return dept.code;
      }
    }
  }

  return 'Д'; // Default to Дирекция
};


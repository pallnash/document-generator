import React, { useState, useEffect, useMemo } from 'react';
import { DocumentData } from '../types';
import { TEPLOMASH_EMPLOYEES, TeplomashEmployee } from '../constants/teplomashEmployees';
import { getInitialBlankDocument } from '../constants/presets';
import { validateDocument, ValidationError, getFieldErrors, isValidEmail } from '../utils/validationUtils';
import { declineFio, declineJobPosition, pluralizeNoun } from '../utils/declensionUtils';
import { 
  DEPARTMENT_CODES, 
  generateDocumentNumber, 
  guessDepartmentCode, 
  parseRefNumber,
  extractDDMM,
  getDeptCounters,
  saveDeptCounters,
  getNextDepartmentSeq,
  incrementAndGetDepartmentSeq,
  setDepartmentSeq,
  DeptCounters,
  registerDocumentInDb,
  updateRegisteredDocumentInDb,
  deleteRegisteredDocumentFromDb,
  clearDocumentRegistryDb,
  getDocumentRegistry,
  isRegistrationNumberTaken,
  RegisteredDocument,
  recordCorrectionInRegistry
} from '../constants/departmentCodes';
import { CorrectionModal } from './CorrectionModal';
import { DocumentCorrection } from '../types';
import { 
  UserCheck, 
  FileText, 
  Calendar, 
  Sparkles, 
  FileCheck,
  Building2,
  Users,
  Globe,
  Briefcase,
  MapPin,
  FileSpreadsheet,
  Lock,
  Shield,
  ShieldCheck,
  Hash,
  Info,
  Check,
  Zap,
  Settings,
  X,
  ListOrdered,
  RotateCcw,
  CheckCircle2,
  Search,
  Trash2,
  Pencil,
  KeyRound,
  Archive,
  Database,
  Copy,
  Send,
  AlertTriangle,
  ShieldAlert,
  Mail,
  Wand2
} from 'lucide-react';

interface DocumentFormProps {
  data: DocumentData;
  onChange: (updated: DocumentData) => void;
  onOpenAiAssistant?: () => void;
  onOpenEmployeeModal?: () => void;
  employees?: TeplomashEmployee[];
  userRole?: 'admin' | 'user' | null;
  onRequestAdminAuth?: () => void;
}

const INTERNAL_DOC_TYPES = [
  'СЛУЖЕБНАЯ ЗАПИСКА',
  'РАСПОРЯЖЕНИЕ',
  'ЗАЯВЛЕНИЕ',
  'ОБЪЯСНИТЕЛЬНАЯ',
  'ПРИКАЗ',
  'УВЕДОМЛЕНИЕ',
  'АКТ',
  'ПРОТОКОЛ'
];

const EXTERNAL_DOC_TYPES = [
  'ИСХОДЯЩЕЕ ПИСЬМО',
  'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ',
  'ЗАПРОС',
  'ОТВЕТ НА ЗАПРОС',
  'ИНФОРМАЦИОННОЕ ПИСЬМО',
  'СОГЛАШЕНИЕ',
  'АКТ СВЕРКИ',
  'ПРЕТЕНЗИЯ',
  'ДОВЕРЕННОСТЬ'
];

// Helper to parse HTML content into editable multiline text
const htmlToText = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '');
};

// Helper to convert multiline text back into clean HTML <p> tags preserving spaces
const textToHtml = (text: string): string => {
  if (!text) return '';
  const blocks = text.split(/\n\s*\n/);
  return blocks
    .map(block => {
      if (!block) return '';
      const formatted = block.replace(/\n/g, '<br/>');
      return `<p>${formatted}</p>`;
    })
    .join('');
};

export const DocumentForm: React.FC<DocumentFormProps> = ({ 
  data, 
  onChange, 
  onOpenAiAssistant, 
  onOpenEmployeeModal, 
  employees,
  userRole,
  onRequestAdminAuth
}) => {
  const isAdmin = userRole === 'admin';
  const employeeList = employees || [];
  const isInternal = data.recipient.recipientType !== 'external';

  const isLocked = !!data.isPublished;
  const currentDocTypes = isInternal ? INTERNAL_DOC_TYPES : EXTERNAL_DOC_TYPES;

  const [customType, setCustomType] = useState(
    !currentDocTypes.includes(data.docType) ? data.docType : ''
  );

  const [rawText, setRawText] = useState(() => htmlToText(data.content));

  // Document Number Generator & Department Sequential Registry States
  const parsedRef = parseRefNumber(data.refNumber);
  const [deptCounters, setDeptCounters] = useState<DeptCounters>(() => getDeptCounters());
  const [registryList, setRegistryList] = useState<RegisteredDocument[]>(() => getDocumentRegistry());
  const [isCountersModalOpen, setIsCountersModalOpen] = useState<boolean>(false);
  const [activeModalTab, setActiveModalTab] = useState<'log' | 'counters'>('log');
  const [registrySearch, setRegistrySearch] = useState<string>('');
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState<boolean>(false);
  const [publishWarnings, setPublishWarnings] = useState<string[]>([]);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState<boolean>(false);

  const handleApplyCorrection = (correction: DocumentCorrection, updatedDoc: DocumentData) => {
    // 1. Update document with the new correction
    onChange(updatedDoc);

    // 2. Update the document entry in the registry
    if (data.refNumber) {
      recordCorrectionInRegistry({
        regNumber: data.refNumber,
        reason: correction.reason,
        correctedBy: correction.correctedBy,
        timestamp: correction.timestamp
      });
      setRegistryList(getDocumentRegistry());
    }

    setNotifyMsg(`ИСПРАВЛЕНИЕ ЗАВЕРЕНО! Запись о внесенных правках прикреплена к документу № ${data.refNumber} и зафиксирована в реестре.`);
    setTimeout(() => setNotifyMsg(null), 6000);
  };

  // Search & autocomplete state for recipient selection from tmdata
  const [recipientSearchQuery, setRecipientSearchQuery] = useState<string>('');
  const [isRecipientSearchDropdownOpen, setIsRecipientSearchDropdownOpen] = useState<boolean>(false);

  const filteredRecipientEmployees = useMemo(() => {
    if (!isInternal) return [];
    const q = recipientSearchQuery.trim().toLowerCase();
    if (!q) return employeeList.slice(0, 8);
    return employeeList
      .filter(emp => {
        const haystack = [emp.shortName, emp.dativeName, emp.fullName, emp.position, emp.department]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 10);
  }, [isInternal, recipientSearchQuery, employeeList]);

  const applyRecipientSuggestion = (emp: TeplomashEmployee) => {
    const rawPos = emp.dativePosition || declineJobPosition(emp.position, 'dative');
    const formattedPos = (emp.department && !rawPos.toLowerCase().includes(emp.department.toLowerCase()))
      ? `${rawPos} (${emp.department})`
      : rawPos;
    const rawName = emp.dativeName || declineFio(emp.shortName || emp.fullName, 'dative');

    onChange({
      ...data,
      recipient: {
        ...data.recipient,
        recipientType: 'internal',
        position: formattedPos,
        organization: emp.organization || 'АО «НПО «Тепломаш»',
        name: rawName,
        email: emp.email || ''
      }
    });
    setRecipientSearchQuery('');
    setIsRecipientSearchDropdownOpen(false);
  };

  const [selectedDeptCode, setSelectedDeptCode] = useState<string>(() => {
    if (parsedRef?.code) return parsedRef.code;
    return guessDepartmentCode(data.signature.senderDepartment, data.signature.senderPosition);
  });

  const [seqIndex, setSeqIndex] = useState<number>(() => {
    if (parsedRef?.seq) return parsedRef.seq;
    return getNextDepartmentSeq(selectedDeptCode);
  });

  // Reload counter when department code changes
  useEffect(() => {
    if (!parsedRef?.seq) {
      const nextSeq = getNextDepartmentSeq(selectedDeptCode);
      setSeqIndex(nextSeq);
    }
  }, [selectedDeptCode]);

  // Keep department code in sync with composer/sender department
  useEffect(() => {
    if (data.signature.senderDepartment || data.signature.senderPosition) {
      const guessed = guessDepartmentCode(data.signature.senderDepartment, data.signature.senderPosition);
      setSelectedDeptCode(guessed);
      setSeqIndex(getNextDepartmentSeq(guessed));
    }
  }, [data.signature.senderDepartment, data.signature.senderPosition]);

  // Calculate current document validation errors
  const validationErrors = validateDocument(data);
  const fieldErrors = getFieldErrors(data);

  // 1. Triggered on click: checks duplicates and opens confirmation dialog
  const handlePublishAndRegisterDocument = () => {
    const valErrors = validateDocument(data);
    if (valErrors.length > 0) {
      setNotifyMsg(`ОШИБКА: Заполните обязательные поля (${valErrors.map(e => e.title).join('; ')})`);
      setTimeout(() => setNotifyMsg(null), 6000);
      return;
    }

    const registry = getDocumentRegistry();
    const newSubject = (data.docSubject || data.docType || '').trim().toLowerCase();
    const newRecipient = (data.recipient.name || data.recipient.organization || '').trim().toLowerCase();
    const newContentClean = rawText.trim().replace(/\s+/g, ' ').toLowerCase();

    if (newSubject.length > 0 || newContentClean.length > 0) {
      const duplicate = registry.find(item => {
        const itemSubject = (item.subject || '').trim().toLowerCase();
        const itemRecipient = (item.recipientName || '').trim().toLowerCase();
        return (
          itemSubject === newSubject &&
          (itemRecipient === newRecipient || (newRecipient.length > 0 && itemRecipient.includes(newRecipient)))
        );
      });

      if (duplicate) {
        setNotifyMsg(`ОШИБКА: Документ с аналогичной темой и адресатом уже зафиксирован под № ${duplicate.regNumber} от ${duplicate.date}! Повторное занесение дубликатов запрещено.`);
        setTimeout(() => setNotifyMsg(null), 6000);
        return;
      }
    }

    // Контроль полноты перед публикацией (подпись + печать обязательны)
    const warnings: string[] = [];
    const sig = data.signature;
    const hasGraphicSignature = sig.type === 'image' && !!sig.imageUrl || sig.type === 'canvas';
    const hasDigitalSignature = !!sig.useDigitalSignature;
    if (!hasGraphicSignature && !hasDigitalSignature) {
      warnings.push('В документе отсутствует подпись (графическая или ЭП).');
    }
    if (sig.showStamp && !sig.stampImageUrl) {
      warnings.push('Выбрана печать, но изображение печати не загружено.');
    }
    if (!data.recipient.name && !data.recipient.organization) {
      warnings.push('Не указан адресат (получатель документа).');
    }
    setPublishWarnings(warnings);

    // Open warning confirmation modal
    setIsPublishConfirmOpen(true);
  };

  // 2. Executed after user confirms in warning modal
  const executeRegistration = () => {
    const todayDate = new Date().toLocaleDateString('ru-RU');
    const deptCodeToUse = guessDepartmentCode(data.signature.senderDepartment, data.signature.senderPosition);

    const { registeredDoc } = registerDocumentInDb({
      dateStr: todayDate,
      deptCode: deptCodeToUse,
      composerName: data.signature.senderName || 'Не указан',
      composerDept: data.signature.senderDepartment || data.signature.senderPosition || 'Дирекция',
      recipientName: data.recipient.name ? `${data.recipient.organization || ''} (${data.recipient.name})` : (data.recipient.organization || 'Внутренний адресат'),
      subject: data.docSubject || data.docType || 'Официальный документ',
      role: isAdmin ? 'admin' : 'user'
    });

    const publishedDoc: DocumentData = {
      ...data,
      refNumber: registeredDoc.regNumber,
      date: todayDate,
      isPublished: true
    };

    setDeptCounters(getDeptCounters());
    setRegistryList(getDocumentRegistry());
    setSelectedDeptCode(deptCodeToUse);
    setSeqIndex(registeredDoc.seq + 1);

    // Save published document into saved documents history / localStorage
    const savedTitle = `${data.docType || 'Документ'} № ${registeredDoc.regNumber} от ${todayDate}`;
    try {
      const saved = localStorage.getItem('official_doc_drafts_history');
      const list = saved ? JSON.parse(saved) : [];
      const newDraft = {
        id: `published-${registeredDoc.regNumber.replace(/[\/\s]/g, '-')}-${Date.now()}`,
        title: savedTitle,
        savedAt: `${todayDate} ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
        data: publishedDoc
      };
      localStorage.setItem('official_doc_drafts_history', JSON.stringify([newDraft, ...list]));
    } catch (e) {
      console.error(e);
    }

    // Keep published document active on screen with read-only lock
    onChange(publishedDoc);

    setNotifyMsg(`ОПУБЛИКОВАНО! Письмо зарегистрировано под № ${registeredDoc.regNumber} и сохранено в «Документы». Редактирование заблокировано.`);
    setTimeout(() => setNotifyMsg(null), 6000);
  };

  // Sync raw text when external content changes (e.g. AI or preset load)
  useEffect(() => {
    const currentGeneratedHtml = textToHtml(rawText);
    if (data.content !== currentGeneratedHtml) {
      setRawText(htmlToText(data.content));
    }
  }, [data.content]);

  const handleTextareaChange = (val: string) => {
    setRawText(val);
    const newHtml = textToHtml(val);
    onChange({ ...data, content: newHtml });
  };

  const handleRecipientChange = (field: keyof typeof data.recipient, value: string) => {
    onChange({
      ...data,
      recipient: {
        ...data.recipient,
        [field]: value
      }
    });
  };

  const handleDocTypeSelect = (type: string) => {
    if (type === 'CUSTOM') {
      onChange({ ...data, docType: customType || 'ДОКУМЕНТ' });
    } else {
      onChange({ ...data, docType: type });
    }
  };

  const handleInsertTag = (tagText: string) => {
    const updatedContent = data.content ? `${data.content}\n<p>${tagText}</p>` : `<p>${tagText}</p>`;
    onChange({ ...data, content: updatedContent });
  };

  return (
    <div className="space-y-6">
      {/* LIVE VALIDATION STATUS ALERT BAR */}
      {validationErrors.length > 0 ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 shadow-2xs space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold text-xs text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Необходимо заполнить обязательные поля ({validationErrors.length}):</span>
          </div>
          <ul className="text-[11px] text-rose-800 space-y-1 pl-6 list-disc">
            {validationErrors.map((err, idx) => (
              <li key={idx}>
                <strong>{err.title}:</strong> {err.message}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-emerald-900 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Все обязательные поля заполнены (текст, составитель и адресат)</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-mono bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
            Готов к отправке / печати
          </span>
        </div>
      )}

      {/* PUBLISHED & REGISTERED STATUS BANNER */}
      {data.isPublished && (
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm tracking-wide text-white">ДОКУМЕНТ ЗАРЕГИСТРИРОВАН В ЕДИНОМ РЕЕСТРЕ ПИСЕМ</h3>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold rounded uppercase tracking-wider border border-emerald-400/30">
                  № {data.refNumber}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-normal">
                Зафиксирован в Едином реестре ({data.publishedAt || data.date}). Редактирование документа заблокировано для всех пользователей. Удаление доступно только Администратору в Реестре.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!isAdmin) {
                  if (onRequestAdminAuth) {
                    onRequestAdminAuth();
                  } else {
                    setNotifyMsg('Внесение исправлений в зарегистрированный документ доступно только Администратору.');
                    setTimeout(() => setNotifyMsg(null), 4000);
                  }
                  return;
                }
                setIsCorrectionModalOpen(true);
              }}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
              title={isAdmin ? "Внести заверенные исправления в опубликованное письмо" : "Внесение исправлений доступно только Администратору"}
            >
              {isAdmin ? <Pencil className="w-3.5 h-3.5" /> : <KeyRound className="w-3.5 h-3.5" />}
              <span>Внести исправление (с подписью)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const draftCopy: DocumentData = {
                  ...data,
                  id: `doc-${Date.now()}`,
                  isPublished: false,
                  refNumber: '',
                  date: new Date().toLocaleDateString('ru-RU')
                };
                onChange(draftCopy);
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
              title="Создать новую редактируемую копию на основе этого документа"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Создать копию (новый черновик)</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. Recipient Block ("Кому") */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <div className="w-5 h-5 rounded-sm bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <span>1. Кому адресуется документ</span>
          </div>

          {isInternal && onOpenEmployeeModal && (
            <button
              type="button"
              onClick={onOpenEmployeeModal}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 rounded transition-colors border border-slate-200"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              База сотрудников
            </button>
          )}
        </div>

        {/* MODE SELECTOR: Internal Employee vs External Company */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-slate-100/90 rounded-lg border border-slate-200/80">
          <button
            type="button"
            onClick={() => {
              onChange({
                ...data,
                recipient: {
                  ...data.recipient,
                  recipientType: 'internal',
                  organization: 'АО «НПО «Тепломаш»'
                },
                docType: data.docType === 'ИСХОДЯЩЕЕ ПИСЬМО' || data.docType === 'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ' ? 'СЛУЖЕБНАЯ ЗАПИСКА' : data.docType
              });
            }}
            className={`flex items-start gap-2.5 p-2.5 rounded-md text-left transition-all ${
              isInternal
                ? 'bg-white text-indigo-950 shadow-sm font-bold border border-indigo-200/80 ring-1 ring-indigo-500/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-medium'
            }`}
          >
            <div className={`p-2 rounded-md shrink-0 mt-0.5 ${isInternal ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold">Сотруднику компании</div>
              <div className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                Внутренняя служебная записка или заявление работнику предприятия
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onChange({
                ...data,
                recipient: {
                  ...data.recipient,
                  recipientType: 'external',
                  organization: data.recipient.organization === 'АО «НПО «Тепломаш»' ? 'ООО «ТехноПром»' : data.recipient.organization
                },
                docType: data.docType === 'СЛУЖЕБНАЯ ЗАПИСКА' ? 'ИСХОДЯЩЕЕ ПИСЬМО' : data.docType
              });
            }}
            className={`flex items-start gap-2.5 p-2.5 rounded-md text-left transition-all ${
              !isInternal
                ? 'bg-white text-indigo-950 shadow-sm font-bold border border-indigo-200/80 ring-1 ring-indigo-500/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-medium'
            }`}
          >
            <div className={`p-2 rounded-md shrink-0 mt-0.5 ${!isInternal ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold">Сторонней организации</div>
              <div className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                Исходящее деловое письмо, запрос или коммерческое предложение
              </div>
            </div>
          </button>
        </div>

        {/* PRESET CHIPS & FUNCTIONALITY ACCORDING TO RECIPIENT TYPE */}
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-md p-2.5 space-y-2.5">
          <div className="text-[11px] font-semibold text-indigo-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isInternal ? 'Выбор адресата из базы tmdata/:' : 'Быстрый выбор адресата («Кому»):'}</span>
            </span>
            <span className="text-[10px] text-indigo-600 font-bold">
              {isInternal ? 'Ручной ввод отключен' : 'Исключения для общей рассылки'}
            </span>
          </div>

          {/* Search bar for internal employees */}
          {isInternal && (
            <div className="relative">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={recipientSearchQuery}
                  onChange={(e) => {
                    setRecipientSearchQuery(e.target.value);
                    setIsRecipientSearchDropdownOpen(true);
                  }}
                  onFocus={() => setIsRecipientSearchDropdownOpen(true)}
                  placeholder="Поиск сотрудника в базе tmdata/ (ФИО, отдел, должность)..."
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-md border border-indigo-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-medium placeholder:text-slate-400 shadow-2xs"
                />
              </div>

              {isRecipientSearchDropdownOpen && filteredRecipientEmployees.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-indigo-100 rounded-lg shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                  {filteredRecipientEmployees.map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyRecipientSuggestion(emp);
                      }}
                      className="w-full p-2 text-left hover:bg-indigo-50/80 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{emp.fullName} ({emp.shortName})</div>
                        <div className="text-[10px] text-slate-500">{emp.department} • {emp.position}</div>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 shrink-0">
                        Выбрать
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {/* Mass broadcast chip */}
            <button
              type="button"
              onClick={() => {
                if (isInternal) {
                  onChange({
                    ...data,
                    recipient: {
                      ...data.recipient,
                      recipientType: 'internal',
                      position: 'Всем сотрудникам компании',
                      organization: 'АО «НПО «Тепломаш»',
                      name: ''
                    }
                  });
                } else {
                  onChange({
                    ...data,
                    recipient: {
                      ...data.recipient,
                      recipientType: 'external',
                      organization: 'Партнерам и контрагентам АО «НПО «Тепломаш»',
                      position: 'Всем партнерам компании',
                      name: ''
                    }
                  });
                }
              }}
              className="px-2.5 py-1 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-indigo-200" />
              <span>{isInternal ? '👥 Всем сотрудникам компании' : '🌐 Всем партнерам компании'}</span>
            </button>

            {isInternal && employeeList.slice(0, 7).map(emp => {
              const isSelected = data.recipient.name === emp.dativeName || data.recipient.name === emp.shortName || data.recipient.name === emp.fullName;
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => applyRecipientSuggestion(emp)}
                  className={`px-2 py-1 text-[11px] font-medium rounded border transition-colors shadow-2xs cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                      : 'bg-white hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 border-indigo-200'
                  }`}
                >
                  {emp.shortName} ({emp.department})
                </button>
              );
            })}
          </div>
        </div>

        {/* INPUT FIELDS TAILORED FOR RECIPIENT TYPE */}
        <div className="space-y-3">
          {isInternal ? (
            <>
              <div>
                <label className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  <span>Должность сотрудника (в дательном падеже)</span>
                  <span className="text-[10px] font-normal text-slate-400 lowercase flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> из базы tmdata/
                  </span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={data.recipient.position}
                  placeholder="Заполняется автоматически при выборе сотрудника"
                  className={`w-full text-xs p-2.5 rounded border border-slate-200 bg-slate-50 text-slate-700 font-medium outline-none cursor-default ${
                    fieldErrors.recipientPos ? 'border-rose-400 bg-rose-50/30 text-rose-900' : ''
                  }`}
                  title="Поле подтягивается из базы tmdata/ (ручное редактирование запрещено)"
                />
                {fieldErrors.recipientPos && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1 animate-in fade-in duration-150">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>{fieldErrors.recipientPos}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  <span>Организация / Подразделение</span>
                  <span className="text-[10px] font-normal text-slate-400 lowercase flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> из базы tmdata/
                  </span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={data.recipient.organization}
                  placeholder="АО «НПО «Тепломаш»"
                  className="w-full text-xs p-2.5 rounded border border-slate-200 bg-slate-50 text-slate-700 font-medium outline-none cursor-default"
                  title="Поле подтягивается из базы tmdata/ (ручное редактирование запрещено)"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  <span>ФИО сотрудника (в дательном падеже)</span>
                  <span className="text-[10px] font-normal text-slate-400 lowercase flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> из базы tmdata/
                  </span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={data.recipient.name}
                  placeholder="Заполняется автоматически при выборе сотрудника"
                  className={`w-full text-xs p-2.5 rounded border border-slate-200 bg-slate-50 text-slate-900 font-bold outline-none cursor-default ${
                    fieldErrors.recipientName ? 'border-rose-400 bg-rose-50/30 text-rose-900' : ''
                  }`}
                  title="Поле подтягивается из базы tmdata/ (ручное редактирование запрещено)"
                />
                {fieldErrors.recipientName && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1 animate-in fade-in duration-150">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>{fieldErrors.recipientName}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>E-mail сотрудника</span>
                  </span>
                  <span className="text-[10px] font-normal text-slate-400 lowercase flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> из базы tmdata/
                  </span>
                </label>
                <input
                  type="email"
                  readOnly
                  value={data.recipient.email || ''}
                  placeholder="romanov@teplomash.ru"
                  className="w-full text-xs p-2.5 rounded border border-slate-200 bg-slate-50 text-slate-700 font-medium outline-none cursor-default"
                  title="Поле подтягивается из базы tmdata/ (ручное редактирование запрещено)"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Название сторонней компании / Организации *</span>
                </label>
                <input
                  type="text"
                  value={data.recipient.organization}
                  onChange={(e) => handleRecipientChange('organization', e.target.value)}
                  placeholder="Например: ООО «ТехноПром» или ПАО «Газпром»"
                  className={`w-full text-xs p-2.5 rounded border transition-all font-sans font-bold outline-none ${
                    fieldErrors.recipientOrg
                      ? 'border-rose-500 bg-rose-50/30 text-rose-900 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-300 text-indigo-950 focus:ring-1 focus:ring-indigo-500'
                  }`}
                />
                {fieldErrors.recipientOrg && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1 animate-in fade-in duration-150">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>{fieldErrors.recipientOrg}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    <span>Должность адресата</span>
                  </label>
                  <input
                    type="text"
                    value={data.recipient.position}
                    onChange={(e) => handleRecipientChange('position', e.target.value)}
                    onBlur={() => {
                      if (data.recipient.position.trim()) {
                        const declined = declineJobPosition(data.recipient.position, 'dative');
                        if (declined && declined !== data.recipient.position) {
                          handleRecipientChange('position', declined);
                        }
                      }
                    }}
                    placeholder="Например: Генеральному директору"
                    className={`w-full text-xs p-2.5 rounded border transition-all font-sans outline-none ${
                      fieldErrors.recipientPos
                        ? 'border-rose-500 bg-rose-50/30 text-rose-900 focus:ring-2 focus:ring-rose-500/20'
                        : 'border-slate-300 focus:ring-1 focus:ring-indigo-500'
                    }`}
                  />
                  {fieldErrors.recipientPos && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1 animate-in fade-in duration-150">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                      <span>{fieldErrors.recipientPos}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    <span>ФИО адресата (в дательном падеже)</span>
                  </label>
                  <input
                    type="text"
                    value={data.recipient.name}
                    onChange={(e) => handleRecipientChange('name', e.target.value)}
                    onBlur={() => {
                      if (data.recipient.name.trim()) {
                        const declined = declineFio(data.recipient.name, 'dative');
                        if (declined && declined !== data.recipient.name) {
                          handleRecipientChange('name', declined);
                        }
                      }
                    }}
                    placeholder="Например: Петрову П. В."
                    className={`w-full text-xs p-2.5 rounded border transition-all font-sans outline-none ${
                      fieldErrors.recipientName
                        ? 'border-rose-500 bg-rose-50/30 text-rose-900 focus:ring-2 focus:ring-rose-500/20'
                        : 'border-slate-300 focus:ring-1 focus:ring-indigo-500'
                    }`}
                  />
                  {fieldErrors.recipientName && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1 animate-in fade-in duration-150">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                      <span>{fieldErrors.recipientName}</span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>E-mail организации / адресата (для отправки)</span>
                </label>
                <input
                  type="email"
                  value={data.recipient.email || ''}
                  onChange={(e) => handleRecipientChange('email', e.target.value)}
                  placeholder="Например: info@technoprom.ru"
                  className={`w-full text-xs p-2.5 rounded border transition-all font-sans outline-none ${
                    fieldErrors.recipientEmail
                      ? 'border-rose-500 bg-rose-50/30 text-rose-900 focus:ring-2 focus:ring-rose-500/20 font-medium'
                      : 'border-slate-300 focus:ring-1 focus:ring-indigo-500'
                  }`}
                />
                {fieldErrors.recipientEmail && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1 animate-in fade-in duration-150">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>{fieldErrors.recipientEmail}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Почтовый / Юридический адрес (опционально)</span>
                </label>
                <input
                  type="text"
                  value={data.recipient.address || ''}
                  onChange={(e) => handleRecipientChange('address', e.target.value)}
                  placeholder="Например: 190000, г. Санкт-Петербург, Невский пр., д. 10"
                  className="w-full text-xs p-2.5 rounded border border-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  ИНН / КПП организации (опционально)
                </label>
                <input
                  type="text"
                  value={data.recipient.inn || ''}
                  onChange={(e) => handleRecipientChange('inn', e.target.value)}
                  placeholder="Например: ИНН 7801234567 / КПП 780101001"
                  className="w-full text-xs p-2.5 rounded border border-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-sans text-slate-600"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Document Type & Subject ("Тип (заголовок)") */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
          <div className="w-5 h-5 rounded-sm bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <span>2. Вид документа и тема</span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Рекомендуемые виды документов ({isInternal ? 'Внутренние' : 'Внешние'})
              </label>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {currentDocTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleDocTypeSelect(type)}
                  className={`px-2.5 py-1 text-[11px] rounded border font-semibold transition-all ${
                    data.docType === type
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={data.docType}
                onChange={(e) => onChange({ ...data, docType: e.target.value.toUpperCase() })}
                placeholder="Или введите свой заголовок (например: УВЕДОМЛЕНИЕ)"
                className={`w-full text-xs p-2.5 rounded border transition-all font-semibold uppercase tracking-wide outline-none ${
                  fieldErrors.docType
                    ? 'border-rose-500 bg-rose-50/30 text-rose-900 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:ring-1 focus:ring-indigo-500'
                }`}
              />
            </div>
            {fieldErrors.docType && (
              <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1 animate-in fade-in duration-150">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <span>{fieldErrors.docType}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Тема / Заголовок к тексту документа
            </label>
            <input
              type="text"
              value={data.docSubject}
              onChange={(e) => onChange({ ...data, docSubject: e.target.value })}
              placeholder={isInternal ? "Например: О согласовании отпуска / закупки оборудования" : "Например: О поставке оборудования по договору №12/26"}
              className="w-full text-xs p-2.5 rounded border border-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* 3. Date & Number Details */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <div className="w-5 h-5 rounded-sm bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <span>3. Ссылка на входящий № и публикация</span>
          </div>

          <div className="flex items-center gap-1.5">
            {isAdmin ? (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
                <Shield className="w-3 h-3 text-amber-600" />
                Админ
              </span>
            ) : (
              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                Авто-нумерация
              </span>
            )}
          </div>
        </div>

        {/* Optional Inbound Reference Question & Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={data.showInRefNumber || false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  onChange({
                    ...data,
                    showInRefNumber: checked,
                    inRefNumber: checked ? data.inRefNumber : ''
                  });
                }}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-800">
                Указать ссылку на входящий номер (письмо-ответ)?
              </span>
            </label>
            <span className="text-[11px] font-medium text-slate-500">
              {data.showInRefNumber ? 'Включено' : 'Выключено'}
            </span>
          </div>

          {data.showInRefNumber && (
            <div className="space-y-1.5 animate-in fade-in duration-150 pl-1">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Ссылка на входящий № *
              </label>
              <input
                type="text"
                value={data.inRefNumber || ''}
                onChange={(e) => onChange({ ...data, inRefNumber: e.target.value })}
                placeholder="Например: На № 11/07 от 28.07.2026г."
                className={`w-full text-xs p-2.5 rounded border transition-all font-sans bg-white outline-none ${
                  fieldErrors.inRefNumber
                    ? 'border-rose-500 bg-rose-50/30 text-rose-900 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:ring-1 focus:ring-indigo-500'
                }`}
              />
              {fieldErrors.inRefNumber && (
                <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1 animate-in fade-in duration-150">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                  <span>{fieldErrors.inRefNumber}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* COMPACT AUTOMATIC DOCUMENT NUMBER BAR */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs mt-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-mono font-bold text-xs shrink-0">
              №
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                Регистрационный номер документа
              </div>
              <div className="text-[11px] text-slate-500">
                {data.isPublished ? 'Зафиксирован в Едином реестре' : 'Автоматический номер из единой базы писем'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-extrabold text-indigo-950 bg-indigo-100/80 border border-indigo-200 px-3 py-1.5 rounded shadow-2xs">
              {data.refNumber || generateDocumentNumber(data.date || new Date().toLocaleDateString('ru-RU'), seqIndex, selectedDeptCode)}
            </span>
          </div>
        </div>

        {/* REGISTRY / COUNTERS MODAL */}
        {isCountersModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
              {/* Modal Header */}
              <div className="bg-indigo-950 text-white p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-indigo-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm">Единый реестр писем АО «НПО «Тепломаш»</h3>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide border ${
                        isAdmin 
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/40' 
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {isAdmin ? 'Администратор' : 'Пользователь (Просмотр)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-300 font-normal mt-0.5">
                      База данных выданных регистрационных номеров и сквозных счетчиков
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCountersModalOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Navigation Tabs */}
              <div className="bg-slate-100 border-b border-slate-200 px-4 pt-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('log')}
                    className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors border-t border-x ${
                      activeModalTab === 'log'
                        ? 'bg-white text-indigo-950 border-slate-200 shadow-2xs'
                        : 'bg-transparent text-slate-600 hover:text-slate-900 border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Archive className="w-3.5 h-3.5 text-indigo-600" />
                      Журнал регистраций ({registryList.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isAdmin) {
                        alert('Редактирование счетчиков доступно только Администратору.');
                        return;
                      }
                      setActiveModalTab('counters');
                    }}
                    className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors border-t border-x ${
                      activeModalTab === 'counters'
                        ? 'bg-white text-indigo-950 border-slate-200 shadow-2xs'
                        : 'bg-transparent text-slate-600 hover:text-slate-900 border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {isAdmin ? (
                        <Settings className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      Редактор счетчиков {isAdmin ? '(Админ)' : '🔒'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Modal Content Body */}
              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                {activeModalTab === 'log' ? (
                  <div className="space-y-3">
                    {/* Search & Stats Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={registrySearch}
                          onChange={(e) => setRegistrySearch(e.target.value)}
                          placeholder="Поиск по №, дате, составителю или теме..."
                          className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Registry Entries Table / List */}
                    {registryList.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-1">
                        <Archive className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-semibold text-slate-600">В базе пока нет зарегистрированных писем</p>
                        <p className="text-[11px] text-slate-400">Нажмите «Присвоить и зарегистрировать уникальный №», чтобы внести первое письмо в реестр</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {registryList
                          .filter(doc => {
                            if (!registrySearch.trim()) return true;
                            const query = registrySearch.toLowerCase();
                            return (
                              doc.regNumber.toLowerCase().includes(query) ||
                              doc.date.toLowerCase().includes(query) ||
                              doc.composerName.toLowerCase().includes(query) ||
                              doc.composerDept.toLowerCase().includes(query) ||
                              doc.subject.toLowerCase().includes(query) ||
                              doc.recipientName.toLowerCase().includes(query)
                            );
                          })
                          .map((doc) => (
                            <div key={doc.id} className="p-3 bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 rounded-lg transition-colors flex flex-wrap items-center justify-between gap-2">
                              <div className="space-y-1 flex-1 min-w-[240px]">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-100 font-mono font-bold text-xs rounded tracking-wider">
                                    № {doc.regNumber}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-700">
                                    от {doc.date}
                                  </span>
                                  <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                                    {doc.deptName}
                                  </span>
                                </div>

                                <div className="text-xs text-slate-800 font-medium">
                                  <span className="text-slate-500 font-normal">Тема:</span> {doc.subject}
                                </div>

                                <div className="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
                                  <span>Составитель: <strong className="text-slate-700">{doc.composerName}</strong> ({doc.composerDept})</span>
                                  <span>Получатель: <strong className="text-slate-700">{doc.recipientName}</strong></span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {isAdmin && doc.digitalSignatureKey && (
                                  <span className="px-2 py-0.5 text-indigo-950 bg-indigo-50 border border-indigo-200 rounded font-mono font-bold text-[10px] shadow-2xs" title="Уникальный ключ электронной подписи (виден только администратору)">
                                    Ключ ЭП: {doc.digitalSignatureKey}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">
                                  {doc.registeredAt}
                                </span>

                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (window.confirm(`Вы действительно хотите удалить документ № ${doc.regNumber} из Единого реестра?`)) {
                                        deleteRegisteredDocumentFromDb(doc.id);
                                        setRegistryList(getDocumentRegistry());
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                    title="Удалить из реестра (Администратор)"
                                  >
                                    <Trash2 className="w-4 h-4 text-rose-600" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* TAB 2: COUNTER EDITOR (ADMIN ONLY) */
                  <div className="space-y-4">
                    {!isAdmin ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center space-y-2">
                        <Lock className="w-8 h-8 text-slate-400 mx-auto" />
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">Доступ ограничен</h4>
                          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                            Редактирование счетчиков сквозной нумерации писем доступно только Администратору. Обычные пользователи могут регистрировать письма в автоматическом режиме.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-900 flex items-start gap-2">
                          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Режим Администратора:</strong> Вы можете вручную изменить следующий порядковый сквозной номер для любого структурного подразделения. Номер автоматически зафиксируется в реестре.
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {DEPARTMENT_CODES.map((dept) => {
                            const currentSeq = deptCounters[dept.code] || 1;
                            return (
                              <div key={dept.code} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-950 font-mono font-bold text-xs rounded border border-indigo-200">
                                      [{dept.code}]
                                    </span>
                                    <span className="font-bold text-xs text-slate-800">{dept.name.split(',')[0]}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">{dept.description}</div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="1"
                                    max="9999"
                                    value={currentSeq}
                                    onChange={(e) => {
                                      const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                      setDepartmentSeq(dept.code, val);
                                      setDeptCounters(getDeptCounters());
                                    }}
                                    className="w-16 text-xs p-1.5 rounded border border-slate-300 bg-white font-bold text-center text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 p-3 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
                {activeModalTab === 'counters' && isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Сбросить все сквозные счетчики подразделений на №1?')) {
                        DEPARTMENT_CODES.forEach(d => setDepartmentSeq(d.code, 1));
                        setDeptCounters(getDeptCounters());
                      }
                    }}
                    className="px-3 py-1.5 text-xs text-red-600 hover:text-red-800 font-semibold bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Сбросить все счетчики на №1</span>
                  </button>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCountersModalOpen(false)}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Document Body Text */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <div className="w-5 h-5 rounded-sm bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileCheck className="w-3.5 h-3.5" />
            </div>
            <span>4. Текст документа</span>
          </div>
        </div>

        {/* Quick Snippets & Editor */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 mb-1">
            <span>Официальные клише ({isInternal ? 'для внутренних документов' : 'для внешних писем'}):</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {isInternal ? (
              <>
                <button
                  type="button"
                  onClick={() => handleInsertTag('Довожу до Вашего сведения, что...')}
                  className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded border border-slate-200 transition-colors"
                >
                  «Довожу до Вашего сведения...»
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('Прошу Вас согласовать проведение работ по...')}
                  className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded border border-slate-200 transition-colors"
                >
                  «Прошу Вас согласовать...»
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('Направляю на рассмотрение проект документа...')}
                  className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded border border-slate-200 transition-colors"
                >
                  «Направляю на рассмотрение...»
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleInsertTag('Выражаем Вам свое уважение и настоящим информируем о том, что...')}
                  className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-700 rounded border border-slate-200 transition-colors"
                >
                  «Выражаем Вам свое уважение...»
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('В ответ на Ваш запрос №... направляем сведения по контракту.')}
                  className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-700 rounded border border-slate-200 transition-colors"
                >
                  «В ответ на Ваш запрос №...»
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag('Просим Вас рассмотреть коммерческое предложение на поставку продукции.')}
                  className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-700 rounded border border-slate-200 transition-colors"
                >
                  «Просим Вас рассмотреть предложение...»
                </button>
              </>
            )}
          </div>

          <textarea
            rows={8}
            value={rawText}
            onChange={(e) => !data.isPublished && handleTextareaChange(e.target.value)}
            readOnly={data.isPublished && !isAdmin}
            placeholder="Введите основной текст документа. Обычный перенос строки (Enter) сохраняет абзац, а пустая строка между абзацами разделяет блоки."
            className={`w-full text-xs p-3 rounded border transition-all leading-relaxed font-sans disabled:bg-slate-50 outline-none ${
              fieldErrors.content
                ? 'border-rose-500 bg-rose-50/30 text-rose-900 focus:ring-2 focus:ring-rose-500/20'
                : 'border-slate-300 focus:ring-1 focus:ring-indigo-500'
            }`}
          />
          {fieldErrors.content && (
            <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1 animate-in fade-in duration-150">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              <span>{fieldErrors.content}</span>
            </p>
          )}

          {/* LIVE TEXT COUNTER & STATS CARD */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-slate-700 font-sans shadow-2xs mt-2">
            <div className="p-1.5 bg-white rounded border border-slate-200/80">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Символов</span>
              <span className="text-xs font-mono font-extrabold text-slate-900">
                {rawText.length} <span className="text-[10px] text-slate-400 font-normal">({rawText.replace(/\s/g, '').length} без проб.)</span>
              </span>
            </div>
            <div className="p-1.5 bg-white rounded border border-slate-200/80">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Слов</span>
              <span className="text-xs font-mono font-extrabold text-slate-900">
                {pluralizeNoun(rawText.trim() === '' ? 0 : rawText.trim().split(/\s+/).filter(Boolean).length, ['слово', 'слова', 'слов'])}
              </span>
            </div>
            <div className="p-1.5 bg-white rounded border border-slate-200/80">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Абзацев</span>
              <span className="text-xs font-mono font-extrabold text-slate-900">
                {pluralizeNoun(rawText.trim() === '' ? 0 : rawText.split(/\n+/).filter(p => p.trim().length > 0).length, ['абзац', 'абзаца', 'абзацев'])}
              </span>
            </div>
            <div className="p-1.5 bg-white rounded border border-slate-200/80">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Страниц А4</span>
              <span className="text-xs font-mono font-extrabold text-indigo-700">
                ~ {pluralizeNoun(Math.max(1, Math.ceil(rawText.length / 2200)), ['страница', 'страницы', 'страниц'])}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Подсказка: разделяйте абзацы пустой строкой (двойной Enter). Красная строка не проставляется автоматически — при необходимости добавьте отступ вручную.
          </p>
        </div>
      </div>

      {/* 5. PUBLISH DOCUMENT ACTION CARD */}
      <div className="bg-slate-900 text-white rounded-xl p-5 space-y-4 shadow-lg border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">5. Публикация и регистрация документа в базе</h3>
            </div>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              При нажатии «Опубликовать и занести в базу писем» письму автоматически присваивается уникальный регистрационный номер из Единого реестра (с учетом даты и подразделения), письмо заносится в реестр, а все поля формы сбрасываются для составления нового документа.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePublishAndRegisterDocument}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-slate-950 text-slate-950" />
            <span>Опубликовать и занести в базу писем</span>
          </button>
        </div>

        {/* NOTIFICATION FEEDBACK MESSAGE AT THE BOTTOM */}
        {notifyMsg && (
          <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 ${
            notifyMsg.startsWith('ОШИБКА') 
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notifyMsg}</span>
          </div>
        )}
      </div>

      {/* PREVIEW WARNING CONFIRMATION MODAL */}
      {isPublishConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Подтверждение публикации
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Вы уверены, что хотите занести данный документ в Единый реестр писем АО «НПО «Тепломаш»?
                </p>
              </div>
            </div>

            {publishWarnings.length > 0 && (
              <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 text-xs space-y-1.5 leading-relaxed">
                <div className="font-bold text-red-950 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Проверьте документ перед публикацией:</span>
                </div>
                {publishWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-red-800 text-[11px] pl-1">
                    <span className="text-red-600 font-bold">•</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 text-xs text-slate-700 space-y-2 leading-relaxed">
              <div className="font-bold text-amber-950 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Что произойдет при нажатии «Опубликовать»:</span>
              </div>
              <ul className="space-y-1.5 text-slate-700 text-[11px] pl-1">
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>Документу присвоится номер: <strong className="font-mono text-indigo-950 font-bold bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200">№ {data.refNumber || generateDocumentNumber(data.date || new Date().toLocaleDateString('ru-RU'), seqIndex, selectedDeptCode)}</strong></span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>Запись о документе будет <strong>зафиксирована в реестре</strong>.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>Все поля формы будут <strong>автоматически сброшены</strong> для ввода следующего обращения.</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPublishConfirmOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPublishConfirmOpen(false);
                  executeRegistration();
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                <span>Да, опубликовать</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certified Document Correction Modal */}
      <CorrectionModal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        documentData={data}
        onConfirmCorrection={handleApplyCorrection}
      />
    </div>
  );
};


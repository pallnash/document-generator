import React, { useRef, useState, useEffect, useMemo } from 'react';
import { SignatureConfig, SavedSignatureItem, DocumentData } from '../types';
import { SignatureCanvasModal } from './SignatureCanvasModal';
import { SAMPLE_STAMPS, getInitialBlankDocument } from '../constants/presets';
import { TEPLOMASH_EMPLOYEES, TeplomashEmployee } from '../constants/teplomashEmployees';
import { buildStampSvg, downloadSvgFile, generateDigitalSignatureKey } from '../utils/stampUtils';
import { validateDocument } from '../utils/validationUtils';
import { 
  registerDocumentInDb, 
  getDocumentRegistry, 
  guessDepartmentCode, 
  generateDocumentNumber, 
  getNextDepartmentSeq 
} from '../constants/departmentCodes';
import { 
  UserCheck, 
  PenTool, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Users, 
  BookmarkCheck, 
  Plus, 
  Check, 
  FolderHeart, 
  Sparkles, 
  Download,
  Send,
  Zap,
  AlertTriangle,
  ShieldAlert,
  Lock,
  Search
} from 'lucide-react';

const SAVED_SIGNATURES_KEY = 'doc_gen_saved_signatures_v2';

const SAMPLE_SAVED_SIGNATURES: SavedSignatureItem[] = [
  {
    id: 'sig-sample-1',
    title: 'Образец: подпись (директор)',
    imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="80" viewBox="0 0 220 80"><path d="M 20,50 Q 30,10 45,40 T 70,30 T 90,60 T 120,20 T 150,50 T 180,35" fill="none" stroke="%231e3a8a" stroke-width="3" stroke-linecap="round"/><path d="M 35,45 Q 60,65 100,55 T 160,40" fill="none" stroke="%231e3a8a" stroke-width="2" stroke-linecap="round"/><path d="M 110,25 Q 130,15 140,30" fill="none" stroke="%231e3a8a" stroke-width="2.5" stroke-linecap="round"/></svg>',
    createdAt: '01.08.2026',
    senderName: '',
    senderPosition: 'Генеральный директор',
    senderDepartment: 'Дирекция'
  },
  {
    id: 'sig-sample-2',
    title: 'Образец: подпись (главный инженер)',
    imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="80" viewBox="0 0 220 80"><path d="M 15,40 C 30,10 40,65 55,30 C 70,10 80,55 95,35 L 125,50 M 110,30 C 130,20 150,45 175,30" fill="none" stroke="%231d4ed8" stroke-width="2.8" stroke-linecap="round"/><path d="M 40,55 Q 90,20 160,50" fill="none" stroke="%231d4ed8" stroke-width="2" stroke-linecap="round"/></svg>',
    createdAt: '03.08.2026',
    senderName: '',
    senderPosition: 'Главный инженер',
    senderDepartment: 'Служба главного инженера'
  }
];

interface SignatureSettingsProps {
  signature: SignatureConfig;
  onChange: (signature: SignatureConfig) => void;
  onOpenEmployeeModal?: () => void;
  employees?: typeof TEPLOMASH_EMPLOYEES;
  isAdmin?: boolean;
  docData?: DocumentData;
  onDocDataChange?: (data: DocumentData) => void;
  onPublishAndRegister?: () => void;
}

export const SignatureSettings: React.FC<SignatureSettingsProps> = ({ 
  signature, 
  onChange, 
  onOpenEmployeeModal, 
  employees, 
  isAdmin,
  docData,
  onDocDataChange,
  onPublishAndRegister
}) => {
  const employeeList = employees || [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [showStampEditor, setShowStampEditor] = useState(false);
  const [senderSearchQuery, setSenderSearchQuery] = useState('');
  const [isSenderDropdownOpen, setIsSenderDropdownOpen] = useState(false);

  // Custom stamp form states
  const [stampOrg, setStampOrg] = useState('АКЦИОНЕРНОЕ ОБЩЕСТВО «НПО «ТЕПЛОМАШ»');
  const [stampCityOgrn, setStampCityOgrn] = useState('САНКТ-ПЕТЕРБУРГ * ОГРН 1027809212573');
  const [stampDepartment, setStampDepartment] = useState(signature.senderDepartment || 'Бюро автоматики');
  const [stampPosition, setStampPosition] = useState(signature.senderPosition || 'Ведущий инженер-программист');
  const [stampCenterSub, setStampCenterSub] = useState('ДЛЯ ДОКУМЕНТОВ');
  const [stampColor, setStampColor] = useState('#1d4ed8');

  // Auto-sync stamp department & position when sender info is updated from employee selector
  useEffect(() => {
    if (signature.senderDepartment) {
      setStampDepartment(signature.senderDepartment);
    }
    if (signature.senderPosition) {
      setStampPosition(signature.senderPosition);
    }
  }, [signature.senderDepartment, signature.senderPosition]);

  const filteredSenderEmployees = useMemo(() => {
    const q = senderSearchQuery.trim().toLowerCase();
    if (!q) return employeeList.slice(0, 8);
    return employeeList.filter(emp => {
      const text = `${emp.fullName} ${emp.shortName} ${emp.department} ${emp.position}`.toLowerCase();
      return text.includes(q);
    }).slice(0, 10);
  }, [employeeList, senderSearchQuery]);

  const handleSelectSender = (emp: TeplomashEmployee) => {
    const stampSvg = buildStampSvg(
      stampOrg,
      stampCityOgrn,
      emp.department,
      emp.position,
      stampCenterSub,
      stampColor
    );
    onChange({
      ...signature,
      senderPosition: emp.position,
      senderDepartment: emp.department,
      senderOrganization: emp.organization,
      senderName: emp.shortName,
      senderEmail: emp.email,
      showStamp: true,
      stampImageUrl: stampSvg
    });
    setSenderSearchQuery('');
    setIsSenderDropdownOpen(false);
  };

  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);

  const handlePublishClick = () => {
    if (onPublishAndRegister) {
      onPublishAndRegister();
      return;
    }

    if (!docData) return;

    // Check mandatory fields validation
    const valErrors = validateDocument(docData);
    if (valErrors.length > 0) {
      setNotifyMsg(`ОШИБКА: Заполните обязательные поля (${valErrors.map(e => e.title).join('; ')})`);
      setTimeout(() => setNotifyMsg(null), 6000);
      return;
    }

    // Check duplicate
    const registry = getDocumentRegistry();
    const newSubject = (docData.docSubject || docData.docType || '').trim().toLowerCase();
    const newRecipient = (docData.recipient.name || docData.recipient.organization || '').trim().toLowerCase();

    if (newSubject.length > 0) {
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

    setIsPublishConfirmOpen(true);
  };

  const executeRegistration = () => {
    if (!docData) return;
    const todayDate = new Date().toLocaleDateString('ru-RU');
    const deptCodeToUse = guessDepartmentCode(signature.senderDepartment, signature.senderPosition);

    const digitalKey = signature.useDigitalSignature ? (signature.digitalSignatureKey || generateDigitalSignatureKey()) : undefined;

    const { registeredDoc } = registerDocumentInDb({
      dateStr: todayDate,
      deptCode: deptCodeToUse,
      composerName: signature.senderName || 'Не указан',
      composerDept: signature.senderDepartment || signature.senderPosition || 'Дирекция',
      recipientName: docData.recipient.name ? `${docData.recipient.organization || ''} (${docData.recipient.name})` : (docData.recipient.organization || 'Внутренний адресат'),
      subject: docData.docSubject || docData.docType || 'Официальный документ',
      role: isAdmin ? 'admin' : 'user',
      digitalSignatureKey: digitalKey
    });

    const publishedDoc: DocumentData = {
      ...docData,
      refNumber: registeredDoc.regNumber,
      date: todayDate,
      isPublished: true,
      signature: {
        ...signature,
        useDigitalSignature: signature.useDigitalSignature,
        digitalSignatureKey: digitalKey || signature.digitalSignatureKey
      }
    };

    // Auto-save published document into documents archive
    const savedTitle = `${docData.docType || 'Документ'} № ${registeredDoc.regNumber} от ${todayDate}`;
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

    if (onDocDataChange) {
      onDocDataChange(publishedDoc);
    }

    const keySuffix = digitalKey ? ` (Ключ ЭП: ${digitalKey})` : '';
    setNotifyMsg(`ОПУБЛИКОВАНО! Письмо зарегистрировано под № ${registeredDoc.regNumber}${keySuffix} и сохранено в «Документы». Редактирование заблокировано.`);
    setTimeout(() => setNotifyMsg(null), 6000);
  };

  // Saved Signatures state & localStorage syncing
  const [savedSignaturesList, setSavedSignaturesList] = useState<SavedSignatureItem[]>(() => {
    const saved = localStorage.getItem(SAVED_SIGNATURES_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { return SAMPLE_SAVED_SIGNATURES; }
    }
    return SAMPLE_SAVED_SIGNATURES;
  });

  useEffect(() => {
    localStorage.setItem(SAVED_SIGNATURES_KEY, JSON.stringify(savedSignaturesList));
  }, [savedSignaturesList]);

  const [newSigTitle, setNewSigTitle] = useState('');
  const [saveSuccessNotify, setSaveSuccessNotify] = useState(false);
  const [saveErrorNotify, setSaveErrorNotify] = useState<string | null>(null);

  const isLocked = !!docData?.isPublished;

  // Check if current signature image or title is identical to already saved one
  const isCurrentSignatureDuplicate = signature.imageUrl ? savedSignaturesList.some(item => 
    item.imageUrl === signature.imageUrl || 
    (item.imageUrl.trim() === signature.imageUrl?.trim()) ||
    (signature.senderName && item.senderName && item.senderName.trim().toLowerCase() === signature.senderName.trim().toLowerCase() && item.imageUrl === signature.imageUrl)
  ) : false;

  const handleSaveCurrentSignatureToGallery = (customTitle?: string) => {
    if (!signature.imageUrl) return;

    // Reject duplicate signature if already saved
    const isDuplicate = savedSignaturesList.some(item => 
      item.imageUrl === signature.imageUrl ||
      item.imageUrl.trim() === signature.imageUrl?.trim() ||
      (customTitle && item.title.trim().toLowerCase() === customTitle.trim().toLowerCase() && item.senderName === signature.senderName)
    );

    if (isDuplicate) {
      setSaveErrorNotify('Данная подпись уже сохранена в базе! Повторное сохранение запрещено.');
      setTimeout(() => setSaveErrorNotify(null), 4000);
      return;
    }

    const title = customTitle || newSigTitle.trim() || `Подпись: ${signature.senderName || 'Сотрудник'} (${new Date().toLocaleDateString('ru-RU')})`;
    const newSavedItem: SavedSignatureItem = {
      id: `saved-sig-${Date.now()}`,
      title,
      imageUrl: signature.imageUrl,
      createdAt: new Date().toLocaleDateString('ru-RU'),
      senderName: signature.senderName,
      senderPosition: signature.senderPosition,
      senderDepartment: signature.senderDepartment
    };

    const updated = [newSavedItem, ...savedSignaturesList];
    setSavedSignaturesList(updated);
    setNewSigTitle('');
    setSaveSuccessNotify(true);
    setSaveErrorNotify(null);
    setTimeout(() => setSaveSuccessNotify(false), 2500);
  };

  const handleDeleteSavedSignature = (id: string) => {
    const updated = savedSignaturesList.filter(item => item.id !== id);
    setSavedSignaturesList(updated);
  };

  const handleApplySavedSignature = (item: SavedSignatureItem) => {
    onChange({
      ...signature,
      type: 'image',
      imageUrl: item.imageUrl,
      senderName: item.senderName || signature.senderName,
      senderPosition: item.senderPosition || signature.senderPosition,
      senderDepartment: item.senderDepartment || signature.senderDepartment
    });
  };

  const handleApplyCustomStamp = () => {
    const customSvg = buildStampSvg(stampOrg, stampCityOgrn, stampDepartment, stampPosition, stampCenterSub, stampColor);
    onChange({
      ...signature,
      showStamp: true,
      stampImageUrl: customSvg
    });
  };

  const handleSignatureImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          const uploadedUrl = evt.target.result as string;
          onChange({
            ...signature,
            type: 'image',
            imageUrl: uploadedUrl
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          onChange({
            ...signature,
            showStamp: true,
            stampImageUrl: evt.target.result as string
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sender Details ("Кто написал письмо") */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <div className="w-5 h-5 rounded-sm bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UserCheck className="w-3 h-3" />
            </div>
            <span>Кто написал письмо (Составитель / Подписант)</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>База tmdata/</span>
            </div>
            {onOpenEmployeeModal && (
              <button
                type="button"
                onClick={onOpenEmployeeModal}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 rounded transition-colors border border-slate-200"
              >
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                База Тепломаш
              </button>
            )}
          </div>
        </div>

        {/* Search & Quick Teplomash employee selection for Sender */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-600" />
              <span>Поиск составителя в базе tmdata/:</span>
            </div>
            <span className="text-[10px] text-slate-400">Ручное редактирование отключено</span>
          </div>

          <div className="relative">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={senderSearchQuery}
                onChange={(e) => {
                  setSenderSearchQuery(e.target.value);
                  setIsSenderDropdownOpen(true);
                }}
                onFocus={() => setIsSenderDropdownOpen(true)}
                placeholder="Введите ФИО, отдел или должность сотрудника для выбора..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-md border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-medium placeholder:text-slate-400"
              />
            </div>

            {isSenderDropdownOpen && filteredSenderEmployees.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                {filteredSenderEmployees.map(emp => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelectSender(emp)}
                    className="w-full p-2 text-left hover:bg-indigo-50/80 transition-colors flex items-center justify-between gap-2"
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

          <div className="pt-1">
            <div className="text-[10px] font-semibold text-slate-500 mb-1.5">Быстрый выбор из списка:</div>
            <div className="flex flex-wrap gap-1.5">
              {employeeList.slice(0, 8).map(emp => {
                const isSelected = signature.senderName === emp.shortName || signature.senderName === emp.fullName;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelectSender(emp)}
                    className={`px-2 py-1 text-[11px] font-medium rounded border transition-colors shadow-2xs text-left ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border-slate-200 hover:border-indigo-200'
                    }`}
                  >
                    <span className="font-bold">{emp.shortName}</span>
                    <span className={isSelected ? 'text-indigo-200 mx-1' : 'text-slate-400 mx-1'}>•</span>
                    <span className={isSelected ? 'text-indigo-100 font-semibold' : 'text-indigo-600 font-semibold'}>{emp.department}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                <span>Отдел / Подразделение</span>
                <span className="text-[10px] font-normal text-slate-400 lowercase flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> из базы tmdata/
                </span>
              </label>
              <input
                type="text"
                readOnly
                value={signature.senderDepartment || ''}
                placeholder="Заполняется автоматически из базы tmdata/"
                className="w-full text-xs p-2.5 rounded border border-slate-200 bg-slate-50 text-slate-700 font-medium outline-none cursor-default"
                title="Поле подтягивается из базы сотрудников tmdata/ (ручное редактирование запрещено)"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                <span>Должность подписанта</span>
                <span className="text-[10px] font-normal text-slate-400 lowercase flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> из базы tmdata/
                </span>
              </label>
              <input
                type="text"
                readOnly
                value={signature.senderPosition || ''}
                placeholder="Заполняется автоматически из базы tmdata/"
                className="w-full text-xs p-2.5 rounded border border-slate-200 bg-slate-50 text-slate-700 font-medium outline-none cursor-default"
                title="Поле подтягивается из базы сотрудников tmdata/ (ручное редактирование запрещено)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                <span>Инициалы и фамилия (ФИО)</span>
                <span className="text-[10px] font-normal text-slate-400 lowercase flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> из базы tmdata/
                </span>
              </label>
              <input
                type="text"
                readOnly
                value={signature.senderName || ''}
                placeholder="Заполняется автоматически из базы tmdata/"
                className="w-full text-xs p-2.5 rounded border border-slate-200 bg-slate-50 text-slate-900 font-bold outline-none cursor-default"
                title="Поле подтягивается из базы сотрудников tmdata/ (ручное редактирование запрещено)"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                <span>Наименование организации</span>
                <span className="text-[10px] font-normal text-slate-400 lowercase flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> из базы tmdata/
                </span>
              </label>
              <input
                type="text"
                readOnly
                value={signature.senderOrganization || ''}
                placeholder="Заполняется автоматически из базы tmdata/"
                className="w-full text-xs p-2.5 rounded border border-slate-200 bg-slate-50 text-slate-700 font-medium outline-none cursor-default"
                title="Поле подтягивается из базы сотрудников tmdata/ (ручное редактирование запрещено)"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Signature Type Selection (Обычная / Электронная) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
          Выбор типа подписи документа:
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Option 1: Standard Signature */}
          <button
            type="button"
            onClick={() => {
              onChange({
                ...signature,
                useDigitalSignature: false
              });
            }}
            className={`p-3.5 rounded-lg border text-left transition-all flex items-start gap-3 cursor-pointer ${
              !signature.useDigitalSignature
                ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-600 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
              !signature.useDigitalSignature ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400 bg-white'
            }`}>
              {!signature.useDigitalSignature && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Обычная подпись</div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                Ручная роспись, факсимиле или поле для личной подписи
              </div>
            </div>
          </button>

          {/* Option 2: Electronic Digital Signature (ЭП) */}
          <button
            type="button"
            onClick={() => {
              const key = signature.digitalSignatureKey || generateDigitalSignatureKey();
              const dateStr = signature.digitalSignatureDate || new Date().toLocaleString('ru-RU', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
              });
              onChange({
                ...signature,
                useDigitalSignature: true,
                digitalSignatureKey: key,
                digitalSignatureDate: dateStr
              });
            }}
            className={`p-3.5 rounded-lg border text-left transition-all flex items-start gap-3 cursor-pointer ${
              signature.useDigitalSignature
                ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-600 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
              signature.useDigitalSignature ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400 bg-white'
            }`}>
              {signature.useDigitalSignature && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Электронная подпись (ЭП)</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                Официальный штамп с автоматически сгенерированным уникальным ключом ГОСТ
              </div>
            </div>
          </button>
        </div>

        {/* Digital Signature Auto-Generated Stamp Preview */}
        {signature.useDigitalSignature && (
          <div className="mt-3 pt-3 border-t border-indigo-100 space-y-2">
            <div className="border-2 border-indigo-900 rounded-md bg-emerald-50/30 p-3 shadow-2xs space-y-1 text-xs">
              <div className="border-b border-indigo-200 pb-1 font-bold text-indigo-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
                  <ShieldCheck className="w-4 h-4 text-indigo-700" />
                  🛡 ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ (ГОСТ)
                </span>
                <span className="text-[10px] text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded font-mono">
                  АВТОКЛЮЧ
                </span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-800 pt-0.5">
                <div>
                  <span className="text-slate-500 font-medium">Ключ ЭП (сохраняется в реестр):</span>{' '}
                  <span className="font-mono font-bold text-indigo-950 bg-indigo-100/80 px-1.5 py-0.5 rounded border border-indigo-300">
                    {signature.digitalSignatureKey || generateDigitalSignatureKey()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Владелец ключа:</span>{' '}
                  <strong className="font-semibold text-slate-900">{signature.senderName || 'Сотрудник'}</strong> ({signature.senderPosition || 'Должность'})
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Дата и время подписания:</span>{' '}
                  <span>{signature.digitalSignatureDate || new Date().toLocaleString('ru-RU')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Standard Graphic Signature Options (Shown ONLY when Digital Signature is OFF) */}
      {!signature.useDigitalSignature && (
        <>
          <div className="bg-white border border-slate-200 rounded p-4 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
              <div className="w-5 h-5 rounded-sm bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <PenTool className="w-3 h-3" />
              </div>
              <span>Вид подписи в документе (Обычная / Графическая)</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...signature, type: 'placeholder' })}
                className={`p-3 rounded border text-center transition-all flex flex-col items-center gap-1.5 ${
                  signature.type === 'placeholder'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="w-full border-b border-dashed border-slate-400 py-1 text-[11px] text-slate-400">________</div>
                <span className="text-xs font-semibold text-slate-800">Место для личной подписи</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCanvasOpen(true)}
                className={`p-3 rounded border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                  signature.type === 'canvas' || (signature.type === 'image' && signature.imageUrl)
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <PenTool className="w-5 h-5 text-indigo-600" />
                <span className="text-xs font-semibold text-slate-800">Нарисовать на экране</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded border border-slate-200 hover:border-slate-300 bg-white text-center transition-all flex flex-col items-center justify-center gap-1.5"
              >
                <Upload className="w-5 h-5 text-indigo-600" />
                <span className="text-xs font-semibold text-slate-800">Загрузить сканированную PNG</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSignatureImageUpload}
              className="hidden"
            />

            {/* Display Current Signature Graphic & Save to Library Option */}
            {signature.imageUrl && (
              <div className="space-y-3">
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-12 bg-white rounded border border-slate-200 p-1 flex items-center justify-center shrink-0">
                      <img src={signature.imageUrl} alt="Электронная подпись" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Подпись добавлена в документ
                      </span>
                      <p className="text-[11px] text-slate-500">Появится в нижней части бланка</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onChange({ ...signature, imageUrl: null, type: 'placeholder' })}
                      className="text-red-600 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 text-xs font-semibold transition-colors flex items-center gap-1"
                      title="Удалить подпись"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Удалить
                    </button>
                  </div>
                </div>

                {/* Save current signature to gallery box (Admin Only) */}
                {isAdmin && (
                  <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <BookmarkCheck className="w-4 h-4 text-indigo-600" />
                        Сохранить эту подпись в базу для многократного использования
                      </span>
                      {saveSuccessNotify && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1 animate-fadeIn">
                          <Check className="w-3 h-3" /> Сохранено!
                        </span>
                      )}
                      {saveErrorNotify && (
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 flex items-center gap-1 animate-fadeIn">
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> {saveErrorNotify}
                        </span>
                      )}
                      {isCurrentSignatureDuplicate && !saveErrorNotify && !saveSuccessNotify && (
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded flex items-center gap-1">
                          <Check className="w-3 h-3 text-slate-600" /> Подпись уже сохранена в базе
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSigTitle}
                        onChange={(e) => setNewSigTitle(e.target.value)}
                        placeholder={`Название (например: Подпись ${signature.senderName || 'Орлова Д.С.'})`}
                        disabled={isCurrentSignatureDuplicate}
                        className="flex-1 text-xs p-2 rounded border border-indigo-200 bg-white focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      <button
                        type="button"
                        disabled={isCurrentSignatureDuplicate}
                        onClick={() => handleSaveCurrentSignatureToGallery()}
                        className={`px-3 py-2 font-bold text-xs rounded transition-all flex items-center gap-1 shrink-0 ${
                          isCurrentSignatureDuplicate
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs'
                        }`}
                        title={isCurrentSignatureDuplicate ? 'Данная подпись уже есть в базе' : 'Сохранить подпись в базу'}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isCurrentSignatureDuplicate ? 'Уже в базе' : 'Сохранить в базу'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Saved Signatures Gallery Section (Admin Only) */}
          {isAdmin && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <div className="w-5 h-5 rounded-sm bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FolderHeart className="w-3.5 h-3.5" />
                  </div>
                  <span>База сохраненных подписей ({savedSignaturesList.length})</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Выберите сохраненную подпись в 1 клик</span>
              </div>

              {savedSignaturesList.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  У вас пока нет сохраненных подписей. Нарисуйте или загрузите подпись выше и нажмите «Сохранить в базу».
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {savedSignaturesList.map((saved) => (
                    <div
                      key={saved.id}
                      className={`border rounded-xl p-3 transition-all flex flex-col justify-between bg-white hover:shadow-xs ${
                        signature.imageUrl === saved.imageUrl
                          ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30'
                          : 'border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]" title={saved.title}>
                            {saved.title}
                          </span>
                          <span className="text-[10px] text-slate-400">{saved.createdAt}</span>
                        </div>

                        <div className="h-16 bg-slate-50 rounded-lg border border-slate-200 p-1.5 flex items-center justify-center mb-2 overflow-hidden">
                          <img src={saved.imageUrl} alt={saved.title} className="max-h-full max-w-full object-contain" />
                        </div>

                        {saved.senderName && (
                          <div className="text-[11px] text-slate-500 mb-2">
                            <span className="font-semibold text-slate-700">{saved.senderName}</span>
                            {saved.senderPosition && <span> ({saved.senderPosition})</span>}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleApplySavedSignature(saved)}
                          className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                            signature.imageUrl === saved.imageUrl
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200'
                          }`}
                        >
                          {signature.imageUrl === saved.imageUrl ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Активна в документе
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              Подставить в документ
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSavedSignature(saved.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Удалить подпись из базы"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Signature Canvas Modal */}
      <SignatureCanvasModal
        isOpen={isCanvasOpen}
        defaultTitle={signature.senderName ? `Факсимиле: ${signature.senderName}` : ''}
        onClose={() => setIsCanvasOpen(false)}
        onSave={(drawnDataUrl, title) => {
          const updatedSig = {
            ...signature,
            type: 'canvas' as const,
            imageUrl: drawnDataUrl
          };
          onChange(updatedSig);
          if (title) {
            handleSaveCurrentSignatureToGallery(title);
          }
        }}
      />

      {/* PUBLISH DOCUMENT ACTION CARD IN SIGNATURE SECTION */}
      <div className="bg-slate-900 text-white rounded-xl p-5 space-y-4 shadow-lg border border-slate-800 mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Публикация и регистрация документа в базе</h3>
            </div>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              При нажатии «Опубликовать и занести в базу писем» письму автоматически присваивается уникальный регистрационный номер из Единого реестра (с учетом даты и подразделения), письмо заносится в реестр, а все поля формы сбрасываются для составления нового документа.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePublishClick}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-slate-950 text-slate-950" />
            <span>Опубликовать и занести в базу писем</span>
          </button>
        </div>

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

      {/* WARNING CONFIRMATION MODAL */}
      {isPublishConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4 text-slate-900">
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

            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 text-xs text-slate-700 space-y-2 leading-relaxed">
              <div className="font-bold text-amber-950 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Что произойдет при нажатии «Опубликовать»:</span>
              </div>
              <ul className="space-y-1.5 text-slate-700 text-[11px] pl-1">
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>Документу будет официально присвоен уникальный номер и дата.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>Запись о документе зафиксируется в Едином реестре писем.</span>
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
    </div>
  );
};

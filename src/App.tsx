import React, { useState, useEffect } from 'react';
import { DocumentData, DocumentVersion } from './types';
import { INITIAL_DOCUMENT, TEPLOMASH_OFFICIAL_HEADER_URL } from './constants/presets';
import { DocumentForm } from './components/DocumentForm';
import { SignatureSettings } from './components/SignatureSettings';
import { DocumentPreview } from './components/DocumentPreview';
import { DraftsModal, SavedDraft } from './components/DraftsModal';
import { TeplomashEmployeeSelectorModal } from './components/TeplomashEmployeeSelectorModal';
import { AuthModal } from './components/AuthModal';
import { ExportModal } from './components/ExportModal';
import { PrintModal } from './components/PrintModal';
import { RegistryModal } from './components/RegistryModal';
import { PortalAuthGate } from './components/PortalAuthGate';
import { usePortalAuth } from './hooks/usePortalAuth';
import { triggerSystemPrint } from './utils/printUtils';
import { validateDocument, ValidationError } from './utils/validationUtils';
import { ValidationModal } from './components/ValidationModal';
import { TeplomashEmployee, TEPLOMASH_EMPLOYEES, sanitizeEmployeeDepartments } from './constants/teplomashEmployees';
import { SAMPLE_STAMPS } from './constants/presets';
import { useMicroserviceBridge } from './hooks/useMicroserviceBridge';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { readRole, writeRole, clearRole } from './utils/authUtils';
import { microserviceBridge } from './services/microserviceBridge';
import { buildStampSvg } from './utils/stampUtils';
import { downloadDocumentAsEml } from './utils/emlUtils';
import { 
  guessDepartmentCode, 
  getNextDepartmentSeq, 
  generateDocumentNumber 
} from './constants/departmentCodes';
import type { RegisteredDocument } from './types';
import { 
  FileText, 
  Printer, 
  UserCheck, 
  PenTool, 
  FolderOpen, 
  Plus, 
  Save, 
  History,
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Sparkles,
  Download,
  Copy,
  Check,
  FileCheck,
  Users,
  Building2,
  Shield,
  User,
  LogIn,
  LogOut,
  KeyRound,
  Mail,
  Paperclip,
  ArrowLeft,
  Globe,
  Home
} from 'lucide-react';
import { Button, Badge, Card } from './components/ui';
import { sanitizeDocumentDataEncoding, fixMojibake } from './utils/encodingUtils';

const STORAGE_KEY = 'official_doc_builder_data';
const DRAFTS_KEY = 'official_doc_drafts_history';
const EMPLOYEES_KEY = 'teplomash_employees_db';

export default function App() {
  // Portal JWT Auth Gate Hook
  const portalAuthState = usePortalAuth('DOC_GENERATOR_ACCESS');

  // Auth & User Role State
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(() => readRole());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => !readRole());

  const handleSelectRole = (role: 'admin' | 'user') => {
    setUserRole(role);
    writeRole(role);
  };

  const handleLogoutRole = () => {
    setUserRole(null);
    clearRole();
    setIsAuthModalOpen(true);
  };

  const [employees, setEmployees] = useState<TeplomashEmployee[]>(() => {
    const saved = localStorage.getItem(EMPLOYEES_KEY);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return sanitizeEmployeeDepartments(parsed);
        }
      } catch {
        return [];
      }
    }
    return sanitizeEmployeeDepartments(TEPLOMASH_EMPLOYEES);
  });

  // Локальная база сотрудников (файл в .gitignore, персональные данные).
  // Загружается один раз при первом запуске, если хранилище пусто.
  useEffect(() => {
    const saved = localStorage.getItem(EMPLOYEES_KEY);
    if (saved !== null) return; // пользователь уже имеет базу
    fetch('employees.local.json', { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: TeplomashEmployee[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const filled = data.filter(e => e.fullName && e.shortName);
          if (filled.length > 0) {
            setEmployees(sanitizeEmployeeDepartments(filled));
          }
        }
      })
      .catch(() => { /* файл отсутствует — база останется пустой */ });
  }, []);

  useEffect(() => {
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
  }, [employees]);

  const [docData, setDocData] = useState<DocumentData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const sanitized = sanitizeDocumentDataEncoding(parsed);
        // Always enforce official locked Teplomash header and GOST R 7.0.97-2025 default margins
        sanitized.header = {
          ...sanitized.header,
          type: 'preset',
          imageUrl: TEPLOMASH_OFFICIAL_HEADER_URL
        };
        sanitized.margins = {
          top: 20,
          bottom: 20,
          left: 20,
          right: 10
        };
        return sanitized;
      } catch { return INITIAL_DOCUMENT; }
    }
    return INITIAL_DOCUMENT;
  });

  const [activeTab, setActiveTab] = useState<'fields' | 'signature'>('fields');
  const isAdmin = userRole === 'admin';
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isDraftsOpen, setIsDraftsOpen] = useState<boolean>(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState<boolean>(false);
  const [isRegistryOpen, setIsRegistryOpen] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [savedNotification, setSavedNotification] = useState<boolean>(false);

  const handleApplyEmployeeRecipient = (emp: TeplomashEmployee) => {
    let formattedPosition = emp.dativePosition || emp.position;
    if (emp.department && !formattedPosition.toLowerCase().includes(emp.department.toLowerCase())) {
      formattedPosition = `${formattedPosition} (${emp.department})`;
    }

    setDocData(prev => ({
      ...prev,
      recipient: {
        recipientType: 'internal',
        position: formattedPosition,
        organization: emp.organization,
        name: emp.dativeName || emp.shortName,
        email: emp.email
      }
    }));
  };

  const handleApplyEmployeeSender = (emp: TeplomashEmployee) => {
    const stampSvg = buildStampSvg(
      'АКЦИОНЕРНОЕ ОБЩЕСТВО «НПО «ТЕПЛОМАШ»',
      'САНКТ-ПЕТЕРБУРГ * ОГРН 1027809212573',
      emp.department,
      emp.position,
      'ДЛЯ ДОКУМЕНТОВ',
      '#1d4ed8'
    );

    const deptCode = guessDepartmentCode(emp.department, emp.position);
    const seq = getNextDepartmentSeq(deptCode);
    const newRefNumber = generateDocumentNumber(docData.date, seq, deptCode);

    setDocData(prev => ({
      ...prev,
      refNumber: newRefNumber,
      signature: {
        ...prev.signature,
        senderPosition: emp.position,
        senderDepartment: emp.department,
        senderOrganization: emp.organization,
        senderName: emp.shortName,
        senderEmail: emp.email,
        showStamp: false,
        stampImageUrl: null
      }
    }));
  };

  const [draftsList, setDraftsList] = useState<SavedDraft[]>(() => {
    const saved = localStorage.getItem(DRAFTS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(draft => ({
            ...draft,
            title: fixMojibake(draft.title || ''),
            data: sanitizeDocumentDataEncoding(draft.data)
          }));
        }
        return [];
      } catch { return []; }
    }
    return [];
  });

  // Auto-save active document to local storage (debounced: не пишем localStorage
  // и не шлём postMessage на каждый введённый символ)
  const debouncedDocData = useDebouncedValue(docData, 400);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(debouncedDocData));
    microserviceBridge.emit('DOCUMENT_CHANGED', debouncedDocData);
  }, [debouncedDocData]);

  // Microfrontend / Microservice PostMessage Bridge Listener
  useMicroserviceBridge({
    onInitDocument: (incomingData) => {
      setDocData(prev => sanitizeDocumentDataEncoding({
        ...prev,
        ...incomingData
      }));
    },
    onGetDocumentRequest: () => docData
  });

  const handleReturnToPortal = () => {
    // Dispatch postMessage event to host container / 1C / Portal
    microserviceBridge.emit('RETURN_TO_PORTAL', {
      action: 'close_microservice',
      document: docData
    });

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        service: 'generator-doc-gost',
        type: 'RETURN_TO_PORTAL',
        payload: { action: 'close' }
      }, '*');
    } else {
      // Открыто обычной ссылкой (не iframe) на том же origin, что и портал —
      // document.referrer ненадёжен (пуст при обновлении страницы/переходе по
      // закладке), портал всегда на корне этого же origin.
      window.location.href = '/';
    }
  };

  const handleSaveCurrentAsDraft = (
    title: string, 
    bumpType: 'none' | 'minor' | 'major' = 'minor', 
    comment: string = ''
  ) => {
    const nowStr = new Date().toLocaleString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const currentVersion = docData.version || '1.0';
    let newVersion = currentVersion;
    if (bumpType === 'minor') {
      const parts = currentVersion.split('.').map(p => parseInt(p, 10) || 0);
      newVersion = `${parts[0] || 1}.${(parts[1] || 0) + 1}`;
    } else if (bumpType === 'major') {
      const parts = currentVersion.split('.').map(p => parseInt(p, 10) || 0);
      newVersion = `${(parts[0] || 1) + 1}.0`;
    }

    const currentSnapshot: DocumentData = JSON.parse(JSON.stringify(docData));
    currentSnapshot.version = newVersion;

    const newVersionRecord: DocumentVersion = {
      id: `ver-${Date.now()}`,
      version: newVersion,
      timestamp: nowStr,
      createdAt: nowStr,
      updatedBy: docData.signature.senderName || 'Пользователь',
      author: docData.signature.senderName || 'Пользователь',
      comment: comment || (bumpType === 'major' ? 'Новая редакция документа' : bumpType === 'minor' ? 'Корректировка документа' : 'Сохранение копии'),
      dataSnapshot: currentSnapshot
    };

    const existingHistory = docData.versionHistory || [];
    const updatedHistory = [newVersionRecord, ...existingHistory];

    const updatedDocData: DocumentData = {
      ...docData,
      version: newVersion,
      versionHistory: updatedHistory
    };

    setDocData(updatedDocData);

    const newDraft: SavedDraft = {
      id: `draft-${Date.now()}`,
      title: title,
      savedAt: nowStr,
      version: newVersion,
      versionHistory: updatedHistory,
      data: updatedDocData
    };

    const updatedDrafts = [newDraft, ...draftsList];
    setDraftsList(updatedDrafts);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(updatedDrafts));

    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2500);
  };

  const handleDeleteDraft = (id: string) => {
    const updated = draftsList.filter(d => d.id !== id);
    setDraftsList(updated);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
  };

  const handleLoadDraft = (draftData: DocumentData) => {
    setDocData(sanitizeDocumentDataEncoding(draftData));
  };

  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  const [validationModalState, setValidationModalState] = useState<{
    isOpen: boolean;
    errors: ValidationError[];
    actionName: string;
  }>({ isOpen: false, errors: [], actionName: '' });

  const handleNewBlank = () => {
    const todayStr = new Date().toLocaleDateString('ru-RU');
    setDocData({
      ...INITIAL_DOCUMENT,
      id: `doc-${Date.now()}`,
      date: todayStr,
      content: ``,
      docType: 'СЛУЖЕБНАЯ ЗАПИСКА',
      docSubject: ''
    });
  };

  // Восстановить документ из записи реестра как новый черновик
  const handleOpenRegistryAsDraft = (doc: RegisteredDocument) => {
    setDocData({
      ...INITIAL_DOCUMENT,
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: new Date().toLocaleDateString('ru-RU'),
      refNumber: doc.regNumber,
      docSubject: doc.subject,
      isPublished: false,
      recipient: {
        ...INITIAL_DOCUMENT.recipient,
        name: doc.recipientName,
        organization: 'АО «НПО «Тепломаш»'
      },
      signature: {
        ...INITIAL_DOCUMENT.signature,
        senderName: doc.composerName,
        senderDepartment: doc.composerDept
      }
    });
    setIsRegistryOpen(false);
    setIsDraftsOpen(false);
  };

  const handlePrint = () => {
    const errs = validateDocument(docData);
    if (errs.length > 0) {
      setValidationModalState({
        isOpen: true,
        errors: errs,
        actionName: 'печати документа'
      });
      return;
    }
    triggerSystemPrint(docData);
    setIsPrintModalOpen(true);
  };

  const handleOpenExportModal = () => {
    const errs = validateDocument(docData);
    if (errs.length > 0) {
      setValidationModalState({
        isOpen: true,
        errors: errs,
        actionName: 'экспорта в .EML'
      });
      return;
    }
    setIsExportModalOpen(true);
  };

  const [isExportingEml, setIsExportingEml] = useState(false);

  const handleExportEml = async () => {
    try {
      setIsExportingEml(true);
      await downloadDocumentAsEml(docData);
    } catch (err) {
      console.error('Failed to export EML file:', err);
    } finally {
      setIsExportingEml(false);
    }
  };

  const handleCopyText = () => {
    const plainText = `
${docData.recipient.position}
${docData.recipient.organization}
${docData.recipient.name}

${docData.docType}
${docData.docSubject}

${docData.date}г.  ${docData.refNumber}  ${docData.city}

${docData.content.replace(/<[^>]+>/g, '\n')}

${docData.signature.senderPosition} __________ ${docData.signature.senderName}
    `.trim();

    navigator.clipboard.writeText(plainText);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  return (
    <PortalAuthGate authState={portalAuthState} onLogin={() => setIsAuthModalOpen(true)}>
      <div className="min-h-screen bg-[#F4F4F5] flex flex-col font-sans antialiased text-[#111827] selection:bg-[#2563EB] selection:text-white">
      {/* ================= HEADER NAVBAR (NO-PRINT) ================= */}
      <header className="no-print h-16 bg-white border-b border-[#E4E4E7] sticky top-0 z-40 px-6 flex items-center justify-between shrink-0">
        <div className="max-w-[1700px] w-full mx-auto flex items-center justify-between gap-4">
          
          {/* Return to Portal + Logo & Branding */}
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={handleReturnToPortal}
              className="px-3 py-1.5 bg-[#18181B] hover:bg-[#27272A] active:scale-95 text-white rounded-md text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs group border border-[#27272A] cursor-pointer"
              title="Вернуться на портал / в Корпоративную Систему / 1С"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>Портал</span>
            </button>

            <div className="h-6 w-px bg-[#E4E4E7] hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[#2563EB] flex items-center justify-center rounded text-white font-bold text-xs shadow-xs">
                ТМ
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-[#111827] flex items-center gap-2">
                  Генератор Документов на Бланке
                  <Badge variant="info" className="text-[10px] font-semibold py-0">
                    ГОСТ Р 7.0.97–2025
                  </Badge>
                </h1>
                <p className="text-[11px] text-[#6B7280]">Официальные письма, служебные записки и бланки АО «НПО «Тепломаш»</p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2">
            {/* User Role Indicator & Switcher */}
            {userRole === 'admin' ? (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-2.5 py-1.5 rounded-md text-xs font-semibold border border-[#FCD34D] text-[#92400E] bg-[#FFFBEB] hover:bg-[#FEF3C7] flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Режим администратора активен. Нажмите, чтобы сменить роль"
              >
                <Shield className="w-3.5 h-3.5 text-[#D97706]" />
                <span>Администратор</span>
              </button>
            ) : userRole === 'user' ? (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-[#E4E4E7] text-[#4B5563] bg-[#F9FAFB] hover:bg-[#F4F4F5] flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Нажмите для смены роли или входа под Администратором"
              >
                <User className="w-3.5 h-3.5 text-[#6B7280]" />
                <span>Пользователь</span>
              </button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={<LogIn className="w-3.5 h-3.5" />}
                onClick={() => setIsAuthModalOpen(true)}
              >
                Войти
              </Button>
            )}

            <div className="h-5 w-px bg-[#E4E4E7] my-auto mx-1" />

            {/* Registry Button on Main Top Panel */}
            <Button
              variant="secondary"
              size="sm"
              icon={<FileText className="w-3.5 h-3.5 text-[#2563EB]" />}
              onClick={() => setIsRegistryOpen(true)}
              title="Единый реестр исходящих писем АО «НПО «Тепломаш»"
            >
              Реестр писем
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<Users className="w-3.5 h-3.5 text-[#4B5563]" />}
              onClick={() => setIsEmployeeModalOpen(true)}
            >
              База сотрудников
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5 text-[#4B5563]" />}
              onClick={handleNewBlank}
            >
              Новый бланк
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<History className="w-3.5 h-3.5 text-[#4B5563]" />}
              onClick={() => setIsDraftsOpen(true)}
            >
              Документы ({draftsList.length})
            </Button>

            <div className="h-5 w-px bg-[#E4E4E7] my-auto mx-1" />

            {/* Single Unified EML Export Button */}
            <Button
              variant="secondary"
              size="sm"
              icon={<Mail className="w-3.5 h-3.5 text-[#059669]" />}
              onClick={handleOpenExportModal}
              title="Экспортировать документ в файл .EML для отправки по электронной почте"
            >
              Экспорт .EML
            </Button>

            {/* Single Unified Print Button */}
            <Button
              variant="primary"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={handlePrint}
              title="Распечатать бланк на принтере (Ctrl+P)"
            >
              Печать
            </Button>
          </div>
        </div>
      </header>

      {/* ================= MAIN SPLIT WORKSPACE ================= */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
        
        {/* LEFT COLUMN: CONTROLS & FORM INPUTS (NO-PRINT) */}
        <div className="no-print lg:col-span-5 flex flex-col space-y-4">
          
          {/* Tabs Navigation */}
          <div className="bg-white p-1 rounded-md border border-[#E4E4E7] shadow-2xs flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('fields')}
              className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'fields'
                  ? 'bg-[#2563EB] text-white shadow-2xs'
                  : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F4F4F5]'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Реквизиты</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('signature')}
              className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'signature'
                  ? 'bg-[#2563EB] text-white shadow-2xs'
                  : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F4F4F5]'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Подпись</span>
            </button>
          </div>

          {/* Active Tab Panel Container */}
          <div className="flex-1 bg-white border border-[#E4E4E7] rounded-lg p-5 shadow-xs overflow-y-auto max-h-[calc(100vh-180px)]">
            {activeTab === 'fields' && (
              <DocumentForm
                data={docData}
                onChange={setDocData}
                onOpenEmployeeModal={() => setIsEmployeeModalOpen(true)}
                employees={employees}
                userRole={userRole}
                onRequestAdminAuth={() => setIsAuthModalOpen(true)}
              />
            )}

            {activeTab === 'signature' && (
              <SignatureSettings
                signature={docData.signature}
                onChange={(signature) => setDocData({ ...docData, signature })}
                onOpenEmployeeModal={() => setIsEmployeeModalOpen(true)}
                employees={employees}
                isAdmin={isAdmin}
                docData={docData}
                onDocDataChange={setDocData}
              />
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: REAL-TIME A4 DOCUMENT PREVIEW */}
        <div className="lg:col-span-7 flex flex-col space-y-3 items-center">
          
          {/* Zoom & View Toolbar (NO-PRINT) */}
          <div className="no-print w-full bg-white border border-[#E4E4E7] rounded-lg px-4 py-2 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2 text-xs text-[#4B5563] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span>Предпросмотр бланка</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="xs"
                onClick={handleCopyText}
                icon={copiedNotification ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5 text-[#6B7280]" />}
                title="Копировать текст документа в буфер"
              >
                {copiedNotification ? 'Скопировано!' : 'Скопировать текст'}
              </Button>

              <div className="h-4 w-px bg-[#E4E4E7]" />

              {/* Zoom Buttons */}
              <div className="flex items-center gap-1 bg-[#F4F4F5] p-0.5 rounded-md border border-[#E4E4E7]">
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.05))}
                  className="p-1 hover:bg-white rounded text-[#4B5563] transition-colors cursor-pointer"
                  title="Уменьшить масштаб"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-semibold text-[#111827] px-1.5 w-12 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(1.3, prev + 0.05))}
                  className="p-1 hover:bg-white rounded text-[#4B5563] transition-colors cursor-pointer"
                  title="Увеличить масштаб"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Render A4 Sheet */}
          <div className="w-full flex-1 flex justify-center items-start overflow-hidden">
            <DocumentPreview data={docData} scale={zoomLevel} />
          </div>
        </div>

      </main>

      {/* Bottom Status Bar (Geometric Balance footer) */}
      <footer className="no-print h-8 bg-white border-t border-[#E4E4E7] px-6 fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between text-[11px] text-[#6B7280] shrink-0">
        <div>Статус: Все изменения сохранены</div>
        <div className="flex gap-4">
          <span>Масштаб: {Math.round(zoomLevel * 100)}%</span>
          <span>A4 (210 × 297 мм)</span>
        </div>
      </footer>

      {/* Modals */}
      <DraftsModal
        isOpen={isDraftsOpen}
        onClose={() => setIsDraftsOpen(false)}
        drafts={draftsList}
        currentDoc={docData}
        onLoadDraft={handleLoadDraft}
        onSaveCurrentAsDraft={handleSaveCurrentAsDraft}
        onDeleteDraft={handleDeleteDraft}
      />

      <TeplomashEmployeeSelectorModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        employees={employees}
        onUpdateEmployees={setEmployees}
        onSelectRecipient={handleApplyEmployeeRecipient}
        onSelectSender={handleApplyEmployeeSender}
        userRole={userRole}
        onRequestAdminAuth={() => setIsAuthModalOpen(true)}
      />

      <RegistryModal
        isOpen={isRegistryOpen}
        onClose={() => setIsRegistryOpen(false)}
        userRole={userRole}
        onRequestAdminAuth={() => setIsAuthModalOpen(true)}
        onOpenAsDraft={handleOpenRegistryAsDraft}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentRole={userRole}
        onSelectRole={handleSelectRole}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        docData={docData}
      />

      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        docData={docData}
      />

      <ValidationModal
        isOpen={validationModalState.isOpen}
        onClose={() => setValidationModalState(prev => ({ ...prev, isOpen: false }))}
        errors={validationModalState.errors}
        actionName={validationModalState.actionName}
        onFixField={() => {
          setActiveTab('fields');
        }}
      />
    </div>
    </PortalAuthGate>
  );
}

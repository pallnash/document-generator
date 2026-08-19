import React, { useState } from 'react';
import { DocumentData, DocumentVersion } from '../types';
import { 
  History, 
  Trash2, 
  FileText, 
  Clock, 
  Check, 
  Plus, 
  FolderOpen, 
  X, 
  Edit3, 
  Copy, 
  Download, 
  Upload,
  ArrowRight,
  GitCommit,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles
} from 'lucide-react';

export interface SavedDraft {
  id: string;
  title: string;
  savedAt: string;
  author?: string;
  authorRole?: 'admin' | 'user';
  version: string; // e.g. "1.0", "1.1", "2.0"
  versionHistory?: DocumentVersion[];
  data: DocumentData;
}

interface DraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: SavedDraft[];
  currentDoc: DocumentData;
  userRole?: 'admin' | 'user' | null;
  currentUserName?: string;
  onLoadDraft: (draft: DocumentData) => void;
  onSaveCurrentAsDraft: (title: string, bumpType?: 'none' | 'minor' | 'major', comment?: string) => void;
  onDeleteDraft: (id: string) => void;
}

export function bumpVersion(currentVersion: string = '1.0', bumpType: 'minor' | 'major' = 'minor'): string {
  const parts = currentVersion.split('.').map(p => parseInt(p, 10) || 0);
  let major = parts[0] || 1;
  let minor = parts[1] || 0;
  if (bumpType === 'major') {
    major += 1;
    minor = 0;
  } else {
    minor += 1;
  }
  return `${major}.${minor}`;
}

export const DraftsModal: React.FC<DraftsModalProps> = ({
  isOpen,
  onClose,
  drafts,
  currentDoc,
  userRole,
  currentUserName,
  onLoadDraft,
  onSaveCurrentAsDraft,
  onDeleteDraft,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [saveVersionType, setSaveVersionType] = useState<'minor' | 'major' | 'none'>('minor');
  const [versionComment, setVersionComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentVersion = currentDoc.version || '1.0';
  const nextMinor = bumpVersion(currentVersion, 'minor');
  const nextMajor = bumpVersion(currentVersion, 'major');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim() || `${currentDoc.docType || 'Документ'} (${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })})`;
    onSaveCurrentAsDraft(title, saveVersionType, versionComment.trim());
    setNewTitle('');
    setVersionComment('');
    setIsSaving(false);
  };

  const userFilteredDrafts = drafts.filter(draft => {
    if (userRole === 'admin') return true; // Administrator sees all documents
    const docAuthor = (draft.author || draft.data.signature?.senderName || '').trim().toLowerCase();
    const currentName = (currentUserName || currentDoc.signature?.senderName || '').trim().toLowerCase();
    if (!currentName || !docAuthor) return true;
    return docAuthor === currentName || docAuthor.includes(currentName) || currentName.includes(docAuthor);
  });

  const filteredDrafts = userFilteredDrafts.filter(draft => 
    draft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    draft.data.docType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (draft.data.refNumber && draft.data.refNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
    draft.data.recipient.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (draft.version && draft.version.includes(searchQuery))
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Мои документы и черновики</h3>
              <p className="text-xs text-slate-500">Архив всех опубликованных писем, сохраненных бланков и черновиков</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 md:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Action bar: Save Current Document as Draft */}
          {!isSaving ? (
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider block">Текущий документ</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-200/70 text-indigo-900 border border-indigo-300">
                    v{currentVersion}
                  </span>
                </div>
                <p className="text-xs text-indigo-900 truncate font-medium mt-0.5">
                  {currentDoc.docType}: {currentDoc.recipient.organization || currentDoc.recipient.position || 'Без наименования'}
                  {currentDoc.isPublished && ` (Опубликован № ${currentDoc.refNumber})`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSaving(true)}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-xs transition-all shrink-0 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Сохранить в документы
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="bg-indigo-50 border border-indigo-300 rounded-xl p-3.5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider mb-1">Название документа</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={`Например: ${currentDoc.docType} от ${new Date().toLocaleDateString('ru-RU')}`}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
              </div>

              {/* Version Bump selector */}
              <div>
                <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider mb-1">Версия документа (Major.Minor)</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSaveVersionType('minor')}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      saveVersionType === 'minor'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold opacity-80">Моб. правка (+0.1)</div>
                    <div className="text-xs font-mono font-bold">v{nextMinor}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSaveVersionType('major')}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      saveVersionType === 'major'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold opacity-80">Редакция (+1.0)</div>
                    <div className="text-xs font-mono font-bold">v{nextMajor}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSaveVersionType('none')}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      saveVersionType === 'none'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold opacity-80">Без изменений</div>
                    <div className="text-xs font-mono font-bold">v{currentVersion}</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider mb-1">Комментарий к правке / версии</label>
                <input
                  type="text"
                  value={versionComment}
                  onChange={(e) => setVersionComment(e.target.value)}
                  placeholder="Например: Уточнены реквизиты получателя и согласована сумма"
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSaving(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs"
                >
                  Сохранить версию
                </button>
              </div>
            </form>
          )}

          {/* Search Input */}
          {drafts.length > 0 && (
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по документам, номерам и версиям (например, v1.1)..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          )}

          {/* Drafts List */}
          {filteredDrafts.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">Нет сохраненных документов или черновиков</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {searchQuery ? 'По вашему запросу ничего не найдено' : 'После опубликования письмо автоматически сохраняется в этот список'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredDrafts.map((draft) => {
                const isPub = draft.data.isPublished;
                const isExpanded = expandedDocId === draft.id;
                const version = draft.version || draft.data.version || '1.0';
                const history = draft.versionHistory || draft.data.versionHistory || [];

                return (
                  <div
                    key={draft.id}
                    className={`rounded-xl border transition-all overflow-hidden ${
                      isPub 
                        ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400' 
                        : 'bg-white border-slate-200 hover:border-indigo-300 shadow-2xs'
                    }`}
                  >
                    <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {isPub ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
                              🔒 Опубликован {draft.data.refNumber ? `№ ${draft.data.refNumber}` : ''}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
                              📝 Черновик
                            </span>
                          )}
                          
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-amber-300 border border-slate-800 flex items-center gap-1">
                            <GitBranch className="w-3 h-3 text-amber-400" />
                            v{version}
                          </span>

                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            {draft.data.docType || 'Документ'}
                          </span>

                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {draft.savedAt}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 truncate">{draft.title}</h4>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          Адресат: {draft.data.recipient.organization || draft.data.recipient.position || '—'} ({draft.data.recipient.name || '—'})
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {history.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedDocId(isExpanded ? null : draft.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors flex items-center gap-1"
                            title="История правок и версий"
                          >
                            <History className="w-3.5 h-3.5 text-indigo-600" />
                            <span>История ({history.length})</span>
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            onLoadDraft(draft.data);
                            onClose();
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            isPub
                              ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs'
                              : 'bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700'
                          }`}
                        >
                          <span>{isPub ? 'Открыть документ' : 'Загрузить'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteDraft(draft.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Удалить из списка"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Version History Drawer */}
                    {isExpanded && history.length > 0 && (
                      <div className="bg-slate-900 text-slate-100 p-3.5 border-t border-slate-800 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-400 text-[11px] uppercase tracking-wider font-bold border-b border-slate-800 pb-1.5">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-indigo-400" />
                            История версий документа
                          </span>
                          <span>{history.length} версий</span>
                        </div>

                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {history.map((ver, idx) => (
                            <div 
                              key={ver.id || idx}
                              className="p-2 bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700/60 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 bg-amber-400/20 text-amber-300 font-mono font-bold rounded text-[10px]">
                                    v{ver.version}
                                  </span>
                                  <span className="text-[10px] text-slate-400">{ver.createdAt}</span>
                                  {ver.author && <span className="text-[10px] text-indigo-300">({ver.author})</span>}
                                </div>
                                <p className="text-[11px] text-slate-300 truncate mt-0.5">
                                  {ver.comment || 'Без описания изменений'}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  onLoadDraft(ver.dataSnapshot);
                                  onClose();
                                }}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold transition-colors shrink-0"
                              >
                                Загрузить эту версию
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Всего документов в архиве: {drafts.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};

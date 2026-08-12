import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NoteItem, Folder } from '../types/vault';
import { useVault } from '../hooks/useVault';
import { useToast } from './Toast';
import { MarkdownPreview } from './MarkdownPreview';
import { FolderManagerModal } from './FolderManagerModal';
import {
  FileText,
  Plus,
  Search,
  Star,
  Folder as FolderIcon,
  Tag as TagIcon,
  MoreVertical,
  Copy,
  Trash2,
  FolderInput,
  Eye,
  Edit3,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
  Quote,
  X,
  Sparkles,
  Check,
  FolderPlus,
  ArrowLeft,
} from 'lucide-react';

export const NotesView: React.FC = () => {
  const { vaultData, addItem, updateItem, deleteItem, toggleFavorite, setAutosaveState, addTag } = useVault();
  const { showToast } = useToast();

  // Navigation Filter State (Pane 1)
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites'>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Active Selected Note State (Pane 2 & 3)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Local Editor State (Pane 3) for smooth typing & 800ms debounced autosave
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorFolderId, setEditorFolderId] = useState<string | undefined>(undefined);
  const [editorTags, setEditorTags] = useState<string[]>([]);
  const [editorIsFavorite, setEditorIsFavorite] = useState(false);
  const [viewMode, setViewMode] = useState<'write' | 'preview'>('write');

  // Modals & Popovers
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false);
  const [activeMenuNoteId, setActiveMenuNoteId] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<NoteItem | null>(null);
  const [noteToMove, setNoteToMove] = useState<NoteItem | null>(null);

  // Tag Input State
  const [tagInput, setTagInput] = useState('');

  // Refs for autosave timer & textarea ref
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isInitialLoadRef = useRef(true);

  if (!vaultData) return null;

  // Filter note items only
  const allNotes = (vaultData.items || []).filter(
    (item): item is NoteItem => item.category === 'note'
  );

  // Available Folders for Notes
  const noteFolders = (vaultData.folders || []).filter(
    (f) => !f.scope || f.scope === 'notes' || f.scope === 'all'
  );

  const allTags = vaultData.tags || [];

  // Filter logic for Pane 2
  let filteredNotes = allNotes;

  if (activeFilter === 'favorites') {
    filteredNotes = filteredNotes.filter((n) => n.isFavorite);
  }

  if (selectedFolderId) {
    filteredNotes = filteredNotes.filter((n) => n.folderId === selectedFolderId);
  }

  if (selectedTag) {
    filteredNotes = filteredNotes.filter((n) => n.tags && n.tags.includes(selectedTag));
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filteredNotes = filteredNotes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.tags && n.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }

  // Active Selected Note Object
  const currentNote = allNotes.find((n) => n.id === selectedNoteId);

  // Auto-select first note on mount if available and none selected
  useEffect(() => {
    if (!selectedNoteId && filteredNotes.length > 0) {
      setSelectedNoteId(filteredNotes[0].id);
    }
  }, [filteredNotes, selectedNoteId]);

  // Sync editor state when selected note changes
  useEffect(() => {
    if (currentNote) {
      isInitialLoadRef.current = true;
      setEditorTitle(currentNote.title || '');
      setEditorContent(currentNote.content || '');
      setEditorFolderId(currentNote.folderId);
      setEditorTags(currentNote.tags || []);
      setEditorIsFavorite(currentNote.isFavorite || false);
    } else {
      setEditorTitle('');
      setEditorContent('');
      setEditorFolderId(undefined);
      setEditorTags([]);
      setEditorIsFavorite(false);
    }
  }, [selectedNoteId]);

  // Debounced 800ms Autosave Handler
  const triggerAutosave = useCallback(
    (titleVal: string, contentVal: string, folderIdVal?: string, tagsVal?: string[], favVal?: boolean) => {
      if (!currentNote) return;

      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      setAutosaveState('saving');

      autosaveTimerRef.current = setTimeout(async () => {
        try {
          await updateItem({
            ...currentNote,
            title: titleVal || 'Untitled Note',
            content: contentVal,
            folderId: folderIdVal,
            tags: tagsVal || [],
            isFavorite: favVal ?? false,
          });
          setAutosaveState('saved');
          setTimeout(() => setAutosaveState('idle'), 2000);
        } catch (err) {
          setAutosaveState('idle');
          showToast('Failed to autosave note.', 'error');
        }
      }, 800);
    },
    [currentNote, updateItem, setAutosaveState, showToast]
  );

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  // Form field change handlers with autosave trigger
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditorTitle(val);
    triggerAutosave(val, editorContent, editorFolderId, editorTags, editorIsFavorite);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditorContent(val);
    triggerAutosave(editorTitle, val, editorFolderId, editorTags, editorIsFavorite);
  };

  const handleFolderChange = (folderIdVal?: string) => {
    setEditorFolderId(folderIdVal);
    triggerAutosave(editorTitle, editorContent, folderIdVal, editorTags, editorIsFavorite);
  };

  const handleToggleFav = () => {
    const nextFav = !editorIsFavorite;
    setEditorIsFavorite(nextFav);
    triggerAutosave(editorTitle, editorContent, editorFolderId, editorTags, nextFav);
  };

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '');
    if (!clean) return;
    if (editorTags.length >= 5) {
      showToast('Maximum 5 tags per note.', 'info');
      return;
    }
    if (!editorTags.includes(clean)) {
      const updated = [...editorTags, clean];
      setEditorTags(updated);
      addTag(clean);
      triggerAutosave(editorTitle, editorContent, editorFolderId, updated, editorIsFavorite);
    }
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    const updated = editorTags.filter((tag) => tag !== t);
    setEditorTags(updated);
    triggerAutosave(editorTitle, editorContent, editorFolderId, updated, editorIsFavorite);
  };

  // Create New Note
  const handleCreateNewNote = async () => {
    const newNotePayload = {
      category: 'note' as const,
      title: 'Untitled Note',
      content: '# New Note\n\nStart typing your encrypted markdown notes here...',
      format: 'markdown' as const,
      folderId: selectedFolderId || undefined,
      tags: selectedTag ? [selectedTag] : [],
      isFavorite: false,
    };

    await addItem(newNotePayload);
    // Find newly added note ID
    const updatedNotes = (vaultData.items || []).filter(
      (item): item is NoteItem => item.category === 'note'
    );
    if (updatedNotes.length > 0) {
      const newest = updatedNotes[0];
      setSelectedNoteId(newest.id);
    }
    showToast('Created new note.', 'success');
  };

  // Duplicate Note
  const handleDuplicateNote = async (note: NoteItem) => {
    await addItem({
      category: 'note',
      title: `${note.title} (Copy)`,
      content: note.content,
      format: 'markdown',
      folderId: note.folderId,
      tags: [...note.tags],
      isFavorite: false,
    });
    showToast(`Duplicated '${note.title}'.`, 'success');
    setActiveMenuNoteId(null);
  };

  // Delete Note Confirmation
  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;
    const title = noteToDelete.title;
    await deleteItem(noteToDelete.id);
    showToast(`Deleted note '${title}'.`, 'info');
    setNoteToDelete(null);
    if (selectedNoteId === noteToDelete.id) {
      setSelectedNoteId(null);
    }
  };

  // Formatting Toolbar Helper for Textarea
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editorContent.substring(start, end);
    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;

    const newContent =
      editorContent.substring(0, start) + replacement + editorContent.substring(end);
    setEditorContent(newContent);
    triggerAutosave(editorTitle, newContent, editorFolderId, editorTags, editorIsFavorite);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText || 'text').length);
    }, 50);
  };

  // Helper to strip markdown from first line for list preview
  const getFirstLinePreview = (content: string) => {
    if (!content) return 'No content';
    const firstLine = content.split('\n').find((l) => l.trim().length > 0) || '';
    return firstLine
      .replace(/^#+\s*/, '')
      .replace(/^[\-\*]\s*/, '')
      .replace(/^\d+\.\s*/, '')
      .replace(/^>\s*/, '')
      .replace(/`{1,3}/g, '')
      .replace(/\*\*|\*|~~/g, '')
      .trim();
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[var(--bg-main)] overflow-hidden">
      {/* THREE-PANE CONTAINER */}
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
        {/* PANE 1: NAVIGATION & FILTERS (Left Sidebar Pane) */}
        <div className={`w-full md:w-64 bg-[var(--bg-card)] border-b md:border-b-0 md:border-r border-keepeit flex-col shrink-0 ${
          selectedNoteId ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="p-3.5 border-b border-keepeit flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--accent-seal)]" />
              <span className="font-display font-bold text-sm text-[var(--text-primary)]">
                NOTES ENGINE
              </span>
            </div>
            <button
              onClick={handleCreateNewNote}
              className="px-2.5 py-1 bg-[var(--accent-seal)] text-white text-[11px] font-mono-label font-semibold rounded-keepeit hover:opacity-90 flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>NEW</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-keepeit">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit pl-8 pr-7 py-1.5 text-xs font-mono text-[var(--text-primary)]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation Filter Links */}
          <div className="p-3 flex-1 overflow-y-auto space-y-4 font-mono text-xs">
            {/* Quick Views */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono-label text-[var(--text-muted)] block px-2 mb-1">
                VIEWS
              </span>
              <button
                onClick={() => {
                  setActiveFilter('all');
                  setSelectedFolderId(null);
                  setSelectedTag(null);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-keepeit flex items-center justify-between transition-colors ${
                  activeFilter === 'all' && !selectedFolderId && !selectedTag
                    ? 'bg-[var(--accent-seal-soft)] text-[var(--accent-seal)] font-bold'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  <span>All Notes</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">{allNotes.length}</span>
              </button>

              <button
                onClick={() => {
                  setActiveFilter('favorites');
                  setSelectedFolderId(null);
                  setSelectedTag(null);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-keepeit flex items-center justify-between transition-colors ${
                  activeFilter === 'favorites'
                    ? 'bg-[var(--accent-seal-soft)] text-[var(--accent-seal)] font-bold'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Favorites</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {allNotes.filter((n) => n.isFavorite).length}
                </span>
              </button>
            </div>

            {/* Folders List */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[10px] font-mono-label text-[var(--text-muted)]">FOLDERS</span>
                <button
                  onClick={() => setIsFolderManagerOpen(true)}
                  className="text-[10px] font-mono-label text-[var(--accent-seal)] hover:underline flex items-center gap-0.5"
                >
                  <FolderPlus className="w-3 h-3" />
                  <span>MANAGE</span>
                </button>
              </div>

              {noteFolders.map((folder) => {
                const count = allNotes.filter((n) => n.folderId === folder.id).length;
                const isSelected = selectedFolderId === folder.id;

                return (
                  <button
                    key={folder.id}
                    onClick={() => {
                      setSelectedFolderId(isSelected ? null : folder.id);
                      setSelectedTag(null);
                      setActiveFilter('all');
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-keepeit flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[var(--accent-seal-soft)] text-[var(--accent-seal)] font-bold'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: folder.color || 'var(--accent-seal)' }}
                      />
                      <span className="truncate">{folder.name}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Tags Filter List */}
            {allTags.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono-label text-[var(--text-muted)] block px-2 mb-1">
                  TAGS
                </span>
                <div className="flex flex-wrap gap-1 px-1">
                  {allTags.map((tag) => {
                    const isSelected = selectedTag === tag.name;
                    return (
                      <button
                        key={tag.id}
                        onClick={() => {
                          setSelectedTag(isSelected ? null : tag.name);
                          setSelectedFolderId(null);
                          setActiveFilter('all');
                        }}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-keepeit border-keepeit transition-colors ${
                          isSelected
                            ? 'bg-[var(--accent-seal)] text-white border-[var(--accent-seal)]'
                            : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        #{tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PANE 2: NOTE LIST (Middle Pane) */}
        <div className={`w-full md:w-80 bg-[var(--bg-surface)] border-b md:border-b-0 md:border-r border-keepeit flex-col shrink-0 overflow-hidden ${
          selectedNoteId ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="p-3 border-b border-keepeit flex items-center justify-between bg-[var(--bg-card)]">
            <span className="text-xs font-mono-label font-bold text-[var(--text-primary)]">
              NOTES ({filteredNotes.length})
            </span>
            <span className="text-[10px] font-mono-label text-[var(--text-muted)]">
              AUTOSAVE ENABLED
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-keepeit">
            {filteredNotes.length === 0 ? (
              <div className="p-6 text-center space-y-3">
                <FileText className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                <p className="text-xs text-[var(--text-muted)]">
                  {searchQuery || selectedFolderId || selectedTag
                    ? 'No notes match active filters.'
                    : 'No notes stored yet.'}
                </p>
                <button
                  onClick={handleCreateNewNote}
                  className="px-3 py-1.5 bg-[var(--accent-seal)] text-white text-xs font-mono-label rounded-keepeit hover:opacity-90 mx-auto block"
                >
                  CREATE NOTE
                </button>
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = note.id === selectedNoteId;
                const folder = noteFolders.find((f) => f.id === note.folderId);
                const firstLine = getFirstLinePreview(note.content);
                const updatedDate = new Date(note.updatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className={`p-3.5 cursor-pointer transition-colors relative group ${
                      isSelected
                        ? 'bg-[var(--bg-card)] border-l-4 border-l-[var(--accent-seal)] shadow-2xs'
                        : 'hover:bg-[var(--bg-card)]/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-display font-semibold text-xs text-[var(--text-primary)] truncate flex-1">
                        {note.title || 'Untitled Note'}
                      </h4>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleFavorite(note.id)}
                          className={`p-0.5 rounded-keepeit ${
                            note.isFavorite
                              ? 'text-amber-500'
                              : 'text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${note.isFavorite ? 'fill-amber-500' : ''}`} />
                        </button>

                        {/* Overflow Menu */}
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenuNoteId(activeMenuNoteId === note.id ? null : note.id)}
                            className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {activeMenuNoteId === note.id && (
                            <div className="absolute right-0 top-6 z-30 w-36 bg-[var(--bg-card)] border-keepeit rounded-keepeit shadow-xl py-1 text-xs font-mono">
                              <button
                                onClick={() => {
                                  setNoteToMove(note);
                                  setActiveMenuNoteId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-surface)] flex items-center gap-2"
                              >
                                <FolderInput className="w-3.5 h-3.5" />
                                <span>Move</span>
                              </button>
                              <button
                                onClick={() => handleDuplicateNote(note)}
                                className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-surface)] flex items-center gap-2"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Duplicate</span>
                              </button>
                              <button
                                onClick={() => {
                                  setNoteToDelete(note);
                                  setActiveMenuNoteId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-surface)] flex items-center gap-2 text-[var(--accent-rust)]"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* First Line Snippet */}
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed mb-2 font-sans">
                      {firstLine}
                    </p>

                    {/* Footer Badges */}
                    <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-[var(--text-muted)]">
                      <div className="flex items-center gap-1 min-w-0">
                        {folder && (
                          <span
                            className="px-1.5 py-0.2 rounded-keepeit text-white font-semibold text-[9px] truncate"
                            style={{ backgroundColor: folder.color || 'var(--accent-seal)' }}
                          >
                            {folder.name}
                          </span>
                        )}
                        {note.tags?.slice(0, 2).map((t) => (
                          <span key={t} className="text-[9px] text-[var(--text-muted)]">
                            #{t}
                          </span>
                        ))}
                      </div>
                      <span className="shrink-0">{updatedDate}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANE 3: EDITOR & PREVIEW (Right Main Pane) */}
        <div className={`flex-1 bg-[var(--bg-card)] flex-col h-full overflow-hidden ${
          selectedNoteId ? 'flex' : 'hidden md:flex'
        }`}>
          {!currentNote ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[var(--bg-surface)] border-keepeit flex items-center justify-center text-[var(--text-muted)]">
                <FileText className="w-8 h-8" />
              </div>
              <div className="max-w-xs space-y-1">
                <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
                  No Note Selected
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Select a note from the middle list pane to view or edit, or click below to start a new markdown note.
                </p>
              </div>
              <button
                onClick={handleCreateNewNote}
                className="px-4 py-2 bg-[var(--accent-seal)] text-white text-xs font-mono-label font-semibold rounded-keepeit hover:opacity-90 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>CREATE NEW NOTE</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Note Header Toolbar */}
              <div className="p-3 border-b border-keepeit bg-[var(--bg-card)] space-y-3 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setSelectedNoteId(null)}
                    className="md:hidden flex items-center gap-1 text-xs font-mono-label text-[var(--accent-seal)] font-semibold px-2 py-1 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit shrink-0 min-h-[36px]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  {/* Title Field */}
                  <input
                    type="text"
                    value={editorTitle}
                    onChange={handleTitleChange}
                    placeholder="Note Title..."
                    className="flex-1 bg-transparent font-display font-bold text-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-seal)] rounded-keepeit px-2 py-1"
                  />

                  {/* Actions & View Toggle */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Mode Toggle */}
                    <div className="flex items-center bg-[var(--bg-surface)] border-keepeit rounded-keepeit p-0.5 text-xs font-mono">
                      <button
                        onClick={() => setViewMode('write')}
                        className={`px-2.5 py-1 rounded-keepeit transition-colors flex items-center gap-1.5 ${
                          viewMode === 'write'
                            ? 'bg-[var(--accent-seal)] text-white font-semibold'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Write</span>
                      </button>
                      <button
                        onClick={() => setViewMode('preview')}
                        className={`px-2.5 py-1 rounded-keepeit transition-colors flex items-center gap-1.5 ${
                          viewMode === 'preview'
                            ? 'bg-[var(--accent-seal)] text-white font-semibold'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                    </div>

                    <button
                      onClick={handleToggleFav}
                      className={`p-1.5 rounded-keepeit ${
                        editorIsFavorite
                          ? 'text-amber-500'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                      title={editorIsFavorite ? 'Unfavorite' : 'Favorite'}
                    >
                      <Star className={`w-4 h-4 ${editorIsFavorite ? 'fill-amber-500' : ''}`} />
                    </button>

                    <button
                      onClick={() => setNoteToDelete(currentNote)}
                      className="p-1.5 text-[var(--accent-rust)] hover:bg-[var(--accent-rust)]/10 rounded-keepeit"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-toolbar: Formatting Tools (In Write Mode), Folder Select & Tags */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono pt-1 border-t border-keepeit">
                  {/* Formatting Buttons (Write Mode Only) */}
                  {viewMode === 'write' ? (
                    <div className="flex items-center gap-1 flex-wrap text-[var(--text-muted)]">
                      <button
                        onClick={() => insertFormatting('# ')}
                        className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit"
                        title="Heading 1"
                      >
                        <Heading1 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => insertFormatting('## ')}
                        className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit"
                        title="Heading 2"
                      >
                        <Heading2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => insertFormatting('### ')}
                        className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit"
                        title="Heading 3"
                      >
                        <Heading3 className="w-3.5 h-3.5" />
                      </button>
                      <div className="h-3 w-px bg-keepeit mx-1" />
                      <button
                        onClick={() => insertFormatting('**', '**')}
                        className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit"
                        title="Bold"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => insertFormatting('*', '*')}
                        className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit"
                        title="Italic"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => insertFormatting('~~', '~~')}
                        className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit"
                        title="Strikethrough"
                      >
                        <Strikethrough className="w-3.5 h-3.5" />
                      </button>
                      <div className="h-3 w-px bg-keepeit mx-1" />
                      <button
                        onClick={() => insertFormatting('- ')}
                        className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit"
                        title="Bullet List"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => insertFormatting('1. ')}
                        className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit"
                        title="Numbered List"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => insertFormatting('[', '](https://)')}
                        className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit"
                        title="Link"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => insertFormatting('`', '`')}
                        className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit"
                        title="Inline Code"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => insertFormatting('> ')}
                        className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit"
                        title="Blockquote"
                      >
                        <Quote className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono-label text-[var(--accent-seal)] font-semibold">
                      MARKDOWN PREVIEW ACTIVE
                    </span>
                  )}

                  {/* Folder Selector & Tags Control */}
                  <div className="flex items-center gap-2">
                    <select
                      value={editorFolderId || ''}
                      onChange={(e) => handleFolderChange(e.target.value || undefined)}
                      className="bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-2 py-0.5 text-[11px] font-mono text-[var(--text-primary)]"
                    >
                      <option value="">(No Folder)</option>
                      {noteFolders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>

                    {/* Tag Chips & Input */}
                    <div className="flex items-center gap-1">
                      {editorTags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded-keepeit bg-[var(--bg-surface)] border-keepeit text-[10px] font-mono text-[var(--text-primary)] inline-flex items-center gap-1"
                        >
                          #{t}
                          <button
                            onClick={() => handleRemoveTag(t)}
                            className="text-[var(--text-muted)] hover:text-[var(--accent-rust)]"
                          >
                            ×
                          </button>
                        </span>
                      ))}

                      {editorTags.length < 5 && (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag();
                              }
                            }}
                            placeholder="+tag"
                            className="w-14 bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-primary)]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Note Content Viewport */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[var(--bg-card)]">
                {viewMode === 'write' ? (
                  <textarea
                    ref={textareaRef}
                    value={editorContent}
                    onChange={handleContentChange}
                    placeholder="Write your note in markdown syntax..."
                    className="w-full h-full min-h-[350px] bg-transparent text-sm font-mono text-[var(--text-primary)] focus:outline-none resize-none leading-relaxed"
                  />
                ) : (
                  <MarkdownPreview content={editorContent} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SHARED FOLDER MANAGER MODAL */}
      <FolderManagerModal
        isOpen={isFolderManagerOpen}
        onClose={() => setIsFolderManagerOpen(false)}
      />

      {/* MOVE TO FOLDER MODAL */}
      {noteToMove && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border-keepeit rounded-keepeit max-w-sm w-full p-5 shadow-2xl space-y-4 font-mono text-xs">
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">
              Move '{noteToMove.title}' to Folder
            </h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              <button
                onClick={() => {
                  updateItem({ ...noteToMove, folderId: undefined });
                  showToast(`Moved '${noteToMove.title}' to Root.`, 'success');
                  setNoteToMove(null);
                }}
                className={`w-full text-left p-2 rounded-keepeit ${
                  !noteToMove.folderId ? 'bg-[var(--accent-seal-soft)] font-semibold' : 'hover:bg-[var(--bg-surface)]'
                }`}
              >
                (No Folder / Root)
              </button>
              {noteFolders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    updateItem({ ...noteToMove, folderId: f.id });
                    showToast(`Moved '${noteToMove.title}' to ${f.name}.`, 'success');
                    setNoteToMove(null);
                  }}
                  className={`w-full text-left p-2 rounded-keepeit flex items-center gap-2 ${
                    noteToMove.folderId === f.id
                      ? 'bg-[var(--accent-seal-soft)] font-semibold'
                      : 'hover:bg-[var(--bg-surface)]'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: f.color || 'var(--accent-seal)' }}
                  />
                  <span>{f.name}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-2 border-t border-keepeit">
              <button
                onClick={() => setNoteToMove(null)}
                className="px-3 py-1.5 font-mono-label border-keepeit rounded-keepeit"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border-keepeit rounded-keepeit p-6 max-w-sm w-full shadow-2xl space-y-3 font-mono text-xs">
            <h3 className="text-base font-bold text-[var(--accent-rust)] flex items-center gap-2">
              Delete Note?
            </h3>
            <p className="text-[var(--text-muted)] leading-relaxed">
              Are you sure you want to delete <strong className="text-[var(--text-primary)]">'{noteToDelete.title}'</strong>?
              This action cannot be undone.
            </p>
            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => setNoteToDelete(null)}
                className="px-3 py-1.5 font-mono-label border-keepeit rounded-keepeit text-[var(--text-primary)]"
              >
                CANCEL
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 font-mono-label bg-[var(--accent-rust)] text-white rounded-keepeit hover:opacity-90 font-semibold"
              >
                DELETE NOTE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

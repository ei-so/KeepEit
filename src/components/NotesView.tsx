import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NoteItem, Folder } from '../types/vault';
import { useVault } from '../hooks/useVault';
import { useToast } from './Toast';
import { FolderManagerModal } from './FolderManagerModal';
import { markdownToHtml, stripHtmlAndMarkdown } from '../lib/markdown';
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
  const { vaultData, addItem, updateItem, deleteItem, toggleFavorite, setAutosaveState, autosaveState, addTag } = useVault();
  const { showToast } = useToast();
  const isInk = vaultData?.settings?.accent === 'ink';

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

  // Copy Note feedback state (1.2s reset)
  const [isCopiedNote, setIsCopiedNote] = useState(false);
  const copyNoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for autosave timer & contenteditable editor ref
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const isInitialLoadRef = useRef(true);

  const titleInputRef = useRef<HTMLInputElement>(null);

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

  // Sync editor state when selected note changes
  useEffect(() => {
    if (currentNote) {
      isInitialLoadRef.current = true;
      setEditorTitle(currentNote.title || '');
      const htmlVal = markdownToHtml(currentNote.content || '');
      setEditorContent(htmlVal);
      if (editorRef.current) {
        editorRef.current.innerHTML = htmlVal;
      }
      setEditorFolderId(currentNote.folderId);
      setEditorTags(currentNote.tags || []);
      setEditorIsFavorite(currentNote.isFavorite || false);
    } else {
      setEditorTitle('');
      setEditorContent('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setEditorFolderId(undefined);
      setEditorTags([]);
      setEditorIsFavorite(false);
    }
  }, [selectedNoteId]);

  // Sync contenteditable innerHTML on mount / initial load
  useEffect(() => {
    if (editorRef.current && isInitialLoadRef.current) {
      editorRef.current.innerHTML = editorContent;
      isInitialLoadRef.current = false;
    }
  }, [editorContent]);

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
      if (copyNoteTimerRef.current) clearTimeout(copyNoteTimerRef.current);
    };
  }, []);

  // Copy Note Content Handler with 1.2s checkmark pop
  const handleCopyNoteContent = () => {
    if (!currentNote) return;
    const textToCopy = `${editorTitle ? `# ${editorTitle}\n\n` : ''}${stripHtmlAndMarkdown(editorContent)}`;
    navigator.clipboard.writeText(textToCopy);

    if (copyNoteTimerRef.current) clearTimeout(copyNoteTimerRef.current);
    setIsCopiedNote(true);
    copyNoteTimerRef.current = setTimeout(() => {
      setIsCopiedNote(false);
    }, 1200);

    showToast('Note content copied to clipboard.', 'success');
  };

  // Form field change handlers with autosave trigger
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditorTitle(val);
    triggerAutosave(val, editorContent, editorFolderId, editorTags, editorIsFavorite);
  };

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    setEditorContent(html);
    triggerAutosave(editorTitle, html, editorFolderId, editorTags, editorIsFavorite);
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
      content: '',
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

  // Quick Add Note Handler (Auto-save current note & create fresh note)
  const handleQuickAddNote = async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    if (currentNote) {
      try {
        await updateItem({
          ...currentNote,
          title: editorTitle || 'Untitled Note',
          content: editorContent,
          folderId: editorFolderId,
          tags: editorTags,
          isFavorite: editorIsFavorite,
        });
      } catch (err) {
        // Continue creating new note
      }
    }
    await handleCreateNewNote();
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 100);
  };

  // Formatting Helper for Rich Text contenteditable
  const applyFormat = (command: string, value: string | null = null) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    if (command === 'createLink') {
      const url = prompt('Enter link URL:', 'https://');
      if (url) {
        document.execCommand('createLink', false, url);
      }
    } else if (command === 'code') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        if (selectedText) {
          const codeElem = document.createElement('code');
          codeElem.textContent = selectedText;
          range.deleteContents();
          range.insertNode(codeElem);
        } else {
          document.execCommand('formatBlock', false, '<pre>');
        }
      }
    } else {
      document.execCommand(command, false, value ?? undefined);
    }
    handleEditorInput();
  };

  // Helper to strip markdown and HTML from first line for list preview
  const getFirstLinePreview = (content: string) => {
    return stripHtmlAndMarkdown(content);
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
              <FileText className={`w-4 h-4 ${isInk ? 'text-white' : 'text-[var(--accent-seal)]'}`} />
              <span className="font-display font-bold text-sm text-[var(--text-primary)]">
                NOTES ENGINE
              </span>
            </div>
            <button
              onClick={handleCreateNewNote}
              className="btn-stealth-primary px-2.5 py-1 border border-zinc-700/60 active:scale-[0.98] text-[11px] font-mono-label font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 flex items-center gap-1 shadow-xs"
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
          <div className="p-3 flex-1 overflow-y-auto space-y-4 font-mono text-xs pb-28 md:pb-6">
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
                    ? isInk
                      ? 'bg-[var(--accent-seal-soft)] text-white font-bold'
                      : 'bg-[var(--accent-seal-soft)] text-[var(--accent-seal)] font-bold'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className={`w-3.5 h-3.5 ${activeFilter === 'all' && !selectedFolderId && !selectedTag && isInk ? 'text-white' : ''}`} />
                  <span>All Notes</span>
                </div>
                <span className={`text-[10px] ${
                  activeFilter === 'all' && !selectedFolderId && !selectedTag && isInk
                    ? 'px-1.5 py-0.5 rounded-full bg-white/20 text-white font-mono font-bold'
                    : 'text-[var(--text-muted)]'
                }`}>{allNotes.length}</span>
              </button>

              <button
                onClick={() => {
                  setActiveFilter('favorites');
                  setSelectedFolderId(null);
                  setSelectedTag(null);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-keepeit flex items-center justify-between transition-colors ${
                  activeFilter === 'favorites'
                    ? isInk
                      ? 'bg-[var(--accent-seal-soft)] text-white font-bold'
                      : 'bg-[var(--accent-seal-soft)] text-[var(--accent-seal)] font-bold'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Favorites</span>
                </div>
                <span className={`text-[10px] ${
                  activeFilter === 'favorites' && isInk
                    ? 'px-1.5 py-0.5 rounded-full bg-white/20 text-white font-mono font-bold'
                    : 'text-[var(--text-muted)]'
                }`}>
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
                  className={`text-[10px] font-mono-label ${isInk ? 'text-white' : 'text-[var(--accent-seal)]'} hover:underline flex items-center gap-0.5`}
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
                        ? isInk
                          ? 'bg-[var(--accent-seal-soft)] text-white font-bold'
                          : 'bg-[var(--accent-seal-soft)] text-[var(--accent-seal)] font-bold'
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
                    <span className={`text-[10px] ${
                      isSelected && isInk
                        ? 'px-1.5 py-0.5 rounded-full bg-white/20 text-white font-mono font-bold'
                        : 'text-[var(--text-muted)]'
                    }`}>{count}</span>
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
                            ? 'bg-[var(--accent-seal)] text-[var(--accent-fg)] border-[var(--accent-seal)] font-semibold'
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

          <div className="flex-1 overflow-y-auto divide-y divide-keepeit pb-28 md:pb-6">
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
                  className="btn-stealth-primary px-3 py-1.5 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] text-xs font-mono-label font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] mx-auto block"
                >
                  CREATE NOTE
                </button>
              </div>
            ) : (
              filteredNotes.map((note, index) => {
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
                    style={{ animationDelay: `${index * 35}ms` }}
                    className={`p-3.5 cursor-pointer transition-all duration-150 active:scale-[0.98] relative group animate-[fadeInUp_0.25s_ease-out_forwards] ${
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
                          className={`p-0.5 rounded-keepeit transition-all duration-150 active:scale-90 ${
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
                            className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-keepeit transition-all active:scale-95"
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
                                className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-surface)] flex items-center gap-2 transition-colors"
                              >
                                <FolderInput className="w-3.5 h-3.5" />
                                <span>Move</span>
                              </button>
                              <button
                                onClick={() => handleDuplicateNote(note)}
                                className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-surface)] flex items-center gap-2 transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Duplicate</span>
                              </button>
                              <button
                                onClick={() => {
                                  setNoteToDelete(note);
                                  setActiveMenuNoteId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-surface)] flex items-center gap-2 text-[var(--accent-rust)] transition-colors"
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
                className="btn-stealth-primary px-4 py-2 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] text-xs font-mono-label font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>CREATE NEW NOTE</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Note Header Toolbar */}
              <div className="p-3 border-b border-keepeit bg-[var(--bg-card)] space-y-3 shrink-0">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Mobile Back Button - Single Arrow */}
                    <button
                      onClick={() => setSelectedNoteId(null)}
                      className="md:hidden flex items-center gap-1.5 text-xs font-mono-label text-[var(--accent-seal)] font-semibold px-2.5 py-1.5 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit shrink-0 min-h-[36px] opacity-100 hover:bg-[var(--bg-surface-hover)] active:scale-95 cursor-pointer"
                      title="Return to Notes List"
                    >
                      <ArrowLeft className="w-4 h-4 text-[var(--accent-seal)]" />
                      <span>BACK</span>
                    </button>

                    {/* Title Field */}
                    <input
                      ref={titleInputRef}
                      type="text"
                      value={editorTitle}
                      onChange={handleTitleChange}
                      placeholder="Untitled Note"
                      className="flex-1 bg-transparent font-bold text-xl md:text-2xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border-none outline-none focus:outline-none min-w-0 px-1 py-1"
                    />
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status Indicator */}
                    <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit shrink-0">
                      {autosaveState === 'saving' ? (
                        <span className="text-[var(--text-muted)] animate-pulse">Saving...</span>
                      ) : autosaveState === 'saved' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                          <Check className="w-3.5 h-3.5" /> Saved ✓
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Autosaved</span>
                      )}
                    </div>

                    {/* Quick Add Fresh Note Button */}
                    <button
                      onClick={handleQuickAddNote}
                      className="p-1.5 rounded-keepeit bg-[var(--accent-seal)] text-[var(--accent-fg)] hover:opacity-90 font-bold flex items-center justify-center min-h-[34px] min-w-[34px] shadow-xs active:scale-95 transition-all cursor-pointer"
                      title="Auto-save & Create Fresh Note (+)"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    {/* Copy Note Button with Checkmark Pop */}
                    <button
                      onClick={handleCopyNoteContent}
                      className={`p-1.5 rounded-keepeit transition-all duration-150 min-h-[34px] min-w-[34px] flex items-center justify-center ${
                        isCopiedNote
                          ? 'scale-110 text-emerald-500 bg-emerald-500/10'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] active:scale-95'
                      }`}
                      title="Copy Note Content"
                    >
                      {isCopiedNote ? (
                        <Check className="w-4 h-4 animate-checkmark-pop text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={handleToggleFav}
                      className={`p-1.5 rounded-keepeit transition-all duration-150 active:scale-95 ${
                        editorIsFavorite
                          ? 'text-amber-500'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                      }`}
                      title={editorIsFavorite ? 'Unfavorite' : 'Favorite'}
                    >
                      <Star className={`w-4 h-4 ${editorIsFavorite ? 'fill-amber-500' : ''}`} />
                    </button>

                    <button
                      onClick={() => setNoteToDelete(currentNote)}
                      className="p-1.5 text-[var(--accent-rust)] hover:bg-[var(--accent-rust)]/10 rounded-keepeit transition-all duration-150 active:scale-95"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-toolbar: Formatting Tools, Folder Select & Tags */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono pt-1 border-t border-keepeit">
                  {/* Formatting Buttons */}
                  <div className="flex items-center gap-1 flex-wrap text-[var(--text-muted)]">
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat('formatBlock', '<h1>');
                      }}
                      className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit cursor-pointer"
                      title="Heading 1"
                    >
                      <Heading1 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat('formatBlock', '<h2>');
                      }}
                      className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit cursor-pointer"
                      title="Heading 2"
                    >
                      <Heading2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat('formatBlock', '<h3>');
                      }}
                      className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit cursor-pointer"
                      title="Heading 3"
                    >
                      <Heading3 className="w-3.5 h-3.5" />
                    </button>
                    <div className="h-3 w-px bg-keepeit mx-1" />
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat('bold');
                      }}
                      className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit cursor-pointer"
                      title="Bold"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat('italic');
                      }}
                      className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit cursor-pointer"
                      title="Italic"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat('strikeThrough');
                      }}
                      className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit cursor-pointer"
                      title="Strikethrough"
                    >
                      <Strikethrough className="w-3.5 h-3.5" />
                    </button>
                    <div className="h-3 w-px bg-keepeit mx-1" />
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat('insertUnorderedList');
                      }}
                      className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit cursor-pointer"
                      title="Bullet List"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat('insertOrderedList');
                      }}
                      className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit cursor-pointer"
                      title="Numbered List"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat('createLink');
                      }}
                      className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit cursor-pointer"
                      title="Link"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat('code');
                      }}
                      className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit cursor-pointer"
                      title="Inline Code"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat('formatBlock', 'blockquote');
                      }}
                      className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit cursor-pointer"
                      title="Blockquote"
                    >
                      <Quote className="w-3.5 h-3.5" />
                    </button>
                  </div>

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
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[var(--bg-card)] pb-28 sm:pb-12 md:pb-8">
                <div className="relative w-full h-full min-h-[350px]">
                  {(!editorContent ||
                    editorContent === '<br>' ||
                    editorContent === '<p><br></p>' ||
                    editorContent.trim() === '') && (
                    <div className="absolute top-0 left-0 text-[var(--text-muted)] pointer-events-none select-none leading-relaxed">
                      Start typing your note here...
                    </div>
                  )}
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleEditorInput}
                    className="rich-editor-content min-h-[300px] w-full outline-none leading-relaxed text-neutral-900 dark:text-neutral-100 bg-transparent focus:outline-none"
                  />
                </div>
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
          <div className="bg-[var(--bg-card)] border-keepeit rounded-keepeit max-w-sm w-full p-4 sm:p-6 pb-8 shadow-2xl space-y-4 font-mono text-xs max-h-[90vh] overflow-y-auto">
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
          <div className="bg-[var(--bg-card)] border-keepeit rounded-keepeit p-4 sm:p-6 pb-8 max-w-sm w-full shadow-2xl space-y-3 font-mono text-xs max-h-[90vh] overflow-y-auto">
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

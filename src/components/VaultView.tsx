import React, { useState, useEffect, useRef } from 'react';
import { CredentialItem, VaultItem, Folder } from '../types/vault';
import { useVault } from '../hooks/useVault';
import { useToast } from './Toast';
import { generateSecurePassword } from '../services/crypto';
import {
  Key,
  Grid,
  List,
  Search,
  Plus,
  Star,
  Eye,
  EyeOff,
  Copy,
  MoreVertical,
  Edit,
  Trash2,
  FolderInput,
  X,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Tag as TagIcon,
  Folder as FolderIcon,
  Check,
  Calendar,
  Lock,
  Filter,
} from 'lucide-react';

export const VaultView: React.FC = () => {
  const { vaultData, addItem, updateItem, deleteItem, toggleFavorite, addTag } = useVault();
  const { showToast } = useToast();

  // Layout View State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Revealed passwords state & timers (auto-hide after 15s)
  const [revealedPasswordIds, setRevealedPasswordIds] = useState<Record<string, boolean>>({});
  const revealTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Active Overflow Menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Copy feedback state for checkmark pop (1.2s reset)
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const copyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<CredentialItem | null>(null);
  const [itemDetail, setItemDetail] = useState<CredentialItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<CredentialItem | null>(null);
  const [itemToMove, setItemToMove] = useState<CredentialItem | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      Object.values(revealTimersRef.current).forEach((timer) => clearTimeout(timer as ReturnType<typeof setTimeout>));
      if (copyFeedbackTimerRef.current) clearTimeout(copyFeedbackTimerRef.current);
    };
  }, []);

  if (!vaultData) return null;

  // Filter only credential items for Vault view
  const allCredentials = (vaultData.items || []).filter(
    (item): item is CredentialItem => item.category === 'credential'
  );

  // Available Folders for Credentials (scoped or unassigned)
  const credentialFolders = (vaultData.folders || []).filter(
    (f) => !f.scope || f.scope === 'credentials' || f.scope === 'all'
  );

  // Available Tags
  const allTags = vaultData.tags || [];

  // Filter logic
  let filteredCredentials = allCredentials;

  if (selectedFolderId) {
    filteredCredentials = filteredCredentials.filter((c) => c.folderId === selectedFolderId);
  }

  if (selectedTag) {
    filteredCredentials = filteredCredentials.filter((c) => c.tags && c.tags.includes(selectedTag));
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filteredCredentials = filteredCredentials.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.username && c.username.toLowerCase().includes(q)) ||
        (c.url && c.url.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q)) ||
        (c.tags && c.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }

  // Helper: Letter Avatar Color Hash
  const getHashColor = (name: string) => {
    if (!name) return '#2F6F52';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 40%, 35%)`;
  };

  // Password Reveal Handler with 15s Auto-Hide
  const handleToggleRevealPassword = (id: string) => {
    setRevealedPasswordIds((prev) => {
      const isCurrentlyRevealed = !!prev[id];
      if (isCurrentlyRevealed) {
        if (revealTimersRef.current[id]) {
          clearTimeout(revealTimersRef.current[id]);
          delete revealTimersRef.current[id];
        }
        return { ...prev, [id]: false };
      } else {
        // Set 15s timer to auto-hide
        if (revealTimersRef.current[id]) clearTimeout(revealTimersRef.current[id]);
        revealTimersRef.current[id] = setTimeout(() => {
          setRevealedPasswordIds((p) => ({ ...p, [id]: false }));
          delete revealTimersRef.current[id];
        }, 15000);

        return { ...prev, [id]: true };
      }
    });
  };

  // Copy Password Handler with 30s Clipboard Auto-Clear and 1.2s checkmark pop
  const handleCopyPassword = (password: string, itemId?: string) => {
    if (!password) return;
    navigator.clipboard.writeText(password);

    if (itemId) {
      if (copyFeedbackTimerRef.current) clearTimeout(copyFeedbackTimerRef.current);
      setCopiedItemId(itemId);
      copyFeedbackTimerRef.current = setTimeout(() => {
        setCopiedItemId(null);
      }, 1200);
    }

    // Schedule clipboard clear after 30 seconds
    setTimeout(async () => {
      try {
        await navigator.clipboard.writeText('');
      } catch (err) {
        // Ignore clipboard write restrictions
      }
    }, 30000);

    showToast('Password copied to clipboard. Clipboard will be auto-cleared in 30 seconds.', 'success');
  };

  const handleOpenNewModal = () => {
    setItemToEdit(null);
    setIsEditorOpen(true);
  };

  const handleOpenEditModal = (item: CredentialItem) => {
    setItemToEdit(item);
    setIsEditorOpen(true);
    setActiveMenuId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    const title = itemToDelete.title;
    await deleteItem(itemToDelete.id);
    showToast(`Deleted '${title}' from encrypted vault.`, 'info');
    setItemToDelete(null);
    if (itemDetail?.id === itemToDelete.id) setItemDetail(null);
  };

  const handleMoveFolder = async (folderId: string | undefined) => {
    if (!itemToMove) return;
    await updateItem({ ...itemToMove, folderId });
    showToast(`Moved '${itemToMove.title}' to folder.`, 'success');
    setItemToMove(null);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[var(--bg-main)] overflow-hidden">
      {/* Top Controls Toolbar */}
      <div className="p-4 border-b border-keepeit bg-[var(--bg-card)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-keepeit bg-[var(--accent-seal)] text-[var(--accent-fg)] shrink-0">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-[var(--text-primary)]">
              Credentials Vault
            </h1>
            <p className="text-xs font-mono-label text-[var(--text-muted)]">
              {filteredCredentials.length} OF {allCredentials.length} ENCRYPTED CREDENTIALS
            </p>
          </div>
        </div>

        {/* Filters & Actions Bar */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Search Field */}
          <div className="relative flex-1 sm:w-64 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search credentials, tags..."
              className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit pl-9 pr-8 py-1.5 text-xs font-mono text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-seal)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tag Filter Dropdown */}
          <select
            value={selectedTag || ''}
            onChange={(e) => setSelectedTag(e.target.value || null)}
            className="bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-2.5 py-1.5 text-xs font-mono text-[var(--text-primary)] cursor-pointer focus-visible:ring-2"
          >
            <option value="">All Tags</option>
            {allTags.map((t) => (
              <option key={t.id} value={t.name}>
                #{t.name}
              </option>
            ))}
          </select>

          {/* Folder Filter Dropdown */}
          <select
            value={selectedFolderId || ''}
            onChange={(e) => setSelectedFolderId(e.target.value || null)}
            className="bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-2.5 py-1.5 text-xs font-mono text-[var(--text-primary)] cursor-pointer focus-visible:ring-2"
          >
            <option value="">All Folders</option>
            {credentialFolders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[var(--bg-surface)] border-keepeit rounded-keepeit p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-keepeit transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[var(--accent-seal)] text-[var(--accent-fg)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-keepeit transition-colors ${
                viewMode === 'list'
                  ? 'bg-[var(--accent-seal)] text-[var(--accent-fg)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleOpenNewModal}
            className="btn-stealth-primary px-3.5 py-1.5 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] rounded-keepeit font-mono-label text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">NEW CREDENTIAL</span>
          </button>
        </div>
      </div>

      {/* Main Content Workspace */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28 sm:pb-12 md:pb-16">
        {filteredCredentials.length === 0 ? (
          /* Real Empty State */
          <div className="max-w-md mx-auto my-12 text-center p-8 bg-[var(--bg-card)] border-keepeit rounded-keepeit space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-[var(--bg-surface)] border-keepeit flex items-center justify-center mx-auto text-[var(--text-muted)]">
              <Key className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
                {searchQuery || selectedTag || selectedFolderId
                  ? 'No Matching Credentials'
                  : 'No credentials yet'}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                {searchQuery || selectedTag || selectedFolderId
                  ? 'Try clearing active filters or search queries to view all vault credentials.'
                  : 'Store logins, passwords, service keys, and account credentials securely with zero-knowledge AES-GCM encryption.'}
              </p>
            </div>

            {searchQuery || selectedTag || selectedFolderId ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTag(null);
                  setSelectedFolderId(null);
                }}
                className="px-4 py-2 bg-[var(--bg-surface)] border-keepeit rounded-keepeit text-xs font-mono-label text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
              >
                CLEAR ALL FILTERS
              </button>
            ) : (
              <button
                onClick={handleOpenNewModal}
                className="btn-stealth-primary px-5 py-2.5 active:scale-[0.98] font-mono-label text-xs font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 flex items-center justify-center gap-2 mx-auto shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add your first credential</span>
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCredentials.map((item, index) => {
              const isRevealed = !!revealedPasswordIds[item.id];
              const folder = vaultData.folders.find((f) => f.id === item.folderId);
              const avatarBg = getHashColor(item.title);
              const letter = item.title ? item.title.charAt(0).toUpperCase() : '?';
              const isCopied = copiedItemId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => setItemDetail(item)}
                  style={{ animationDelay: `${index * 35}ms` }}
                  className="bg-[var(--bg-card)] border-keepeit rounded-keepeit p-4 flex flex-col justify-between transition-all duration-150 active:scale-[0.98] active:opacity-90 hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--accent-seal)] group cursor-pointer relative animate-[fadeInUp_0.25s_ease-out_forwards]"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Letter Avatar */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 font-mono shadow-xs"
                          style={{ backgroundColor: avatarBg }}
                        >
                          {letter}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-display font-semibold text-sm text-[var(--text-primary)] truncate">
                            {item.title}
                          </h3>
                          <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                            {item.username || 'No username'}
                          </p>
                        </div>
                      </div>

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item.id);
                        }}
                        className={`p-1 rounded-keepeit transition-all duration-150 active:scale-90 ${
                          item.isFavorite
                            ? 'text-amber-500'
                            : 'text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--text-primary)]'
                        }`}
                        title={item.isFavorite ? 'Unfavorite' : 'Favorite'}
                      >
                        <Star className={`w-4 h-4 ${item.isFavorite ? 'fill-amber-500' : ''}`} />
                      </button>
                    </div>

                    {/* Truncated Notes Preview */}
                    {item.notes && (
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 my-2 leading-relaxed italic">
                        "{item.notes}"
                      </p>
                    )}

                    {/* Tag & Folder Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap my-2">
                      {folder && (
                        <span
                          className="text-[9px] font-mono-label px-1.5 py-0.5 rounded-keepeit text-white font-semibold"
                          style={{ backgroundColor: folder.color || 'var(--accent-seal)' }}
                        >
                          {folder.name}
                        </span>
                      )}
                      {item.tags?.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[9px] font-mono-label px-1.5 py-0.5 rounded-keepeit bg-[var(--bg-surface)] border-keepeit text-[var(--text-muted)]"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Password Display & Card Row Actions */}
                  <div className="pt-3 border-t border-keepeit flex items-center justify-between gap-2 mt-2">
                    <div className="font-mono text-xs text-[var(--text-primary)] bg-[var(--bg-surface)] px-2.5 py-1 rounded-keepeit border-keepeit min-w-0 flex-1 truncate font-medium">
                      {isRevealed ? item.password || '—' : '••••••••••••'}
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Reveal Password (15s auto-hide) */}
                      <button
                        onClick={() => handleToggleRevealPassword(item.id)}
                        className={`p-1.5 rounded-keepeit transition-all duration-150 active:scale-95 ${
                          isRevealed
                            ? 'bg-[var(--accent-seal)] text-[var(--accent-fg)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                        }`}
                        title={isRevealed ? 'Hide Password' : 'Reveal Password (15s auto-hide)'}
                      >
                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>

                      {/* Copy Password (30s auto-clear) */}
                      <button
                        onClick={() => handleCopyPassword(item.password, item.id)}
                        className={`p-1.5 rounded-keepeit transition-all duration-150 ${
                          isCopied
                            ? 'scale-110 text-emerald-500 bg-emerald-500/10'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] active:scale-95'
                        }`}
                        title="Copy Password (auto-clears in 30s)"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 animate-checkmark-pop text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Overflow Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit transition-all active:scale-95"
                          title="More actions"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {activeMenuId === item.id && (
                          <div className="absolute right-0 bottom-8 z-30 w-40 bg-[var(--bg-card)] border-keepeit rounded-keepeit shadow-xl py-1 text-xs font-mono">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-surface)] flex items-center gap-2 text-[var(--text-primary)] transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => {
                                setItemToMove(item);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-surface)] flex items-center gap-2 text-[var(--text-primary)] transition-colors"
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                              <span>Move to Folder</span>
                            </button>
                            <button
                              onClick={() => {
                                setItemToDelete(item);
                                setActiveMenuId(null);
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
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="bg-[var(--bg-card)] border-keepeit rounded-keepeit divide-y divide-keepeit overflow-hidden">
            {filteredCredentials.map((item, index) => {
              const isRevealed = !!revealedPasswordIds[item.id];
              const folder = vaultData.folders.find((f) => f.id === item.folderId);
              const avatarBg = getHashColor(item.title);
              const letter = item.title ? item.title.charAt(0).toUpperCase() : '?';
              const isCopied = copiedItemId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => setItemDetail(item)}
                  style={{ animationDelay: `${index * 35}ms` }}
                  className="p-3 sm:p-4 hover:bg-[var(--bg-surface-hover)] transition-all duration-150 active:scale-[0.99] flex items-center justify-between gap-3 cursor-pointer group animate-[fadeInUp_0.25s_ease-out_forwards]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 font-mono shadow-xs"
                      style={{ backgroundColor: avatarBg }}
                    >
                      {letter}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-semibold text-sm text-[var(--text-primary)] truncate">
                          {item.title}
                        </span>
                        {folder && (
                          <span
                            className="text-[9px] font-mono-label px-1.5 py-0.2 rounded-keepeit text-white font-semibold"
                            style={{ backgroundColor: folder.color || 'var(--accent-seal)' }}
                          >
                            {folder.name}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-[var(--text-muted)] truncate block">
                        {item.username || 'No username'}
                      </span>
                    </div>

                    {/* Truncated note preview in list view */}
                    {item.notes && (
                      <div className="hidden lg:block text-xs text-[var(--text-muted)] truncate max-w-xs italic">
                        "{item.notes}"
                      </div>
                    )}
                  </div>

                  {/* Actions & Password Mask */}
                  <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <div className="font-mono text-xs text-[var(--text-primary)] bg-[var(--bg-surface)] px-2.5 py-1 rounded-keepeit border-keepeit hidden sm:block w-32 truncate text-center font-medium">
                      {isRevealed ? item.password || '—' : '••••••••••••'}
                    </div>

                    <button
                      onClick={() => handleToggleRevealPassword(item.id)}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit transition-all active:scale-95"
                      title={isRevealed ? 'Hide Password' : 'Reveal Password (15s)'}
                    >
                      {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => handleCopyPassword(item.password, item.id)}
                      className={`p-1.5 rounded-keepeit transition-all duration-150 ${
                        isCopied
                          ? 'scale-110 text-emerald-500 bg-emerald-500/10'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] active:scale-95'
                      }`}
                      title="Copy Password"
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4 animate-checkmark-pop text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => toggleFavorite(item.id)}
                      className={`p-1.5 rounded-keepeit transition-all active:scale-90 ${
                        item.isFavorite ? 'text-amber-500' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                      title={item.isFavorite ? 'Unfavorite' : 'Favorite'}
                    >
                      <Star className={`w-4 h-4 ${item.isFavorite ? 'fill-amber-500' : ''}`} />
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-keepeit hidden sm:block transition-all active:scale-95"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setItemToDelete(item)}
                      className="p-1.5 text-[var(--accent-rust)] hover:bg-[var(--accent-rust)]/10 rounded-keepeit hidden sm:block transition-all active:scale-95"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {itemDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border-keepeit rounded-keepeit max-w-md w-full p-4 sm:p-6 pb-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-keepeit pb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 font-mono"
                  style={{ backgroundColor: getHashColor(itemDetail.title) }}
                >
                  {itemDetail.title ? itemDetail.title.charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
                    {itemDetail.title}
                  </h3>
                  <span className="text-[10px] font-mono-label text-[var(--text-muted)]">
                    UPDATED {new Date(itemDetail.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setItemDetail(null)}
                className="p-1 rounded-keepeit text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {/* Username */}
              <div className="p-2.5 bg-[var(--bg-surface)] border-keepeit rounded-keepeit">
                <span className="text-[10px] font-mono-label text-[var(--text-muted)] block">USERNAME</span>
                <span className="text-[var(--text-primary)] font-medium select-all">
                  {itemDetail.username || '—'}
                </span>
              </div>

              {/* Password */}
              <div className="p-2.5 bg-[var(--bg-surface)] border-keepeit rounded-keepeit flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono-label text-[var(--text-muted)] block">PASSWORD</span>
                  <span className="text-[var(--text-primary)] font-medium">
                    {revealedPasswordIds[itemDetail.id] ? itemDetail.password : '••••••••••••'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleRevealPassword(itemDetail.id)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {revealedPasswordIds[itemDetail.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleCopyPassword(itemDetail.password, itemDetail.id)}
                    className={`p-1 rounded-keepeit transition-all duration-150 ${
                      copiedItemId === itemDetail.id
                        ? 'scale-110 text-emerald-500 bg-emerald-500/10'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] active:scale-95'
                    }`}
                  >
                    {copiedItemId === itemDetail.id ? (
                      <Check className="w-4 h-4 animate-checkmark-pop text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* URL */}
              {itemDetail.url && (
                <div className="p-2.5 bg-[var(--bg-surface)] border-keepeit rounded-keepeit">
                  <span className="text-[10px] font-mono-label text-[var(--text-muted)] block">WEBSITE</span>
                  <a
                    href={itemDetail.url.startsWith('http') ? itemDetail.url : `https://${itemDetail.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-seal)] hover:underline flex items-center gap-1"
                  >
                    <span className="truncate">{itemDetail.url}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Notes */}
              {itemDetail.notes && (
                <div className="p-2.5 bg-[var(--bg-surface)] border-keepeit rounded-keepeit">
                  <span className="text-[10px] font-mono-label text-[var(--text-muted)] block">NOTES</span>
                  <p className="text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap font-sans">
                    {itemDetail.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-keepeit flex items-center justify-between">
              <button
                onClick={() => {
                  setItemToDelete(itemDetail);
                }}
                className="px-3 py-1.5 text-xs font-mono-label text-[var(--accent-rust)] hover:bg-[var(--accent-rust)]/10 rounded-keepeit transition-all active:scale-95"
              >
                DELETE
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyPassword(itemDetail.password, itemDetail.id)}
                  className={`px-3 py-1.5 bg-[var(--bg-surface)] border-keepeit rounded-keepeit text-xs font-mono-label text-[var(--text-primary)] transition-all active:scale-95 flex items-center gap-1.5 ${
                    copiedItemId === itemDetail.id ? 'text-emerald-500 border-emerald-500/30' : ''
                  }`}
                >
                  {copiedItemId === itemDetail.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500 animate-checkmark-pop" />
                      <span>COPIED</span>
                    </>
                  ) : (
                    <span>COPY PASSWORD</span>
                  )}
                </button>
                <button
                  onClick={() => handleOpenEditModal(itemDetail)}
                  className="btn-stealth-primary px-4 py-1.5 active:scale-[0.98] font-mono-label text-xs font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
                >
                  EDIT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW / EDIT CREDENTIAL MODAL */}
      <CredentialEditorModal
        isOpen={isEditorOpen}
        itemToEdit={itemToEdit}
        folders={credentialFolders}
        tags={allTags}
        onClose={() => setIsEditorOpen(false)}
      />

      {/* MOVE TO FOLDER MODAL */}
      {itemToMove && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border-keepeit rounded-keepeit max-w-sm w-full p-4 sm:p-6 pb-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">
              Move '{itemToMove.title}' to Folder
            </h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              <button
                onClick={() => handleMoveFolder(undefined)}
                className={`w-full text-left p-2 rounded-keepeit font-mono text-xs ${
                  !itemToMove.folderId ? 'bg-[var(--accent-seal)] text-[var(--accent-fg)] font-semibold' : 'hover:bg-[var(--bg-surface)] text-[var(--text-primary)]'
                }`}
              >
                (No Folder / Root)
              </button>
              {credentialFolders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleMoveFolder(f.id)}
                  className={`w-full text-left p-2 rounded-keepeit font-mono text-xs flex items-center justify-between ${
                    itemToMove.folderId === f.id
                      ? 'bg-[var(--accent-seal)] text-[var(--accent-fg)] font-semibold'
                      : 'hover:bg-[var(--bg-surface)] text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: f.color || 'var(--accent-seal)' }}
                    />
                    <span>{f.name}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-2 border-t border-keepeit">
              <button
                onClick={() => setItemToMove(null)}
                className="px-3 py-1.5 text-xs font-mono-label border-keepeit rounded-keepeit"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border-keepeit rounded-keepeit p-4 sm:p-6 pb-8 max-w-sm w-full shadow-2xl space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-[var(--accent-rust)] flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Delete Credential?
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Are you sure you want to delete <strong className="text-[var(--text-primary)]">'{itemToDelete.title}'</strong>?
              This will permanently remove the record from your local zero-knowledge vault.
            </p>
            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-3 py-1.5 text-xs font-mono-label border-keepeit rounded-keepeit text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
              >
                CANCEL
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 text-xs font-mono-label bg-[var(--accent-rust)] text-white rounded-keepeit hover:opacity-90 font-semibold"
              >
                CONFIRM DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* INLINE CREDENTIAL EDITOR MODAL COMPONENT WITH AUTOCOMPLETE & INLINE GENERATOR */
interface CredentialEditorModalProps {
  isOpen: boolean;
  itemToEdit: CredentialItem | null;
  folders: Folder[];
  tags: { id: string; name: string }[];
  onClose: () => void;
}

const CredentialEditorModal: React.FC<CredentialEditorModalProps> = ({
  isOpen,
  itemToEdit,
  folders,
  tags,
  onClose,
}) => {
  const { addItem, updateItem, addTag } = useVault();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [notes, setNotes] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showTagAutocomplete, setShowTagAutocomplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (itemToEdit) {
      setTitle(itemToEdit.title || '');
      setUsername(itemToEdit.username || '');
      setPassword(itemToEdit.password || '');
      setUrl(itemToEdit.url || '');
      setFolderId(itemToEdit.folderId || '');
      setSelectedTags(itemToEdit.tags || []);
      setIsFavorite(itemToEdit.isFavorite || false);
      setNotes(itemToEdit.notes || '');
    } else {
      setTitle('');
      setUsername('');
      setPassword('');
      setUrl('');
      setFolderId('');
      setSelectedTags([]);
      setIsFavorite(false);
      setNotes('');
    }
    setErrorMessage(null);
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const gen = generateSecurePassword({
      length: 18,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
    });
    setPassword(gen);
    setShowPassword(true);
    showToast('High-entropy password generated inline.', 'info');
  };

  const handleAddTag = (tagNameToAdd?: string) => {
    const clean = (tagNameToAdd || tagInput).trim().replace(/^#/, '');
    if (!clean) return;
    if (selectedTags.length >= 5) {
      setErrorMessage('Maximum 5 tags allowed per item.');
      return;
    }
    if (!selectedTags.includes(clean)) {
      setSelectedTags([...selectedTags, clean]);
      addTag(clean);
    }
    setTagInput('');
    setShowTagAutocomplete(false);
  };

  const handleRemoveTag = (t: string) => {
    setSelectedTags(selectedTags.filter((tag) => tag !== t));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Name / Title is required.');
      return;
    }

    try {
      const payload: Omit<CredentialItem, 'id' | 'createdAt' | 'updatedAt'> = {
        title: title.trim(),
        category: 'credential',
        username: username.trim(),
        password,
        url: url.trim() || undefined,
        folderId: folderId || undefined,
        tags: selectedTags,
        isFavorite,
        notes: notes.trim() || undefined,
      };

      if (itemToEdit) {
        await updateItem({
          ...payload,
          id: itemToEdit.id,
          createdAt: itemToEdit.createdAt,
          updatedAt: itemToEdit.updatedAt,
        });
        showToast(`Updated '${title.trim()}' credential.`, 'success');
      } else {
        await addItem(payload);
        showToast(`Saved '${title.trim()}' to encrypted vault.`, 'success');
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save credential.');
    }
  };

  // Tag Autocomplete Filtering
  const autocompleteSuggestions = tags.filter(
    (t) =>
      tagInput.trim() &&
      t.name.toLowerCase().includes(tagInput.toLowerCase().trim()) &&
      !selectedTags.includes(t.name)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border-keepeit rounded-keepeit max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-keepeit pb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
              {itemToEdit ? 'Edit Credential' : 'New Credential'}
            </h3>
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className={`p-1 rounded-keepeit transition-colors ${
                isFavorite ? 'text-amber-500' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title={isFavorite ? 'Unfavorite' : 'Favorite'}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-500' : ''}`} />
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-keepeit text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <p className="text-xs text-[var(--accent-rust)] font-mono bg-[var(--accent-rust)]/10 p-2 rounded-keepeit">
            {errorMessage}
          </p>
        )}

        <form onSubmit={handleSave} className="space-y-3.5 text-xs font-mono">
          {/* Name / Title */}
          <div>
            <label className="block text-[10px] font-mono-label text-[var(--text-muted)] mb-1">
              ITEM NAME / SERVICE *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. GitHub Account, Bank Login"
              className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-seal)]"
              required
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-[10px] font-mono-label text-[var(--text-muted)] mb-1">
              USERNAME / EMAIL / ACCOUNT ID
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. krtgonzaga44@gmail.com"
              className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
            />
          </div>

          {/* Password + Inline Generator */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-mono-label text-[var(--text-muted)]">
                PASSWORD
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-[10px] font-mono-label text-[var(--accent-seal)] hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>GENERATE INLINE</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Website URL */}
          <div>
            <label className="block text-[10px] font-mono-label text-[var(--text-muted)] mb-1">
              WEBSITE URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/login"
              className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
            />
          </div>

          {/* Folder Select */}
          <div>
            <label className="block text-[10px] font-mono-label text-[var(--text-muted)] mb-1">
              FOLDER
            </label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)] cursor-pointer"
            >
              <option value="">(No Folder)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags Input (Max 5, free-text with autocomplete) */}
          <div className="relative">
            <label className="block text-[10px] font-mono-label text-[var(--text-muted)] mb-1">
              TAGS (MAX 5)
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  setShowTagAutocomplete(true);
                }}
                onFocus={() => setShowTagAutocomplete(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Type tag + Enter"
                className="flex-1 bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-1.5 text-xs text-[var(--text-primary)]"
              />
              <button
                type="button"
                onClick={() => handleAddTag()}
                className="px-3 py-1.5 bg-[var(--bg-surface)] border-keepeit rounded-keepeit font-mono-label text-[11px] text-[var(--text-primary)]"
              >
                ADD
              </button>
            </div>

            {/* Tag Autocomplete Dropdown */}
            {showTagAutocomplete && autocompleteSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--bg-card)] border-keepeit rounded-keepeit shadow-lg z-30 max-h-32 overflow-y-auto">
                {autocompleteSuggestions.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleAddTag(st.name)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-surface)] font-mono text-[var(--text-primary)] flex items-center justify-between"
                  >
                    <span>#{st.name}</span>
                    <span className="text-[9px] font-mono-label text-[var(--text-muted)]">EXISTING</span>
                  </button>
                ))}
              </div>
            )}

            {/* Active Tag Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedTags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--bg-surface)] border-keepeit rounded-keepeit text-[10px] font-mono text-[var(--text-primary)]"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-[var(--accent-rust)] text-[var(--text-muted)]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-mono-label text-[var(--text-muted)] mb-1">
              NOTES
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Encrypted notes or security hints..."
              className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit p-2.5 text-xs font-mono text-[var(--text-primary)]"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-keepeit flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-mono-label border-keepeit rounded-keepeit hover:bg-[var(--bg-surface)] text-[var(--text-primary)]"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="btn-stealth-primary px-4 py-1.5 active:scale-[0.98] font-mono-label text-xs font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
            >
              SAVE CREDENTIAL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

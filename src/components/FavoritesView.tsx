import React, { useState } from 'react';
import { useVault } from '../hooks/useVault';
import { CredentialItem, Folder, NoteItem, TaskItem, VaultItem } from '../types/vault';
import {
  Star,
  LayoutGrid,
  List,
  Folder as FolderIcon,
  KeyRound,
  FileText,
  CheckSquare,
  Copy,
  Check,
  Eye,
  Trash2,
  Lock,
  ArrowUpRight,
  Clock,
  Sparkles,
} from 'lucide-react';

type FavoriteCategory = 'all' | 'credentials' | 'notes' | 'tasks' | 'folders';

export const FavoritesView: React.FC = () => {
  const { vaultData, toggleFavorite, toggleTaskFavorite, toggleFavoriteFolder, deleteItem, deleteTask, deleteFolder, toggleTaskStatus } = useVault();

  const [activeTab, setActiveTab] = useState<FavoriteCategory>('all');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!vaultData) return null;

  // Gather all favorite items across modules
  const favoriteFolders: Folder[] = vaultData.folders.filter((f) => f.isFavorite);
  const favoriteCredentials: CredentialItem[] = vaultData.items.filter(
    (i) => i.isFavorite && i.category === 'credential'
  ) as CredentialItem[];
  const favoriteNotes: NoteItem[] = vaultData.items.filter(
    (i) => i.isFavorite && i.category === 'note'
  ) as NoteItem[];
  const favoriteTasks: TaskItem[] = (vaultData.tasks || []).filter((t) => t.isFavorite);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getFolder = (folderId?: string) => {
    if (!folderId) return null;
    return vaultData.folders.find((f) => f.id === folderId);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-main)] overflow-y-auto">
      {/* Header Bar */}
      <div className="p-6 border-b border-keepeit bg-[var(--bg-card)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display font-bold text-xl text-[var(--text-primary)] flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              Starred Favorites
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              Quick access directory for frequently accessed encrypted credentials, notes, tasks, and folders.
            </p>
          </div>

          {/* Grid / List Layout Toggle */}
          <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-1 border border-keepeit rounded-keepeit shrink-0">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`p-1.5 rounded-keepeit text-xs flex items-center gap-1 font-mono-label transition-colors ${
                layoutMode === 'grid'
                  ? 'bg-[var(--accent-seal)] text-[var(--accent-fg)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden md:inline">GRID</span>
            </button>
            <button
              onClick={() => setLayoutMode('list')}
              className={`p-1.5 rounded-keepeit text-xs flex items-center gap-1 font-mono-label transition-colors ${
                layoutMode === 'list'
                  ? 'bg-[var(--accent-seal)] text-[var(--accent-fg)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
              <span className="hidden md:inline">LIST</span>
            </button>
          </div>
        </div>

        {/* Category Switcher Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 font-mono-label text-xs">
          {[
            { id: 'all', label: 'ALL FAVORITES', count: favoriteFolders.length + favoriteCredentials.length + favoriteNotes.length + favoriteTasks.length },
            { id: 'credentials', label: 'CREDENTIALS', count: favoriteCredentials.length },
            { id: 'notes', label: 'NOTES', count: favoriteNotes.length },
            { id: 'tasks', label: 'TASKS', count: favoriteTasks.length },
            { id: 'folders', label: 'FOLDERS', count: favoriteFolders.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as FavoriteCategory)}
              className={`px-3 py-1.5 rounded-keepeit border border-keepeit shrink-0 transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-[var(--accent-seal)] text-[var(--accent-fg)] font-semibold'
                  : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                  activeTab === tab.id ? 'bg-[var(--accent-fg)]/20 text-[var(--accent-fg)]' : 'bg-[var(--bg-main)] text-[var(--text-muted)]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 space-y-6">
        {/* Folders Section */}
        {(activeTab === 'all' || activeTab === 'folders') && favoriteFolders.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-mono-label text-[var(--text-muted)] flex items-center gap-1.5">
              <FolderIcon className="w-4 h-4 text-[var(--accent-seal)]" />
              STARRED FOLDERS ({favoriteFolders.length})
            </h2>
            <div
              className={
                layoutMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
                  : 'space-y-2'
              }
            >
              {favoriteFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="p-3 bg-[var(--bg-card)] border border-keepeit rounded-keepeit flex items-center justify-between gap-3 group hover:border-[var(--accent-seal)] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: folder.color || '#2F6F52' }}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-[var(--text-primary)] truncate">{folder.name}</p>
                      <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                        SCOPE: {folder.scope || 'ALL'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleFavoriteFolder(folder.id)}
                      className="p-1 text-amber-500 hover:opacity-80"
                      title="Unstar Folder"
                    >
                      <Star className="w-4 h-4 fill-amber-500" />
                    </button>
                    <button
                      onClick={() => deleteFolder(folder.id)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-rust)]"
                      title="Delete Folder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Credentials Section */}
        {(activeTab === 'all' || activeTab === 'credentials') && favoriteCredentials.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-mono-label text-[var(--text-muted)] flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-[var(--accent-seal)]" />
              STARRED CREDENTIALS ({favoriteCredentials.length})
            </h2>
            <div
              className={
                layoutMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
                  : 'space-y-2'
              }
            >
              {favoriteCredentials.map((cred) => {
                const folder = getFolder(cred.folderId);
                return (
                  <div
                    key={cred.id}
                    className="p-4 bg-[var(--bg-card)] border border-keepeit rounded-keepeit space-y-3 group hover:border-[var(--accent-seal)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <KeyRound className="w-4 h-4 text-[var(--accent-seal)] shrink-0" />
                          <h3 className="font-bold text-xs text-[var(--text-primary)] truncate">{cred.title}</h3>
                        </div>
                        <p className="font-mono text-xs text-[var(--text-muted)] truncate">{cred.username || 'No Username'}</p>
                      </div>

                      <button
                        onClick={() => toggleFavorite(cred.id)}
                        className="text-amber-500 hover:opacity-80 shrink-0"
                        title="Unstar Credential"
                      >
                        <Star className="w-4 h-4 fill-amber-500" />
                      </button>
                    </div>

                    {folder && (
                      <span className="inline-block px-2 py-0.5 bg-[var(--bg-surface)] text-[10px] font-mono text-[var(--text-muted)] rounded-keepeit">
                        {folder.name}
                      </span>
                    )}

                    <div className="pt-2 border-t border-keepeit flex items-center justify-between gap-2 text-xs font-mono-label">
                      <button
                        onClick={() => handleCopy(cred.username, cred.id + '-user')}
                        className="px-2 py-1 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-keepeit rounded-keepeit text-[var(--text-primary)] text-[10px] flex items-center gap-1"
                      >
                        {copiedId === cred.id + '-user' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>USER</span>
                      </button>

                      <button
                        onClick={() => handleCopy(cred.password, cred.id + '-pass')}
                        className="px-2 py-1 bg-[var(--accent-seal)] text-[var(--accent-fg)] hover:opacity-90 rounded-keepeit text-[10px] font-semibold flex items-center gap-1"
                      >
                        {copiedId === cred.id + '-pass' ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        <span>PASSWORD</span>
                      </button>

                      <button
                        onClick={() => deleteItem(cred.id)}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-rust)]"
                        title="Delete Credential"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes Section */}
        {(activeTab === 'all' || activeTab === 'notes') && favoriteNotes.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-mono-label text-[var(--text-muted)] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[var(--accent-seal)]" />
              STARRED NOTES ({favoriteNotes.length})
            </h2>
            <div
              className={
                layoutMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
                  : 'space-y-2'
              }
            >
              {favoriteNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 bg-[var(--bg-card)] border border-keepeit rounded-keepeit space-y-2 group hover:border-[var(--accent-seal)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-xs text-[var(--text-primary)] truncate">{note.title}</h3>
                    <button
                      onClick={() => toggleFavorite(note.id)}
                      className="text-amber-500 hover:opacity-80 shrink-0"
                      title="Unstar Note"
                    >
                      <Star className="w-4 h-4 fill-amber-500" />
                    </button>
                  </div>

                  <p className="text-xs text-[var(--text-muted)] line-clamp-3 leading-relaxed">
                    {note.content || 'Empty note content...'}
                  </p>

                  <div className="pt-2 border-t border-keepeit flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(note.content, note.id)}
                        className="p-1 hover:text-[var(--text-primary)]"
                        title="Copy Note Content"
                      >
                        {copiedId === note.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => deleteItem(note.id)}
                        className="p-1 hover:text-[var(--accent-rust)]"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks Section */}
        {(activeTab === 'all' || activeTab === 'tasks') && favoriteTasks.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-mono-label text-[var(--text-muted)] flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-[var(--accent-seal)]" />
              STARRED TASKS ({favoriteTasks.length})
            </h2>
            <div className="space-y-2">
              {favoriteTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-[var(--bg-card)] border border-keepeit rounded-keepeit flex items-center justify-between gap-3 group hover:border-[var(--accent-seal)] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={() => toggleTaskStatus(task.id, task.status === 'completed' ? 'todo' : 'completed')}
                      className="accent-[var(--accent-seal)] cursor-pointer"
                    />
                    <div className="min-w-0">
                      <p
                        className={`font-semibold text-xs text-[var(--text-primary)] truncate ${
                          task.status === 'completed' ? 'line-through opacity-60' : ''
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.dueDate && (
                        <p className="text-[10px] font-mono text-[var(--text-muted)]">DUE: {task.dueDate}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleTaskFavorite(task.id)}
                      className="text-amber-500 hover:opacity-80"
                      title="Unstar Task"
                    >
                      <Star className="w-4 h-4 fill-amber-500" />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-[var(--text-muted)] hover:text-[var(--accent-rust)]"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {favoriteFolders.length === 0 &&
          favoriteCredentials.length === 0 &&
          favoriteNotes.length === 0 &&
          favoriteTasks.length === 0 && (
            <div className="p-12 text-center bg-[var(--bg-card)] border border-keepeit rounded-keepeit space-y-3 max-w-md mx-auto">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)]">
                <Star className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-base text-[var(--text-primary)]">No Starred Favorites</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                You haven't starred any vault items, notes, tasks, or folders yet. Star your most used items in any module for instant one-click access here.
              </p>
            </div>
          )}
      </div>
    </div>
  );
};

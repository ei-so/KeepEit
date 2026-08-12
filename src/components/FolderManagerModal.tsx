import React, { useState } from 'react';
import { useVault } from '../hooks/useVault';
import { Folder } from '../types/vault';
import { X, FolderPlus, Trash2, Folder as FolderIcon, Star, Edit, Check } from 'lucide-react';

interface FolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FolderManagerModal: React.FC<FolderManagerModalProps> = ({ isOpen, onClose }) => {
  const { vaultData, addFolder, updateFolder, deleteFolder, toggleFavoriteFolder } = useVault();
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('#2F6F52');
  const [folderScope, setFolderScope] = useState<'credentials' | 'notes' | 'all'>('credentials');
  
  // Edit mode state
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#2F6F52');
  const [editScope, setEditScope] = useState<'credentials' | 'notes' | 'all'>('credentials');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !vaultData) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setErrorMessage('Folder name cannot be empty.');
      return;
    }
    try {
      await addFolder(folderName.trim(), folderColor, folderScope);
      setFolderName('');
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create folder.');
    }
  };

  const startEdit = (f: Folder) => {
    setEditingFolderId(f.id);
    setEditName(f.name);
    setEditColor(f.color || '#2F6F52');
    setEditScope(f.scope === 'notes' ? 'notes' : f.scope === 'credentials' ? 'credentials' : 'all');
  };

  const handleSaveEdit = async (f: Folder) => {
    if (!editName.trim()) return;
    await updateFolder({
      ...f,
      name: editName.trim(),
      color: editColor,
      scope: editScope,
    });
    setEditingFolderId(null);
  };

  const presetColors = ['#2F6F52', '#B4472C', '#7A8479', '#2563EB', '#7C3AED', '#DB2777', '#D97706'];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border-keepeit rounded-keepeit max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-keepeit pb-3">
          <h3 className="font-display font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
            <FolderIcon className="w-5 h-5 text-[var(--accent-seal)]" />
            Manage Shared Folders
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-keepeit text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <p className="text-xs text-[var(--accent-rust)] font-mono">{errorMessage}</p>
        )}

        {/* Create Folder Form */}
        <form onSubmit={handleCreate} className="space-y-3 font-mono text-xs">
          <div>
            <label className="block text-[10px] font-mono-label text-[var(--text-muted)] mb-1">
              NEW FOLDER NAME
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. Legal Credentials, Work Notes"
              className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-1.5 text-xs text-[var(--text-primary)] focus-visible:ring-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-mono-label text-[var(--text-muted)] mb-1">
                SCOPE / CATEGORY
              </label>
              <select
                value={folderScope}
                onChange={(e) => setFolderScope(e.target.value as any)}
                className="w-full bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-2 py-1.5 text-xs text-[var(--text-primary)]"
              >
                <option value="credentials">Credentials Only</option>
                <option value="notes">Notes Only</option>
                <option value="all">Shared / All</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono-label text-[var(--text-muted)] mb-1">
                COLOR PRESET
              </label>
              <div className="flex items-center gap-1 mt-1">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFolderColor(color)}
                    className={`w-4 h-4 rounded-full transition-transform ${
                      folderColor === color ? 'scale-125 ring-2 ring-offset-1 ring-[var(--text-primary)]' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-1.5 bg-[var(--accent-seal)] text-white font-mono-label text-xs font-semibold rounded-keepeit hover:opacity-90 flex items-center justify-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4" />
            <span>CREATE FOLDER</span>
          </button>
        </form>

        {/* Folder List */}
        <div className="pt-3 border-t border-keepeit space-y-2 max-h-60 overflow-y-auto font-mono text-xs">
          <span className="text-[10px] font-mono-label text-[var(--text-muted)] block">
            EXISTING FOLDERS ({vaultData.folders.length})
          </span>
          {vaultData.folders.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic">No custom folders created yet.</p>
          ) : (
            vaultData.folders.map((f) => {
              const count = vaultData.items.filter((i) => i.folderId === f.id).length;
              const isEditing = editingFolderId === f.id;

              if (isEditing) {
                return (
                  <div key={f.id} className="p-2.5 bg-[var(--bg-surface)] border-keepeit rounded-keepeit space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border-keepeit rounded-keepeit px-2 py-1 text-xs"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={editScope}
                        onChange={(e) => setEditScope(e.target.value as any)}
                        className="bg-[var(--bg-card)] border-keepeit rounded-keepeit px-2 py-1 text-[11px]"
                      >
                        <option value="credentials">Credentials</option>
                        <option value="notes">Notes</option>
                        <option value="all">All</option>
                      </select>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSaveEdit(f)}
                          className="px-2 py-1 bg-[var(--accent-seal)] text-white rounded-keepeit text-[10px] font-mono-label"
                        >
                          SAVE
                        </button>
                        <button
                          onClick={() => setEditingFolderId(null)}
                          className="px-2 py-1 bg-[var(--bg-card)] border-keepeit rounded-keepeit text-[10px] font-mono-label"
                        >
                          CANCEL
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-2.5 bg-[var(--bg-surface)] border-keepeit rounded-keepeit"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: f.color || 'var(--accent-seal)' }}
                    />
                    <span className="font-medium text-[var(--text-primary)] truncate">
                      {f.name}
                    </span>
                    <span className="text-[10px] font-mono-label text-[var(--text-muted)] uppercase shrink-0">
                      [{f.scope || 'credentials'}]
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                      ({count})
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleFavoriteFolder(f.id)}
                      className={`p-1 rounded-keepeit ${
                        f.isFavorite ? 'text-amber-500' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                      title={f.isFavorite ? 'Unstar folder' : 'Star folder'}
                    >
                      <Star className={`w-3.5 h-3.5 ${f.isFavorite ? 'fill-amber-500' : ''}`} />
                    </button>
                    <button
                      onClick={() => startEdit(f)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      title="Rename / Edit Folder"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteFolder(f.id)}
                      className="p-1 text-[var(--accent-rust)] hover:bg-[var(--accent-rust)]/10 rounded-keepeit"
                      title="Delete Folder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

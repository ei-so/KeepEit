import React, { useState } from 'react';
import { useVault } from '../hooks/useVault';
import { X, Plus, Trash2, Tag as TagIcon } from 'lucide-react';

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TagManagerModal: React.FC<TagManagerModalProps> = ({ isOpen, onClose }) => {
  const { vaultData, addTag, deleteTag } = useVault();
  const [tagName, setTagName] = useState('');

  if (!isOpen || !vaultData) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;
    await addTag(tagName.trim());
    setTagName('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border-keepeit rounded-keepeit max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-keepeit pb-3">
          <h3 className="font-display font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
            <TagIcon className="w-5 h-5 text-[var(--accent-seal)]" />
            Manage Shared Tags
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-keepeit text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create Tag Form */}
        <form onSubmit={handleCreate} className="space-y-2">
          <label className="block text-xs font-mono-label text-[var(--text-muted)] mb-1">
            NEW TAG NAME
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="e.g. Urgent, 2FA, Banking"
              className="flex-1 bg-[var(--bg-surface)] border-keepeit rounded-keepeit px-3 py-1.5 text-xs text-[var(--text-primary)] focus-visible:ring-2"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-[var(--accent-seal)] text-white font-mono-label text-xs font-semibold rounded-keepeit hover:opacity-90 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>ADD</span>
            </button>
          </div>
        </form>

        {/* Tag List */}
        <div className="pt-3 border-t border-keepeit space-y-2 max-h-60 overflow-y-auto">
          <span className="text-[10px] font-mono-label text-[var(--text-muted)] block">
            EXISTING TAGS ({vaultData.tags.length})
          </span>
          {vaultData.tags.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic">No custom tags created.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {vaultData.tags.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-surface)] border-keepeit rounded-keepeit text-xs font-mono text-[var(--text-primary)]"
                >
                  <span>#{t.name}</span>
                  <button
                    onClick={() => deleteTag(t.id)}
                    className="text-[var(--accent-rust)] hover:opacity-80 ml-1"
                    title="Delete Tag"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

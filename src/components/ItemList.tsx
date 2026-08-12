import React, { useState } from 'react';
import { VaultItem, VaultCategory } from '../types/vault';
import { useVault } from '../hooks/useVault';
import {
  FileText,
  Key,
  CreditCard,
  Code,
  File,
  Star,
  Plus,
  SearchX,
  ArrowUpDown,
  Filter,
  Layers,
} from 'lucide-react';

interface ItemListProps {
  selectedCategory: VaultCategory | 'all' | 'favorites';
  selectedFolderId: string | null;
  selectedTag: string | null;
  searchQuery: string;
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onOpenNewItemModal: () => void;
  onClearFilters: () => void;
}

export const ItemList: React.FC<ItemListProps> = ({
  selectedCategory,
  selectedFolderId,
  selectedTag,
  searchQuery,
  selectedItemId,
  onSelectItem,
  onOpenNewItemModal,
  onClearFilters,
}) => {
  const { vaultData, toggleFavorite } = useVault();
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'category'>('updated');

  if (!vaultData) return null;

  let items = vaultData.items || [];

  // Filter 1: Category or Favorites
  if (selectedCategory === 'favorites') {
    items = items.filter((i) => i.isFavorite);
  } else if (selectedCategory !== 'all') {
    items = items.filter((i) => i.category === selectedCategory);
  }

  // Filter 2: Folder
  if (selectedFolderId) {
    items = items.filter((i) => i.folderId === selectedFolderId);
  }

  // Filter 3: Tag
  if (selectedTag) {
    items = items.filter((i) => i.tags && i.tags.includes(selectedTag));
  }

  // Filter 4: Search Query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    items = items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        (i.notes && i.notes.toLowerCase().includes(q)) ||
        (i.tags && i.tags.some((t) => t.toLowerCase().includes(q))) ||
        (i.category === 'credential' && i.username.toLowerCase().includes(q)) ||
        (i.category === 'note' && i.content.toLowerCase().includes(q)) ||
        (i.category === 'snippet' && i.code.toLowerCase().includes(q)) ||
        (i.category === 'file' && i.fileName.toLowerCase().includes(q))
    );
  }

  // Sort
  items.sort((a, b) => {
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'category') {
      return a.category.localeCompare(b.category);
    }
    // Default: Updated Date Descending
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'note':
        return <FileText className="w-4 h-4 text-[var(--accent-seal)]" />;
      case 'credential':
        return <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'card':
        return <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'snippet':
        return <Code className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'file':
        return <File className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      default:
        return <Layers className="w-4 h-4 text-[var(--accent-seal)]" />;
    }
  };

  const getFolder = (folderId?: string) => {
    if (!folderId) return null;
    return vaultData.folders.find((f) => f.id === folderId);
  };

  return (
    <div className="w-full md:w-80 shrink-0 border-r border-keepeit bg-[var(--bg-card)] flex flex-col h-full select-none">
      {/* Sorting Header */}
      <div className="p-3 border-b border-keepeit bg-[var(--bg-surface)] flex items-center justify-between text-xs font-mono-label">
        <span className="text-[var(--text-muted)] font-semibold">
          {items.length} {items.length === 1 ? 'ITEM' : 'ITEMS'}
        </span>

        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-[var(--text-primary)] font-mono text-xs cursor-pointer focus-visible:ring-1 rounded-keepeit"
          >
            <option value="updated">Recent</option>
            <option value="title">Title A-Z</option>
            <option value="category">Type</option>
          </select>
        </div>
      </div>

      {/* Item List Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-keepeit">
        {items.length === 0 ? (
          <div className="p-6 text-center text-[var(--text-muted)] space-y-3">
            <div className="w-10 h-10 rounded-keepeit bg-[var(--bg-surface)] border-keepeit flex items-center justify-center mx-auto">
              <SearchX className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="font-display font-semibold text-sm text-[var(--text-primary)]">
                No Vault Items Found
              </p>
              <p className="text-xs mt-1 leading-relaxed">
                {searchQuery || selectedFolderId || selectedTag
                  ? 'No records match your active search or tag filters.'
                  : `Your ${selectedCategory === 'all' ? 'vault' : selectedCategory} is currently empty.`}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {searchQuery || selectedFolderId || selectedTag ? (
                <button
                  onClick={onClearFilters}
                  className="px-3 py-1.5 bg-[var(--bg-surface)] border-keepeit rounded-keepeit text-xs font-mono-label text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
                >
                  CLEAR FILTERS
                </button>
              ) : (
                <button
                  onClick={onOpenNewItemModal}
                  className="px-3 py-1.5 bg-[var(--accent-seal)] text-[var(--accent-fg)] rounded-keepeit text-xs font-mono-label font-semibold hover:opacity-90 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>CREATE FIRST ITEM</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          items.map((item) => {
            const isSelected = item.id === selectedItemId;
            const folder = getFolder(item.folderId);

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                className={`p-3 cursor-pointer transition-colors flex items-start justify-between gap-2.5 focus-visible:ring-2 ${
                  isSelected
                    ? 'bg-[var(--accent-seal-soft)] border-l-4 border-l-[var(--accent-seal)]'
                    : 'hover:bg-[var(--bg-surface-hover)]'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="p-1.5 rounded-keepeit bg-[var(--bg-surface)] border-keepeit shrink-0 mt-0.5">
                    {getCategoryIcon(item.category)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-xs text-[var(--text-primary)] truncate">
                        {item.title}
                      </span>
                    </div>

                    {/* Secondary Detail Text */}
                    <p className="text-[11px] font-mono text-[var(--text-muted)] truncate mt-0.5">
                      {item.category === 'credential' && (item.username || item.url || 'Credential')}
                      {item.category === 'note' && (item.content.slice(0, 40) || 'Note')}
                      {item.category === 'card' && (`•••• ${item.cardNumber.slice(-4) || 'Card'}`)}
                      {item.category === 'snippet' && (`${item.language.toUpperCase()} Snippet`)}
                      {item.category === 'file' && (item.fileName)}
                    </p>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      {folder && (
                        <span
                          className="text-[9px] font-mono-label px-1.5 py-0.2 rounded-keepeit font-medium text-white"
                          style={{ backgroundColor: folder.color || 'var(--accent-seal)' }}
                        >
                          {folder.name}
                        </span>
                      )}

                      {item.tags?.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="text-[9px] font-mono-label px-1.5 py-0.2 rounded-keepeit bg-[var(--bg-surface)] border-keepeit text-[var(--text-muted)]"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Favorite Toggle Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item.id);
                  }}
                  className={`p-1 rounded-keepeit transition-colors ${
                    item.isFavorite
                      ? 'text-amber-500'
                      : 'text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--text-primary)]'
                  }`}
                  title={item.isFavorite ? 'Unfavorite' : 'Favorite'}
                >
                  <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-amber-500' : ''}`} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

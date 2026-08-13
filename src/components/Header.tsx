import React, { useEffect, useRef } from 'react';
import { useVault } from '../hooks/useVault';
import { Logo } from './Logo';
import {
  Search,
  Plus,
  KeyRound,
  HardDrive,
  Sun,
  Moon,
  Lock,
  Menu,
  X,
  SlidersHorizontal,
} from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenNewItemModal: () => void;
  onOpenPasswordGenModal: () => void;
  onOpenBackupModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenCommandPalette?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  isMobileSidebarOpen: boolean;
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenNewItemModal,
  onOpenPasswordGenModal,
  onOpenBackupModal,
  onOpenSettingsModal,
  onOpenCommandPalette,
  theme,
  onToggleTheme,
  isMobileSidebarOpen,
  onToggleMobileSidebar,
}) => {
  const { lockVault } = useVault();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global '/' keyboard shortcut to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg-surface)] border-b border-keepeit px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 shadow-xs pt-[env(safe-area-inset-top,0px)] max-w-full overflow-hidden">
      {/* Left: Mobile Toggle & App Title */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={onToggleMobileSidebar}
          aria-label="Toggle Navigation Drawer"
          className="md:hidden p-1.5 rounded-keepeit text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] focus-visible:ring-2"
        >
          {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)]">
            KeepEit
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono-label px-1.5 py-0.5 rounded-keepeit bg-[var(--accent-seal-soft)] text-[var(--accent-seal)] font-semibold">
            V1.0.0
          </span>
        </div>
      </div>

      {/* Middle: Global Search Input */}
      <div className="flex-1 min-w-0 max-w-md mx-1 sm:mx-2 relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-[var(--text-muted)] pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search items..."
            className="w-full bg-[var(--bg-card)] border-keepeit rounded-keepeit pl-9 pr-3 sm:pr-16 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--accent-seal)]"
          />
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="absolute right-2 font-mono text-[10px] bg-[var(--bg-surface)] border border-keepeit rounded-keepeit px-1.5 py-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hidden sm:block"
              title="Open Command Palette (⌘K / Ctrl+K)"
            >
              ⌘K
            </button>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Extra Desktop Action Icons */}
        <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
          {/* Primary Action: New Item */}
          <button
            onClick={onOpenNewItemModal}
            className="btn-stealth-primary flex items-center gap-1.5 px-3 py-1.5 rounded-keepeit font-mono-label text-xs font-semibold transition-all focus:outline-none"
          >
            <Plus className="w-4 h-4" />
            <span>NEW ITEM</span>
          </button>

          {/* Password Generator */}
          <button
            onClick={onOpenPasswordGenModal}
            title="Password Generator Tool"
            className="p-1.5 rounded-keepeit text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] focus-visible:ring-2"
          >
            <KeyRound className="w-4 h-4" />
          </button>

          {/* Encrypted Backup */}
          <button
            onClick={onOpenBackupModal}
            title="Export / Import Backup"
            className="p-1.5 rounded-keepeit text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] focus-visible:ring-2"
          >
            <HardDrive className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettingsModal}
            title="Vault Settings"
            className="p-1.5 rounded-keepeit text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] focus-visible:ring-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Theme Toggle (Visible on Mobile & Desktop) */}
        <button
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Theme`}
          className="p-1.5 rounded-keepeit text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] focus-visible:ring-2 flex items-center justify-center min-h-[36px] min-w-[36px]"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Lock Vault (Hidden on Mobile, Visible on Desktop) */}
        <button
          onClick={lockVault}
          title="Lock Vault Now"
          className="hidden md:flex items-center justify-center p-1.5 rounded-keepeit text-[var(--accent-rust)] hover:bg-[var(--accent-rust)]/10 focus-visible:ring-2"
        >
          <Lock className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

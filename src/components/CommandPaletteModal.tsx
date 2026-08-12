import React, { useState, useEffect, useRef } from 'react';
import { useVault } from '../hooks/useVault';
import { AppRoute } from './Sidebar';
import {
  Search,
  Shield,
  FileText,
  CheckSquare,
  Wallet,
  Calendar,
  Star,
  KeyRound,
  Activity,
  Settings,
  LayoutDashboard,
  Folder,
  ArrowRight,
  Lock,
} from 'lucide-react';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: AppRoute) => void;
}

interface PaletteResultItem {
  id: string;
  type: 'route' | 'credential' | 'note' | 'task' | 'income';
  title: string;
  subtitle?: string;
  categoryLabel?: string;
  route?: AppRoute;
  icon: React.ComponentType<{ className?: string }>;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { vaultData } = useVault();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen || !vaultData) return null;

  // Build Route Navigation options
  const routes: PaletteResultItem[] = [
    { id: 'route-dash', type: 'route', title: 'Jump to Dashboard', subtitle: 'Overview & Stats', route: 'dashboard', icon: LayoutDashboard },
    { id: 'route-vault', type: 'route', title: 'Jump to Vault Credentials', subtitle: 'Encrypted Passwords & Accounts', route: 'vault', icon: Shield },
    { id: 'route-notes', type: 'route', title: 'Jump to Secure Notes', subtitle: 'Encrypted Documents & Snippets', route: 'notes', icon: FileText },
    { id: 'route-tasks', type: 'route', title: 'Jump to Workspace Tasks', subtitle: 'Todo Items & Deadlines', route: 'tasks', icon: CheckSquare },
    { id: 'route-income', type: 'route', title: 'Jump to Income Ledger', subtitle: 'Financial Records & Payouts', route: 'income', icon: Wallet },
    { id: 'route-cal', type: 'route', title: 'Jump to Calendar', subtitle: 'Schedule & Deadlines', route: 'calendar', icon: Calendar },
    { id: 'route-fav', type: 'route', title: 'Jump to Starred Favorites', subtitle: 'Quick Access Directory', route: 'favorites', icon: Star },
    { id: 'route-pass', type: 'route', title: 'Jump to Password Generator', subtitle: 'Cryptographic Generator Tool', route: 'password-gen', icon: KeyRound },
    { id: 'route-activity', type: 'route', title: 'Jump to Activity Audit Log', subtitle: 'Local Operations Audit', route: 'activity-log', icon: Activity },
    { id: 'route-settings', type: 'route', title: 'Jump to Preferences & Settings', subtitle: 'Account, Themes & Security', route: 'settings', icon: Settings },
  ];

  // Search Items
  const q = query.toLowerCase().trim();

  // Filtered Credentials
  const credentials = vaultData.items
    .filter((i) => i.category === 'credential')
    .filter((i) => {
      if (!q) return false;
      const c = i as any;
      return (
        c.title.toLowerCase().includes(q) ||
        (c.username || '').toLowerCase().includes(q) ||
        (c.url || '').toLowerCase().includes(q) ||
        (c.notes || '').toLowerCase().includes(q)
      );
    })
    .map((i) => {
      const c = i as any;
      return {
        id: c.id,
        type: 'credential' as const,
        title: c.title,
        subtitle: c.username ? `Username: ${c.username}` : 'No username',
        categoryLabel: 'CREDENTIAL',
        route: 'vault' as AppRoute,
        icon: Shield,
      };
    });

  // Filtered Notes
  const notes = vaultData.items
    .filter((i) => i.category === 'note')
    .filter((i) => {
      if (!q) return false;
      const n = i as any;
      return n.title.toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q);
    })
    .map((i) => {
      const n = i as any;
      return {
        id: n.id,
        type: 'note' as const,
        title: n.title,
        subtitle: n.content ? n.content.slice(0, 50) + '...' : 'Empty note',
        categoryLabel: 'NOTE',
        route: 'notes' as AppRoute,
        icon: FileText,
      };
    });

  // Filtered Tasks
  const tasks = (vaultData.tasks || [])
    .filter((t) => {
      if (!q) return false;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.dueDate || '').includes(q)
      );
    })
    .map((t) => ({
      id: t.id,
      type: 'task' as const,
      title: t.title,
      subtitle: t.dueDate ? `Due: ${t.dueDate} (${t.status})` : `Status: ${t.status}`,
      categoryLabel: 'TASK',
      route: 'tasks' as AppRoute,
      icon: CheckSquare,
    }));

  // Filtered Income
  const income = (vaultData.income || [])
    .filter((inc) => {
      if (!q) return false;
      return (
        inc.source.toLowerCase().includes(q) ||
        inc.category.toLowerCase().includes(q) ||
        (inc.remarks || '').toLowerCase().includes(q) ||
        String(inc.amount).includes(q)
      );
    })
    .map((inc) => ({
      id: inc.id,
      type: 'income' as const,
      title: `${inc.source} (+${inc.currency} ${inc.amount})`,
      subtitle: `${inc.date} • ${inc.category}`,
      categoryLabel: 'INCOME',
      route: 'income' as AppRoute,
      icon: Wallet,
    }));

  // Matching Routes if Query
  const matchingRoutes = routes.filter((r) => {
    if (!q) return true;
    return r.title.toLowerCase().includes(q) || (r.subtitle || '').toLowerCase().includes(q);
  });

  // Combined Results
  const results: PaletteResultItem[] = [...matchingRoutes, ...credentials, ...notes, ...tasks, ...income];

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = results[selectedIndex];
      if (sel && sel.route) {
        onNavigate(sel.route);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="bg-[var(--bg-card)] border border-keepeit rounded-keepeit max-w-xl w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Search Header */}
        <div className="p-4 border-b border-keepeit flex items-center gap-3 bg-[var(--bg-surface)]">
          <Search className="w-5 h-5 text-[var(--accent-seal)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type to search credentials, notes, tasks, income, or jump to route..."
            className="flex-1 bg-transparent border-none text-xs font-sans text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 bg-[var(--bg-card)] border border-keepeit rounded-keepeit text-[10px] font-mono text-[var(--text-muted)]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 divide-y divide-keepeit/30 text-xs">
          {results.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)] font-mono text-xs">
              No matching workspace items or routes found for "{query}".
            </div>
          ) : (
            results.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.route) {
                      onNavigate(item.route);
                      onClose();
                    }
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-keepeit cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-[var(--accent-seal-soft)] text-[var(--accent-seal)] font-semibold'
                      : 'hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 shrink-0 text-[var(--accent-seal)]" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-sans font-bold text-xs">{item.title}</span>
                        {item.categoryLabel && (
                          <span className="px-1.5 py-0.5 text-[9px] font-mono-label bg-[var(--bg-surface)] border border-keepeit rounded-keepeit text-[var(--text-muted)]">
                            {item.categoryLabel}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? 'translate-x-1 text-[var(--accent-seal)]' : 'text-transparent'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-2.5 bg-[var(--bg-surface)] border-t border-keepeit font-mono text-[10px] text-[var(--text-muted)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span className="flex items-center gap-1 text-emerald-600 font-bold">
            <Lock className="w-3 h-3" /> Zero-Knowledge Memory Filter
          </span>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useVault } from '../hooks/useVault';
import { Logo } from './Logo';
import {
  LayoutDashboard,
  Shield,
  FileText,
  CheckSquare,
  Calendar,
  Wallet,
  Folder,
  Star,
  KeyRound,
  Activity,
  Settings,
  Lock,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react';

export type AppRoute =
  | 'dashboard'
  | 'vault'
  | 'notes'
  | 'tasks'
  | 'calendar'
  | 'income'
  | 'folders'
  | 'favorites'
  | 'password-gen'
  | 'activity-log'
  | 'settings';

interface SidebarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { lockVault, vaultData } = useVault();

  if (!vaultData) return null;

  const topItems = [
    { id: 'dashboard' as AppRoute, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vault' as AppRoute, label: 'Vault', icon: Shield },
    { id: 'notes' as AppRoute, label: 'Notes', icon: FileText },
    { id: 'tasks' as AppRoute, label: 'Tasks', icon: CheckSquare },
    { id: 'calendar' as AppRoute, label: 'Calendar', icon: Calendar },
    { id: 'income' as AppRoute, label: 'Income', icon: Wallet },
  ];

  const middleItems = [
    { id: 'folders' as AppRoute, label: 'Folders', icon: Folder },
    { id: 'favorites' as AppRoute, label: 'Favorites', icon: Star },
    { id: 'password-gen' as AppRoute, label: 'Generate Password', icon: KeyRound },
  ];

  const bottomItems = [
    { id: 'activity-log' as AppRoute, label: 'Activity Log', icon: Activity },
    { id: 'settings' as AppRoute, label: 'Settings', icon: Settings },
  ];

  const handleItemClick = (route: AppRoute) => {
    onNavigate(route);
    if (isMobileOpen) onCloseMobile();
  };

  const renderNavGroup = (items: typeof topItems) => (
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentRoute === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            title={item.label}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-keepeit transition-colors text-xs font-mono-label focus-visible:ring-2 ${
              isActive
                ? 'bg-[var(--accent-seal-soft)] text-[var(--accent-seal)] font-semibold'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span className="truncate">{item.label}</span>}
          </button>
        );
      })}
    </div>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full select-none text-xs">
      {/* Collapse Toggle Bar */}
      <div className="p-3 border-b border-keepeit flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <Logo size="xs" />
            <span className="font-mono-label font-bold text-[11px] text-[var(--text-muted)] tracking-wider">
              WORKSPACE NAV
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center mx-auto my-0.5">
            <Logo size="xs" />
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="p-1.5 rounded-keepeit text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] focus-visible:ring-2"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <nav className="p-2 flex-1 overflow-y-auto space-y-4">
        {/* Top Section */}
        {renderNavGroup(topItems)}

        {/* Divider 1 */}
        <div className="border-t border-keepeit my-2" />

        {/* Middle Section */}
        {renderNavGroup(middleItems)}

        {/* Divider 2 */}
        <div className="border-t border-keepeit my-2" />

        {/* Bottom Section */}
        {renderNavGroup(bottomItems)}

        {/* Lock Action */}
        <button
          onClick={() => {
            lockVault();
            if (isMobileOpen) onCloseMobile();
          }}
          title="Lock Vault"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-keepeit text-[var(--accent-rust)] hover:bg-red-500/10 transition-colors text-xs font-mono-label font-semibold focus-visible:ring-2"
        >
          <Lock className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Lock Vault</span>}
        </button>
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:block shrink-0 bg-[var(--bg-surface)] border-r border-keepeit transition-all duration-200 h-[calc(100vh-57px-37px)] ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex">
          <div className="w-64 bg-[var(--bg-surface)] h-full overflow-y-auto shadow-2xl">
            <div className="p-3 border-b border-keepeit flex items-center justify-between">
              <span className="font-display font-bold text-sm text-[var(--text-primary)]">
                KeepEit Navigation
              </span>
              <button
                onClick={onCloseMobile}
                className="p-1 rounded-keepeit hover:bg-[var(--bg-surface-hover)] text-xs font-mono"
              >
                ✕
              </button>
            </div>
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={onCloseMobile} />
        </div>
      )}
    </>
  );
};

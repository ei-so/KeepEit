import React, { useState } from 'react';
import { useVault } from '../hooks/useVault';
import { AppRoute } from './Sidebar';
import { useMobileModalHistory } from '../hooks/useMobileModalHistory';
import {
  LayoutDashboard,
  Shield,
  FileText,
  CheckSquare,
  Menu,
  Calendar,
  Wallet,
  Folder,
  Star,
  KeyRound,
  Activity,
  Settings,
  Lock,
  X,
} from 'lucide-react';

interface MobileBottomBarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  currentRoute,
  onNavigate,
}) => {
  const { vaultData, lockVault } = useVault();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useMobileModalHistory(isMoreOpen, () => setIsMoreOpen(false));

  if (!vaultData) return null;

  const mainTabs = [
    { id: 'dashboard' as AppRoute, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vault' as AppRoute, label: 'Vault', icon: Shield },
    { id: 'notes' as AppRoute, label: 'Notes', icon: FileText },
    { id: 'tasks' as AppRoute, label: 'Tasks', icon: CheckSquare },
  ];

  const moreNavItems = [
    { id: 'calendar' as AppRoute, label: 'Calendar', icon: Calendar },
    { id: 'income' as AppRoute, label: 'Income Ledger', icon: Wallet },
    { id: 'folders' as AppRoute, label: 'Folders', icon: Folder },
    { id: 'favorites' as AppRoute, label: 'Favorites', icon: Star },
    { id: 'password-gen' as AppRoute, label: 'Generate Password', icon: KeyRound },
    { id: 'activity-log' as AppRoute, label: 'Activity Log', icon: Activity },
    { id: 'settings' as AppRoute, label: 'Settings', icon: Settings },
  ];

  const handleSelectRoute = (route: AppRoute) => {
    onNavigate(route);
    setIsMoreOpen(false);
  };

  const isMoreActive = !mainTabs.some((t) => t.id === currentRoute);

  return (
    <>
      {/* Fixed Bottom Tab Bar (mobile only < 768px) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-card)] border-t border-keepeit px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-2xl select-none"
      >
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentRoute === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelectRoute(tab.id)}
              className={`flex-1 py-1.5 px-1 flex flex-col items-center justify-center gap-0.5 rounded-keepeit transition-colors min-h-[44px] min-w-[44px] ${
                isActive
                  ? 'text-[var(--accent-seal)] font-semibold bg-[var(--accent-seal-soft)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-mono-label leading-none truncate max-w-[64px]">
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* More Tab */}
        <button
          onClick={() => setIsMoreOpen((prev) => !prev)}
          className={`flex-1 py-1.5 px-1 flex flex-col items-center justify-center gap-0.5 rounded-keepeit transition-colors min-h-[44px] min-w-[44px] ${
            isMoreActive || isMoreOpen
              ? 'text-[var(--accent-seal)] font-semibold bg-[var(--accent-seal-soft)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Menu className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-mono-label leading-none truncate max-w-[64px]">
            More
          </span>
        </button>
      </nav>

      {/* "More" Navigation Bottom Sheet Modal */}
      {isMoreOpen && (
        <div
          onClick={() => setIsMoreOpen(false)}
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center p-0"
        >
          <div
            className="bg-[var(--bg-card)] border-t border-keepeit rounded-t-2xl w-full max-h-[85vh] overflow-y-auto p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="w-12 h-1 bg-[var(--graphite)]/40 rounded-full mx-auto my-1" />

            <div className="flex items-center justify-between border-b border-keepeit pb-2">
              <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">
                More Workspace Navigation
              </h3>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-keepeit min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {moreNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentRoute === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectRoute(item.id)}
                    className={`p-3 rounded-keepeit border text-left flex items-center gap-3 transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-[var(--accent-seal-soft)] border-[var(--accent-seal)] text-[var(--accent-seal)] font-semibold'
                        : 'bg-[var(--bg-surface)] border-keepeit text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0 text-[var(--accent-seal)]" />
                    <span className="text-xs font-mono-label truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-keepeit">
              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  lockVault();
                }}
                className="w-full py-3 px-4 bg-[var(--accent-rust)] text-white font-mono-label text-xs font-semibold rounded-keepeit flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Lock className="w-4 h-4" />
                <span>LOCK VAULT NOW</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

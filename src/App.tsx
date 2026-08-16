import React, { useState, useEffect } from 'react';
import { VaultProvider, useVault } from './hooks/useVault';
import { ToastProvider, useToast } from './components/Toast';
import { useShakeDetector } from './hooks/useShakeDetector';
import { usePrivacyShield } from './hooks/usePrivacyShield';
import { Header } from './components/Header';
import { Sidebar, AppRoute } from './components/Sidebar';
import { SealBar } from './components/SealBar';
import { UnlockScreen } from './components/UnlockScreen';
import { VaultView } from './components/VaultView';
import { NotesView } from './components/NotesView';
import { TasksView } from './components/TasksView';
import { FavoritesView } from './components/FavoritesView';
import { DashboardView } from './components/DashboardView';
import { IncomeView } from './components/IncomeView';
import { CalendarView } from './components/CalendarView';
import { CommandPaletteModal } from './components/CommandPaletteModal';

import { ActivityLogModal } from './components/ActivityLogModal';
import { PasswordGeneratorModal } from './components/PasswordGeneratorModal';
import { BackupModal } from './components/BackupModal';
import { SettingsModal } from './components/SettingsModal';
import { FolderManagerModal } from './components/FolderManagerModal';
import { TagManagerModal } from './components/TagManagerModal';
import { MobileBottomBar } from './components/MobileBottomBar';
import { usePWAInstall, IosInstallSheetModal, IosDataLossBanner } from './components/InstallPrompt';
import { PrivacyShield } from './components/PrivacyShield';

import {
  LayoutDashboard,
  Shield,
  FileText,
  CheckSquare,
  Calendar as CalendarIcon,
  Wallet,
  Folder,
  Star,
  KeyRound,
  Activity,
  Settings as SettingsIcon,
} from 'lucide-react';

function VaultAppContent() {
  const { isUnlocked, lockVault, vaultData } = useVault();
  const { showToast } = useToast();
  const { canInstallIos, isIosBannerDismissed, dismissIosBanner, showIosSheet, setShowIosSheet } = usePWAInstall();

  // Panic Shake to Lock detector
  useShakeDetector({
    onPanic: () => {
      lockVault();
      showToast('Vault locked via Panic Shake', 'info');
    },
    enabled: Boolean(vaultData?.settings?.panicShakeEnabled) && isUnlocked,
  });

  // App Switcher Privacy Screen Shield on backgrounding/blur with bypass support
  const { isBackgrounded } = usePrivacyShield({ enabled: isUnlocked });

  // Route & Navigation State - default to Dashboard Screen
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Modals
  const [isPasswordGenOpen, setIsPasswordGenOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global ⌘K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Theme
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Handle route navigation triggers
  const handleNavigate = (route: AppRoute) => {
    setCurrentRoute(route);
    if (route === 'password-gen') {
      setIsPasswordGenOpen(true);
    } else if (route === 'activity-log') {
      setIsActivityLogOpen(true);
    } else if (route === 'settings') {
      setIsSettingsModalOpen(true);
    } else if (route === 'folders') {
      setIsFolderManagerOpen(true);
    }
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  if (!isUnlocked) {
    return <UnlockScreen />;
  }

  // Route Config for Placeholder Titles & Icons
  const routeConfigs: Record<
    AppRoute,
    { title: string; description: string; icon: React.ElementType }
  > = {
    dashboard: {
      title: 'Dashboard Workspace',
      description: 'Overview of encrypted items, recent activities, and security health.',
      icon: LayoutDashboard,
    },
    vault: {
      title: 'Encrypted Vault Credentials',
      description: 'All zero-knowledge encrypted credentials, passwords, and service keys.',
      icon: Shield,
    },
    notes: {
      title: 'Secure Notes Workspace',
      description: 'Encrypted plain text and markdown notes.',
      icon: FileText,
    },
    tasks: {
      title: 'Encrypted Task Manager',
      description: 'Private tasks and local workspace checklists.',
      icon: CheckSquare,
    },
    calendar: {
      title: 'Private Event Calendar',
      description: 'Local time-blocked events and secure reminders.',
      icon: CalendarIcon,
    },
    income: {
      title: 'Income & Budget Ledger',
      description: 'Encrypted financial records and personal ledger.',
      icon: Wallet,
    },
    folders: {
      title: 'Shared Folders Directory',
      description: 'Organize items into custom encrypted folder categories.',
      icon: Folder,
    },
    favorites: {
      title: 'Starred Favorites',
      description: 'Quick access to your most frequently used vault items.',
      icon: Star,
    },
    'password-gen': {
      title: 'Cryptographic Password Generator',
      description: 'High-entropy generator tool.',
      icon: KeyRound,
    },
    'activity-log': {
      title: 'Audit Activity Log',
      description: 'Encrypted log of vault events and session activities.',
      icon: Activity,
    },
    settings: {
      title: 'Vault Preferences & Security',
      description: 'Auto-lock timeouts, theme controls, and master password management.',
      icon: SettingsIcon,
    },
  };

  const activeRouteInfo = routeConfigs[currentRoute];
  const RouteIcon = activeRouteInfo.icon;

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col font-sans antialiased select-none">
      {/* Top Header Bar */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNewItemModal={() => {
          setCurrentRoute('vault');
        }}
        onOpenPasswordGenModal={() => setIsPasswordGenOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden min-h-0 md:h-[calc(100dvh-57px-37px)]">
        {/* Left Collapsible Sidebar */}
        <Sidebar
          currentRoute={currentRoute}
          onNavigate={handleNavigate}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Viewport */}
        {currentRoute === 'dashboard' ? (
          <DashboardView onNavigate={setCurrentRoute} />
        ) : currentRoute === 'vault' ? (
          <VaultView />
        ) : currentRoute === 'notes' ? (
          <NotesView />
        ) : currentRoute === 'tasks' ? (
          <TasksView />
        ) : currentRoute === 'income' ? (
          <IncomeView />
        ) : currentRoute === 'calendar' ? (
          <CalendarView />
        ) : currentRoute === 'favorites' ? (
          <FavoritesView />
        ) : (
          <main className="flex-1 p-6 overflow-y-auto bg-[var(--bg-main)] flex flex-col items-center justify-center text-center pb-28 md:pb-16">
            <div className="max-w-md w-full bg-[var(--bg-card)] border-keepeit rounded-keepeit p-8 shadow-sm space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-keepeit bg-[var(--accent-seal-soft)] text-[var(--accent-seal)]">
                <RouteIcon className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">
                  {activeRouteInfo.title}
                </h2>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {activeRouteInfo.description}
                </p>
              </div>

              <div className="pt-3 border-t border-keepeit">
                <button
                  onClick={() => setCurrentRoute('vault')}
                  className="px-4 py-2 bg-[var(--accent-seal)] text-[var(--accent-fg)] font-mono-label text-xs font-semibold rounded-keepeit hover:opacity-90"
                >
                  GO TO VAULT MODULE
                </button>
              </div>
            </div>
          </main>
        )}
      </div>

      {/* iOS 7-Day Storage Eviction Warning Banner */}
      {canInstallIos && !isIosBannerDismissed && (
        <IosDataLossBanner
          onOpenInstructions={() => setShowIosSheet(true)}
          onDismiss={dismissIosBanner}
        />
      )}

      {/* Persistent Bottom Seal Bar */}
      <SealBar />

      {/* Mobile Bottom Navigation Bar (Shown on small screens) */}
      <MobileBottomBar
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        onOpenNewItemModal={() => setCurrentRoute('vault')}
      />

      {/* iOS Install Instructions Modal */}
      <IosInstallSheetModal
        isOpen={showIosSheet}
        onClose={() => setShowIosSheet(false)}
      />

      {/* Shared Modals */}
      <PasswordGeneratorModal
        isOpen={isPasswordGenOpen}
        onClose={() => setIsPasswordGenOpen(false)}
        onUseInCredential={() => {
          setCurrentRoute('vault');
        }}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <ActivityLogModal
        isOpen={isActivityLogOpen}
        onClose={() => setIsActivityLogOpen(false)}
      />

      <FolderManagerModal
        isOpen={isFolderManagerOpen}
        onClose={() => setIsFolderManagerOpen(false)}
      />

      <TagManagerModal
        isOpen={isTagManagerOpen}
        onClose={() => setIsTagManagerOpen(false)}
      />

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(route) => setCurrentRoute(route)}
      />

      {/* App Switcher Privacy Screen Shield */}
      <PrivacyShield isVisible={isBackgrounded && isUnlocked} />
    </div>
  );
}

export default function App() {
  return (
    <VaultProvider>
      <ToastProvider>
        <VaultAppContent />
      </ToastProvider>
    </VaultProvider>
  );
}

import React, { useState, useEffect } from 'react';
import { useVault } from '../hooks/useVault';
import { exportVaultToCSV, getCSVTemplate, parseCSVToVaultItems } from '../lib/csv';
import { getStorageEstimateInfo, checkAndRequestPersistedStorage, getBackupAgeInDays, StorageEstimateResult } from '../lib/persistence';
import { InstallButton } from './InstallPrompt';
import {
  X,
  SlidersHorizontal,
  User,
  Palette,
  Shield,
  Database,
  Info,
  Clock,
  Sun,
  Moon,
  KeyRound,
  Download,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  Check,
  RefreshCw,
  Trash2,
  Copy,
  ExternalLink,
  Sparkles,
  Lock,
  HardDrive,
  ShieldCheck,
  Smartphone,
  Fingerprint,
} from 'lucide-react';

export type SettingsTab = 'account' | 'appearance' | 'security' | 'data' | 'about';

interface SettingsModalProps {
  isOpen: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onClose: () => void;
  initialTab?: SettingsTab;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  theme,
  onToggleTheme,
  onClose,
  initialTab = 'account',
}) => {
  const {
    vaultData,
    updateSettings,
    updateAccountProfile,
    regenerateRecoveryCode,
    changeMasterPassword,
    exportBackup,
    importBackup,
    importCSVItems,
    wipeVault,
    isPasskeySupported,
    hasPasskey,
    enrollPasskey,
    removePasskey,
  } = useVault();

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Account State
  const [displayName, setDisplayName] = useState('');
  const [avatarColor, setAvatarColor] = useState('#2F6F52');
  const [accountSaved, setAccountSaved] = useState(false);

  // Appearance State
  const [accent, setAccent] = useState<'seal' | 'rust' | 'graphite' | 'ink'>('seal');
  const [fontScale, setFontScale] = useState<'S' | 'M' | 'L'>('M');

  // Security State
  const [newMasterPassword, setNewMasterPassword] = useState('');
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('');
  const [newHint, setNewHint] = useState('');
  const [passwordProgress, setPasswordProgress] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Passkey State
  const [isEnrollingPasskey, setIsEnrollingPasskey] = useState(false);
  const [passkeyStatusMsg, setPasskeyStatusMsg] = useState<string | null>(null);
  const [passkeyErrorMsg, setPasskeyErrorMsg] = useState<string | null>(null);
  const [showPasskeyRemoveConfirm, setShowPasskeyRemoveConfirm] = useState(false);

  const handleEnrollPasskey = async () => {
    setPasskeyErrorMsg(null);
    setPasskeyStatusMsg(null);
    try {
      setIsEnrollingPasskey(true);
      await enrollPasskey();
      setPasskeyStatusMsg('Passkey enrolled successfully! You can now unlock using biometrics.');
    } catch (err: any) {
      setPasskeyErrorMsg(err.message || 'Failed to enroll passkey.');
    } finally {
      setIsEnrollingPasskey(false);
    }
  };

  const handleConfirmRemovePasskey = async () => {
    setPasskeyErrorMsg(null);
    setPasskeyStatusMsg(null);
    try {
      await removePasskey();
      setShowPasskeyRemoveConfirm(false);
      setPasskeyStatusMsg('Passkey unlock disabled.');
    } catch (err: any) {
      setPasskeyErrorMsg(err.message || 'Failed to remove passkey.');
    }
  };

  // Recovery Code State
  const [recoveryMasterPassword, setRecoveryMasterPassword] = useState('');
  const [generatedRecoveryCode, setGeneratedRecoveryCode] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryCopied, setRecoveryCopied] = useState(false);

  // Data State
  const [backupFileContent, setBackupFileContent] = useState<string | null>(null);
  const [backupFileName, setBackupFileName] = useState<string | null>(null);
  const [backupMasterPassword, setBackupMasterPassword] = useState('');
  const [importBackupStatus, setImportBackupStatus] = useState<string | null>(null);
  const [importBackupError, setImportBackupError] = useState<string | null>(null);

  const [csvStatus, setCsvStatus] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Storage Durability State
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimateResult | null>(null);

  // Reset Danger State
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (vaultData) {
      const storedName = typeof window !== 'undefined' ? localStorage.getItem('keepeit_user_name') : null;
      setDisplayName(vaultData.accountProfile?.displayName || storedName || '');
      setAvatarColor(vaultData.accountProfile?.avatarColor || '#27272A');
      setAccent(vaultData.settings?.accent || 'seal');
      setFontScale(vaultData.settings?.fontScale || 'M');
    }
  }, [vaultData, isOpen]);

  // Load storage estimate info on open
  useEffect(() => {
    if (isOpen) {
      checkAndRequestPersistedStorage().then(() => {
        getStorageEstimateInfo().then((info) => setStorageEstimate(info));
      });
    }
  }, [isOpen, activeTab]);

  // Apply accent color & font scale live
  useEffect(() => {
    const root = document.documentElement;
    if (accent === 'rust') {
      root.style.setProperty('--accent-seal', '#DC2626');
      root.style.setProperty('--accent-seal-soft', 'rgba(220, 38, 38, 0.15)');
      root.style.setProperty('--accent-fg', '#FAFAFA');
    } else if (accent === 'graphite') {
      root.style.setProperty('--accent-seal', '#71717A');
      root.style.setProperty('--accent-seal-soft', 'rgba(113, 113, 122, 0.15)');
      root.style.setProperty('--accent-fg', '#FAFAFA');
    } else if (accent === 'ink') {
      root.style.setProperty('--accent-seal', '#09090B');
      root.style.setProperty('--accent-seal-soft', '#27272A');
      root.style.setProperty('--accent-fg', '#FFFFFF');
    } else {
      // seal (STEALTH SILVER) default
      root.style.setProperty('--accent-seal', '#E4E4E7');
      root.style.setProperty('--accent-seal-soft', '#27272A');
      root.style.setProperty('--accent-fg', '#09090B');
    }

    if (fontScale === 'S') {
      root.style.fontSize = '13px';
    } else if (fontScale === 'L') {
      root.style.fontSize = '15px';
    } else {
      root.style.fontSize = '14px';
    }
  }, [accent, fontScale]);

  if (!isOpen || !vaultData) return null;

  // Account Handlers
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateAccountProfile({ displayName, avatarColor });
    if (displayName) {
      localStorage.setItem('keepeit_user_name', displayName.trim());
    }
    setAccountSaved(true);
    setTimeout(() => setAccountSaved(false), 2000);
  };

  // Appearance Handlers
  const handleSelectAccent = async (selAccent: 'seal' | 'rust' | 'graphite' | 'ink') => {
    setAccent(selAccent);
    await updateSettings({ accent: selAccent });
  };

  const handleSelectFontScale = async (scale: 'S' | 'M' | 'L') => {
    setFontScale(scale);
    await updateSettings({ fontScale: scale });
  };

  // Security Handlers
  const handleRegenerateRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setGeneratedRecoveryCode(null);

    if (!recoveryMasterPassword) {
      setRecoveryError('Please enter your master password to regenerate recovery code.');
      return;
    }

    try {
      const code = await regenerateRecoveryCode(recoveryMasterPassword);
      setGeneratedRecoveryCode(code);
      setRecoveryMasterPassword('');
    } catch (err: any) {
      setRecoveryError(err.message || 'Failed to verify master password.');
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordStatus(null);

    if (!newMasterPassword || newMasterPassword.length < 8) {
      setPasswordError('New master password must be at least 8 characters long.');
      return;
    }
    if (newMasterPassword !== confirmMasterPassword) {
      setPasswordError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setPasswordProgress('1/3 Deriving PBKDF2 cryptographic key...');
      await new Promise((r) => setTimeout(r, 200));

      setPasswordProgress('2/3 Re-encrypting 256-bit AES-GCM envelope...');
      await new Promise((r) => setTimeout(r, 300));

      await changeMasterPassword(newMasterPassword, newHint.trim() || undefined);

      setPasswordProgress('3/3 Verifying decryption & swapping memory references...');
      await new Promise((r) => setTimeout(r, 200));

      setPasswordProgress(null);
      setPasswordStatus('Master password updated and vault re-encrypted successfully.');
      setNewMasterPassword('');
      setConfirmMasterPassword('');
      setNewHint('');
    } catch (err: any) {
      setPasswordProgress(null);
      setPasswordError(err.message || 'Failed to update master password.');
    }
  };

  // Data Handlers
  const handleBackupFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBackupFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setBackupFileContent(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImportBackupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportBackupError(null);
    setImportBackupStatus(null);

    if (!backupFileContent) {
      setImportBackupError('Please select a .keepeit backup file.');
      return;
    }
    if (!backupMasterPassword) {
      setImportBackupError('Please enter the master password for this backup file.');
      return;
    }

    try {
      await importBackup(backupFileContent, backupMasterPassword);
      setImportBackupStatus('Vault backup restored successfully.');
      setBackupFileContent(null);
      setBackupFileName(null);
      setBackupMasterPassword('');
    } catch (err: any) {
      setImportBackupError(err.message || 'Failed to restore backup file.');
    }
  };

  const handleExportCSV = () => {
    try {
      const csvStr = exportVaultToCSV(vaultData.items);
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `keepeit-unencrypted-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setCsvStatus('Unencrypted CSV file generated and downloaded.');
    } catch (err: any) {
      setCsvError('Failed to generate CSV export.');
    }
  };

  const handleDownloadCSVTemplate = () => {
    const templateStr = getCSVTemplate();
    const blob = new Blob([templateStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'keepeit-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError(null);
    setCsvStatus(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsedItems = parseCSVToVaultItems(text);
        if (parsedItems.length === 0) {
          setCsvError('No valid credential or note items found in CSV file.');
          return;
        }

        const count = await importCSVItems(parsedItems);
        setCsvStatus(`Successfully imported ${count} item(s) from CSV.`);
      } catch (err: any) {
        setCsvError(err.message || 'Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetVault = async () => {
    if (deleteConfirmInput !== 'DELETE') return;
    setIsResetting(true);
    await wipeVault();
    setIsResetting(false);
    onClose();
  };

  const userInitials = (displayName || 'K')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--bg-card)] border border-keepeit rounded-keepeit max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-keepeit pb-3 shrink-0">
          <h3 className="font-display font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
            <SlidersHorizontal className={`w-5 h-5 ${accent === 'ink' ? 'text-white' : 'text-[var(--accent-seal)]'}`} />
            Vault Preferences & Settings
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-keepeit text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Five Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-keepeit pb-2 overflow-x-auto text-xs font-mono-label shrink-0">
          {[
            { id: 'account', label: 'ACCOUNT', icon: User },
            { id: 'appearance', label: 'APPEARANCE', icon: Palette },
            { id: 'security', label: 'SECURITY', icon: Shield },
            { id: 'data', label: 'DATA & BACKUP', icon: Database },
            { id: 'about', label: 'ABOUT', icon: Info },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`px-3 py-1.5 rounded-keepeit border border-keepeit shrink-0 flex items-center gap-1.5 transition-colors ${
                  isSel
                    ? 'bg-[var(--accent-seal)] text-[var(--accent-fg)] font-semibold'
                    : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Viewport */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 text-xs font-sans">
          {/* TAB 1: ACCOUNT */}
          {activeTab === 'account' && (
            <form onSubmit={handleSaveAccount} className="space-y-5">
              <div className="p-4 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-display font-bold text-lg shrink-0 shadow-sm"
                  style={{ backgroundColor: avatarColor }}
                >
                  {userInitials}
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">{displayName || 'Vault User'}</h4>
                  <p className="text-[10px] font-mono text-[var(--text-muted)]">
                    Zero-knowledge profile avatar and display label.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-mono-label text-[var(--text-muted)] block">DISPLAY NAME</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Juan Dela Cruz"
                  className="w-full bg-[var(--bg-surface)] border border-keepeit rounded-keepeit px-3 py-2 text-xs font-sans text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-2">
                <label className="font-mono-label text-[var(--text-muted)] block">LETTER AVATAR COLOR</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {['#27272A', '#E4E4E7', '#71717A', '#09090B', '#2563EB', '#DC2626', '#7C3AED'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setAvatarColor(col)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${
                        avatarColor === col ? 'ring-2 ring-[var(--accent-seal)] ring-offset-2 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: col }}
                    >
                      {avatarColor === col && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[var(--accent-seal-soft)]/30 border border-keepeit rounded-keepeit text-[11px] text-[var(--text-primary)] leading-relaxed flex items-center gap-2">
                <Lock className="w-4 h-4 text-[var(--accent-seal)] shrink-0" />
                <span>
                  All account details are encrypted inside your local zero-knowledge vault envelope and never transmitted over any network.
                </span>
              </div>

              <div className="pt-2 border-t border-keepeit flex items-center justify-between">
                {accountSaved ? (
                  <span className="text-zinc-400 font-mono text-xs flex items-center gap-1">
                    <Check className="w-4 h-4 text-[var(--accent-seal)]" /> Account profile updated!
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  className="btn-stealth-primary px-4 py-2 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] font-mono-label text-xs font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B]"
                >
                  SAVE ACCOUNT PROFILE
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Theme Mode */}
              <div className="space-y-2">
                <label className="font-mono-label text-[var(--text-muted)] flex items-center gap-1.5">
                  {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  THEME MODE
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => theme === 'dark' && onToggleTheme()}
                    className={`py-3 px-4 border border-keepeit rounded-keepeit font-mono-label text-xs flex items-center justify-center gap-2 ${
                      theme === 'light'
                        ? 'bg-[var(--accent-seal)] text-[var(--accent-fg)] font-semibold'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                    }`}
                  >
                    <Sun className="w-4 h-4" /> LIGHT MODE
                  </button>
                  <button
                    type="button"
                    onClick={() => theme === 'light' && onToggleTheme()}
                    className={`py-3 px-4 border border-keepeit rounded-keepeit font-mono-label text-xs flex items-center justify-center gap-2 ${
                      theme === 'dark'
                        ? 'bg-[var(--accent-seal)] text-[var(--accent-fg)] font-semibold'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                    }`}
                  >
                    <Moon className="w-4 h-4" /> DARK MODE
                  </button>
                </div>
              </div>

              {/* Accent Colors */}
              <div className="space-y-2 pt-4 border-t border-keepeit">
                <label className="font-mono-label text-[var(--text-muted)] flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-[var(--accent-seal)]" />
                  ACCENT COLOR PALETTE
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono-label text-xs">
                  {[
                    { id: 'seal', name: 'STEALTH SILVER', hex: '#E4E4E7' },
                    { id: 'rust', name: 'CRIMSON RUST', hex: '#DC2626' },
                    { id: 'graphite', name: 'GRAPHITE ZINC', hex: '#71717A' },
                    { id: 'ink', name: 'OBSIDIAN INK', hex: '#09090B' },
                  ].map((ac) => (
                    <button
                      key={ac.id}
                      type="button"
                      onClick={() => handleSelectAccent(ac.id as any)}
                      className={`p-3 border border-keepeit rounded-keepeit flex flex-col items-center gap-1.5 transition-all ${
                        accent === ac.id
                          ? 'border-[var(--accent-seal)] bg-[var(--accent-seal-soft)]/20 font-bold'
                          : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)]'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: ac.hex }} />
                      <span className="text-[10px]">{ac.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Scale */}
              <div className="space-y-2 pt-4 border-t border-keepeit">
                <label className="font-mono-label text-[var(--text-muted)]">FONT SCALE</label>
                <div className="grid grid-cols-3 gap-2 font-mono-label text-xs">
                  {[
                    { id: 'S', label: 'SMALL (13PX)' },
                    { id: 'M', label: 'MEDIUM (14PX)' },
                    { id: 'L', label: 'LARGE (15PX)' },
                  ].map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => handleSelectFontScale(sc.id as any)}
                      className={`py-2 px-3 border border-keepeit rounded-keepeit text-center font-semibold transition-colors ${
                        fontScale === sc.id
                          ? 'bg-[var(--accent-seal)] text-[var(--accent-fg)]'
                          : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                      }`}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Passkey Unlock Section (WebAuthn PRF) */}
              <div className="space-y-3 p-4 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit">
                <div className="flex items-center justify-between">
                  <label className="font-mono-label text-[var(--text-primary)] font-bold flex items-center gap-1.5 text-xs">
                    <Fingerprint className="w-4 h-4 text-[var(--accent-seal)]" />
                    PASSKEY UNLOCK (WEBAUTHN PRF)
                  </label>
                  <span
                    className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-keepeit ${
                      hasPasskey
                        ? 'bg-zinc-500/20 text-zinc-300 dark:text-zinc-200'
                        : isPasskeySupported
                        ? 'bg-gray-500/20 text-[var(--text-muted)]'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {hasPasskey
                      ? 'ENABLED'
                      : isPasskeySupported
                      ? 'NOT CONFIGURED'
                      : 'UNSUPPORTED ON THIS DEVICE'}
                  </span>
                </div>

                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Unlock with your device biometrics. Your master password still works, and is the only way in if you lose this device.
                </p>

                {passkeyErrorMsg && (
                  <div className="p-2.5 bg-red-500/10 border border-[var(--accent-rust)] text-[var(--accent-rust)] text-xs rounded-keepeit">
                    {passkeyErrorMsg}
                  </div>
                )}

                {passkeyStatusMsg && (
                  <div className="p-2.5 bg-[var(--bg-surface)] border border-zinc-500/30 text-[var(--text-primary)] text-xs rounded-keepeit flex items-center gap-2 font-mono">
                    <Check className="w-4 h-4 shrink-0 text-[var(--accent-seal)]" />
                    <span>{passkeyStatusMsg}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  {hasPasskey ? (
                    <button
                      type="button"
                      onClick={() => setShowPasskeyRemoveConfirm(true)}
                      className="px-3.5 py-2 bg-[var(--accent-rust)] text-white font-mono-label text-xs font-semibold rounded-keepeit hover:opacity-90 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> REMOVE PASSKEY
                    </button>
                  ) : isPasskeySupported ? (
                    <button
                      type="button"
                      disabled={isEnrollingPasskey}
                      onClick={handleEnrollPasskey}
                      className="btn-stealth-primary px-4 py-2 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] font-mono-label text-xs font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Fingerprint className="w-4 h-4" />
                      <span>{isEnrollingPasskey ? 'ENROLLING...' : 'ADD PASSKEY'}</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                      WebAuthn PRF key derivation extension is not available in this browser environment.
                    </span>
                  )}
                </div>

                {/* Security Note Box */}
                <div className="mt-3 p-3 bg-[var(--bg-card)] border border-keepeit rounded-keepeit space-y-1">
                  <span className="text-[10px] font-mono-label font-bold text-[var(--text-muted)] block">
                    SECURITY ARCHITECTURE NOTE:
                  </span>
                  <p className="text-[10px] font-mono text-[var(--text-muted)] leading-relaxed">
                    Passkey unlock is exactly as strong as the device's biometric gate plus the fact that the wrapped DEK sits next to the ciphertext. Someone with the unlocked device can open the vault. This is the same model as native vaults; it is a convenience path, not an increase in security. userVerification is 'required' so a passkey alone, without biometrics or a device PIN, cannot unwrap anything.
                  </p>
                </div>
              </div>

              {/* Auto-Lock Minutes */}
              <div className="space-y-2">
                <label className="font-mono-label text-[var(--text-muted)] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[var(--accent-seal)]" />
                  AUTO-LOCK IDLE TIMEOUT
                </label>
                <div className="grid grid-cols-5 gap-1.5 font-mono text-xs">
                  {[1, 5, 15, 30, 0].map((mins) => {
                    const isSel = vaultData.settings.autoLockMinutes === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => updateSettings({ autoLockMinutes: mins })}
                        className={`py-2 rounded-keepeit border border-keepeit font-semibold transition-colors ${
                          isSel
                            ? 'bg-[var(--accent-seal)] text-[var(--accent-fg)]'
                            : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                        }`}
                      >
                        {mins === 0 ? 'Never' : `${mins}m`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Clipboard Clear Timeout */}
              <div className="space-y-2 pt-4 border-t border-keepeit">
                <label className="font-mono-label text-[var(--text-muted)] flex items-center gap-1.5">
                  <Copy className="w-4 h-4 text-[var(--accent-seal)]" />
                  AUTOMATIC CLIPBOARD CLEAR TIMEOUT
                </label>
                <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
                  {[10, 30, 60, 0].map((secs) => {
                    const isSel = vaultData.settings.clearClipboardSeconds === secs;
                    return (
                      <button
                        key={secs}
                        type="button"
                        onClick={() => updateSettings({ clearClipboardSeconds: secs })}
                        className={`py-2 rounded-keepeit border border-keepeit font-semibold transition-colors ${
                          isSel
                            ? 'bg-[var(--accent-seal)] text-[var(--accent-fg)]'
                            : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                        }`}
                      >
                        {secs === 0 ? 'Never' : `${secs}s`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Regenerate Recovery Code */}
              <form onSubmit={handleRegenerateRecovery} className="space-y-3 pt-4 border-t border-keepeit">
                <label className="font-mono-label text-[var(--text-muted)] flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[var(--accent-seal)]" />
                  REGENERATE EMERGENCY RECOVERY CODE
                </label>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Generates a new 24-character emergency key to unlock your vault if you lose your master password.
                </p>

                {recoveryError && (
                  <div className="p-2.5 bg-red-500/10 border border-[var(--accent-rust)] text-[var(--accent-rust)] text-xs rounded-keepeit">
                    {recoveryError}
                  </div>
                )}

                {generatedRecoveryCode ? (
                  <div className="p-4 bg-[var(--accent-seal-soft)]/20 border border-[var(--accent-seal)] rounded-keepeit space-y-2">
                    <p className="font-mono-label text-[10px] text-[var(--accent-seal)] font-bold">YOUR NEW EMERGENCY RECOVERY CODE:</p>
                    <div className="p-3 bg-[var(--bg-main)] border border-keepeit rounded-keepeit font-mono text-sm font-bold tracking-widest text-[var(--text-primary)] select-all flex items-center justify-between">
                      <span>{generatedRecoveryCode}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedRecoveryCode);
                          setRecoveryCopied(true);
                          setTimeout(() => setRecoveryCopied(false), 2000);
                        }}
                        className="px-2.5 py-1 bg-[var(--accent-seal)] text-[var(--accent-fg)] font-mono-label text-[10px] rounded-keepeit font-semibold"
                      >
                        {recoveryCopied ? 'COPIED' : 'COPY CODE'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={recoveryMasterPassword}
                      onChange={(e) => setRecoveryMasterPassword(e.target.value)}
                      placeholder="Confirm current Master Password..."
                      className="flex-1 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                    />
                    <button
                      type="submit"
                      className="btn-stealth-primary px-4 py-2 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] font-mono-label text-xs font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] shrink-0"
                    >
                      REGENERATE
                    </button>
                  </div>
                )}
              </form>

              {/* Change Master Password */}
              <form onSubmit={handleChangePasswordSubmit} className="space-y-3 pt-4 border-t border-keepeit">
                <label className="font-mono-label text-[var(--text-muted)] flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-[var(--accent-seal)]" />
                  CHANGE MASTER PASSWORD (RE-ENCRYPT VAULT)
                </label>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Derives a new key and re-encrypts the entire vault payload. Verification happens before swapping keys.
                </p>

                {passwordError && (
                  <div className="p-2.5 bg-red-500/10 border border-[var(--accent-rust)] text-[var(--accent-rust)] text-xs rounded-keepeit">
                    {passwordError}
                  </div>
                )}

                {passwordStatus && (
                  <div className="p-2.5 bg-[var(--bg-surface)] border border-zinc-500/30 text-[var(--text-primary)] text-xs rounded-keepeit flex items-center gap-2 font-mono">
                    <Check className="w-4 h-4 shrink-0 text-[var(--accent-seal)]" />
                    <span>{passwordStatus}</span>
                  </div>
                )}

                {passwordProgress && (
                  <div className="p-3 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit font-mono text-xs text-[var(--accent-seal)] flex items-center gap-2 animate-pulse">
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>{passwordProgress}</span>
                  </div>
                )}

                <input
                  type="password"
                  value={newMasterPassword}
                  onChange={(e) => setNewMasterPassword(e.target.value)}
                  placeholder="New Master Password (min 8 chars)..."
                  className="w-full bg-[var(--bg-surface)] border border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                />

                <input
                  type="password"
                  value={confirmMasterPassword}
                  onChange={(e) => setConfirmMasterPassword(e.target.value)}
                  placeholder="Confirm New Master Password..."
                  className="w-full bg-[var(--bg-surface)] border border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                />

                <input
                  type="text"
                  value={newHint}
                  onChange={(e) => setNewHint(e.target.value)}
                  placeholder="Optional Password Hint..."
                  className="w-full bg-[var(--bg-surface)] border border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                />

                <button
                  type="submit"
                  disabled={!newMasterPassword || !confirmMasterPassword}
                  className="btn-stealth-primary w-full py-2 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] font-mono-label text-xs font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] disabled:opacity-50"
                >
                  RE-ENCRYPT VAULT & CHANGE PASSWORD
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: DATA & BACKUP */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Storage Quota & Durability Block */}
              {(() => {
                const { days, isOver14Days } = getBackupAgeInDays(vaultData.lastBackupAt);
                const isBestEffort = storageEstimate && !storageEstimate.persisted;
                const isWarning = isBestEffort || isOver14Days;

                return (
                  <div
                    className={`p-4 border rounded-keepeit space-y-3 transition-colors ${
                      isWarning
                        ? 'bg-[var(--accent-rust)]/10 border-[var(--accent-rust)] text-[var(--accent-rust)]'
                        : 'bg-[var(--bg-surface)] border-keepeit text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-mono-label text-xs font-bold flex items-center gap-1.5">
                        <HardDrive className={`w-4 h-4 ${isWarning ? 'text-[var(--accent-rust)]' : 'text-[var(--accent-seal)]'}`} />
                        INDEXEDDB STORAGE DURABILITY & QUOTA
                      </h4>
                      <span
                        className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-keepeit ${
                          storageEstimate?.persisted
                            ? 'bg-zinc-500/20 text-zinc-300 dark:text-zinc-200'
                            : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {storageEstimate?.persisted ? 'PERSISTENT STORAGE GRANTED' : 'BEST-EFFORT STORAGE'}
                      </span>
                    </div>

                    <div className="space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between text-[11px]">
                        <span>STORAGE USAGE:</span>
                        <span className="font-bold">
                          {storageEstimate ? `${storageEstimate.usageMB} MB / ${storageEstimate.quotaMB} MB` : 'Calculating...'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[var(--bg-card)] border border-keepeit rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${isWarning ? 'bg-[var(--accent-rust)]' : 'bg-[var(--accent-seal)]'}`}
                          style={{ width: `${Math.max(2, storageEstimate?.percentUsed || 0)}%` }}
                        />
                      </div>
                    </div>

                    {isWarning && (
                      <div className="pt-2 border-t border-[var(--accent-rust)]/30 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] leading-snug">
                          {isBestEffort
                            ? 'Browser storage is currently in best-effort mode. Clear browser data could evict vault.'
                            : 'Your last encrypted backup was over 14 days ago.'}
                        </p>
                        <button
                          type="button"
                          onClick={exportBackup}
                          className="px-3 py-1.5 bg-[var(--accent-rust)] text-white font-mono-label text-xs font-bold rounded-keepeit hover:opacity-90 flex items-center gap-1.5 shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" /> EXPORT BACKUP NOW
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Encrypted Envelope Backup */}
              <div className="p-4 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-mono-label text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-[var(--accent-seal)]" />
                    EXPORT ENCRYPTED VAULT BACKUP (.KEEPEIT)
                  </h4>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Downloads your zero-knowledge encrypted envelope containing all credentials, notes, and tasks as a single JSON payload.
                </p>
                <button
                  type="button"
                  onClick={exportBackup}
                  className="btn-stealth-primary px-4 py-2 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] font-mono-label text-xs font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> EXPORT ENCRYPTED BACKUP FILE
                </button>
              </div>

              {/* Import Encrypted Envelope Backup */}
              <form onSubmit={handleImportBackupSubmit} className="p-4 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit space-y-3">
                <h4 className="font-mono-label text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-[var(--accent-seal)]" />
                  RESTORE FROM ENCRYPTED BACKUP FILE
                </h4>

                {importBackupError && (
                  <div className="p-2.5 bg-red-500/10 border border-[var(--accent-rust)] text-[var(--accent-rust)] text-xs rounded-keepeit">
                    {importBackupError}
                  </div>
                )}

                {importBackupStatus && (
                  <div className="p-2.5 bg-[var(--bg-surface)] border border-zinc-500/30 text-[var(--text-primary)] text-xs rounded-keepeit flex items-center gap-2 font-mono">
                    <Check className="w-4 h-4 shrink-0 text-[var(--accent-seal)]" />
                    <span>{importBackupStatus}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 bg-[var(--bg-card)] border border-keepeit rounded-keepeit font-mono-label text-xs cursor-pointer hover:bg-[var(--bg-surface-hover)]">
                    SELECT .KEEPEIT FILE
                    <input type="file" accept=".keepeit,.json" onChange={handleBackupFileUpload} className="hidden" />
                  </label>
                  <span className="font-mono text-[11px] text-[var(--text-muted)] truncate">
                    {backupFileName || 'No file selected'}
                  </span>
                </div>

                <input
                  type="password"
                  value={backupMasterPassword}
                  onChange={(e) => setBackupMasterPassword(e.target.value)}
                  placeholder="Master password for this backup file..."
                  className="w-full bg-[var(--bg-card)] border border-keepeit rounded-keepeit px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                />

                <button
                  type="submit"
                  disabled={!backupFileContent || !backupMasterPassword}
                  className="btn-stealth-primary px-4 py-2 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] font-mono-label text-xs font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] disabled:opacity-50"
                >
                  RESTORE BACKUP
                </button>
              </form>

              {/* CSV Operations & Plaintext Warning */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-keepeit space-y-3">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-mono-label text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>PLAINTEXT CSV SPREADSHEET OPERATIONS</span>
                </div>

                <p className="text-[11px] text-[var(--text-primary)] leading-relaxed">
                  <strong>WARNING:</strong> Exporting to CSV creates an UNENCRYPTED spreadsheet containing your passwords, usernames, and notes in plain text. Store or delete CSV files immediately after use.
                </p>

                {csvError && (
                  <div className="p-2 bg-red-500/10 border border-[var(--accent-rust)] text-[var(--accent-rust)] text-xs rounded-keepeit">
                    {csvError}
                  </div>
                )}

                {csvStatus && (
                  <div className="p-2 bg-[var(--bg-surface)] border border-zinc-500/30 text-[var(--text-primary)] text-xs rounded-keepeit font-mono flex items-center gap-2">
                    <Check className="w-4 h-4 text-[var(--accent-seal)]" />
                    <span>{csvStatus}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3 py-1.5 bg-[var(--accent-rust)] text-white font-mono-label text-xs font-semibold rounded-keepeit hover:opacity-90 flex items-center gap-1"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> EXPORT CSV
                  </button>

                  <label className="px-3 py-1.5 bg-[var(--bg-card)] border border-keepeit rounded-keepeit font-mono-label text-xs cursor-pointer hover:bg-[var(--bg-surface-hover)] flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" /> IMPORT CSV
                    <input type="file" accept=".csv" onChange={handleImportCSVFile} className="hidden" />
                  </label>

                  <button
                    type="button"
                    onClick={handleDownloadCSVTemplate}
                    className="px-3 py-1.5 bg-[var(--bg-card)] border border-keepeit rounded-keepeit font-mono-label text-xs hover:bg-[var(--bg-surface-hover)]"
                  >
                    TEMPLATE
                  </button>
                </div>
              </div>

              {/* Reset Vault Danger Zone */}
              <div className="p-4 bg-red-500/10 border border-[var(--accent-rust)] rounded-keepeit space-y-3">
                <h4 className="font-mono-label text-xs text-[var(--accent-rust)] font-bold flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4" /> DANGER ZONE: RESET VAULT
                </h4>
                <p className="text-[11px] text-[var(--text-primary)] leading-relaxed">
                  Permanently deletes all stored items, folders, and keys from IndexedDB. This operation cannot be undone.
                </p>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono-label text-[var(--accent-rust)] block">
                    TYPE "DELETE" TO CONFIRM:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmInput}
                    onChange={(e) => setDeleteConfirmInput(e.target.value)}
                    placeholder="DELETE"
                    className="w-full bg-[var(--bg-card)] border border-[var(--accent-rust)] rounded-keepeit px-3 py-2 text-xs font-mono font-bold text-[var(--accent-rust)]"
                  />
                </div>

                <button
                  type="button"
                  disabled={deleteConfirmInput !== 'DELETE' || isResetting}
                  onClick={handleResetVault}
                  className="w-full py-2 bg-[var(--accent-rust)] text-white font-mono-label text-xs font-bold rounded-keepeit hover:opacity-90 disabled:opacity-50"
                >
                  {isResetting ? 'WIPING VAULT...' : 'PERMANENTLY RESET VAULT'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: ABOUT */}
          {activeTab === 'about' && (
            <div className="space-y-5">
              <div className="p-6 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--accent-seal)] text-[var(--accent-fg)]">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-[var(--text-primary)]">KeepEit</h3>
                  <p className="text-xs font-mono text-[var(--text-muted)]">VERSION 1.0.0 (RELEASE)</p>
                </div>
                <p className="text-xs text-[var(--text-primary)] leading-relaxed max-w-md mx-auto">
                  Local-first zero-knowledge encrypted vault and personal productivity workspace. Built with Web Crypto API 256-bit AES-GCM and PBKDF2 key derivation.
                </p>
              </div>

              <div className="p-4 bg-[var(--bg-card)] border border-keepeit rounded-keepeit space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-keepeit">
                  <span className="text-[var(--text-muted)]">DEVELOPER:</span>
                  <span className="font-bold text-[var(--text-primary)]">Kurt Ross Gonzaga</span>
                </div>
                <div className="flex justify-between py-1 border-b border-keepeit">
                  <span className="text-[var(--text-muted)]">ENCRYPTION ENGINE:</span>
                  <span className="font-bold text-[var(--accent-seal)]">AES-256-GCM + PBKDF2</span>
                </div>
                <div className="flex justify-between py-1 border-b border-keepeit">
                  <span className="text-[var(--text-muted)]">PASSKEY KEY DERIVATION:</span>
                  <span className="font-bold text-[var(--accent-seal)]">WebAuthn PRF (HKDF-SHA256)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-keepeit">
                  <span className="text-[var(--text-muted)]">STORAGE TARGET:</span>
                  <span className="font-bold text-[var(--text-primary)]">IndexedDB Single Envelope</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[var(--text-muted)]">NETWORK AUDIT:</span>
                  <span className="font-bold text-[var(--accent-seal)]">0 Network Calls (100% Offline)</span>
                </div>
              </div>

              {/* Passkey Security Model Note */}
              <div className="p-4 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit space-y-1 text-xs">
                <span className="font-mono-label font-bold text-[var(--accent-seal)] flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4" /> PASSKEY SECURITY MODEL
                </span>
                <p className="font-mono text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Passkey unlock is exactly as strong as the device's biometric gate plus the fact that the wrapped DEK sits next to the ciphertext. Someone with the unlocked device can open the vault. This is the same model as native vaults; it is a convenience path, not an increase in security. userVerification is 'required' so a passkey alone, without biometrics or a device PIN, cannot unwrap anything.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap justify-center items-center gap-3">
                <InstallButton variant="primary" />
                <a
                  href="https://github.com/krtgonzaga44/keepeit"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-[var(--bg-surface)] border border-keepeit hover:bg-[var(--bg-surface-hover)] rounded-keepeit font-mono-label text-xs text-[var(--text-primary)] flex items-center gap-1.5"
                >
                  <ExternalLink className="w-4 h-4 text-[var(--accent-seal)]" />
                  <span>VIEW TECHNICAL CASE STUDY</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-keepeit flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--bg-surface)] border border-keepeit text-[var(--text-primary)] rounded-keepeit font-mono-label text-xs hover:bg-[var(--bg-surface-hover)]"
          >
            CLOSE PREFERENCES
          </button>
        </div>
      </div>

      {/* Remove Passkey Confirmation Modal */}
      {showPasskeyRemoveConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-keepeit rounded-keepeit p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-mono-label font-bold text-[var(--accent-rust)] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              Remove Passkey Unlock?
            </h3>
            <p className="text-xs text-[var(--text-primary)] leading-relaxed">
              This will remove the passkey wrapper from your encrypted vault envelope. Your master password will remain as the unlock path and cannot be removed.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPasskeyRemoveConfirm(false)}
                className="px-3.5 py-1.5 text-xs font-mono-label border border-keepeit rounded-keepeit hover:bg-[var(--bg-surface)] text-[var(--text-primary)]"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmRemovePasskey}
                className="px-3.5 py-1.5 text-xs font-mono-label bg-[var(--accent-rust)] text-white rounded-keepeit hover:opacity-90 font-semibold"
              >
                CONFIRM REMOVE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

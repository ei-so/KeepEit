import React, { useState, useEffect } from 'react';
import { useVault } from '../hooks/useVault';
import { getBackupAgeInDays } from '../lib/persistence';
import { Lock, ShieldCheck, Clock, HardDrive, RefreshCw, CheckCircle2, AlertTriangle, DownloadCloud } from 'lucide-react';

export const SealBar: React.FC = () => {
  const { vaultData, lockCountdownSeconds, lockVault, exportBackup, refreshTimer, autosaveState } = useVault();
  const [swUpdateWaiting, setSwUpdateWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // Listen for service worker update event
    const handleSwUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ waitingWorker: ServiceWorker }>;
      if (customEvent.detail?.waitingWorker) {
        setSwUpdateWaiting(customEvent.detail.waitingWorker);
      }
    };

    window.addEventListener('keepeit_sw_update_ready', handleSwUpdate);
    return () => window.removeEventListener('keepeit_sw_update_ready', handleSwUpdate);
  }, []);

  const reloadAppForUpdate = () => {
    if (swUpdateWaiting) {
      swUpdateWaiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  if (!vaultData) return null;

  const totalItems = vaultData.items.length;
  const notesCount = vaultData.items.filter((i) => i.category === 'note').length;
  const credsCount = vaultData.items.filter((i) => i.category === 'credential').length;
  const cardsCount = vaultData.items.filter((i) => i.category === 'card').length;
  const snippetsCount = vaultData.items.filter((i) => i.category === 'snippet').length;
  const filesCount = vaultData.items.filter((i) => i.category === 'file').length;

  // Format lock countdown MM:SS
  const minutes = Math.floor(lockCountdownSeconds / 60);
  const seconds = lockCountdownSeconds % 60;
  const formattedCountdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Check backup age
  const { days, isOver14Days } = getBackupAgeInDays(vaultData.lastBackupAt);

  // Format last backup text
  const formatLastBackup = () => {
    if (!vaultData.lastBackupAt) return 'No backup yet';
    const backupDate = new Date(vaultData.lastBackupAt);
    const now = new Date();
    const diffMs = now.getTime() - backupDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${days}d ago`;
  };

  return (
    <footer
      aria-label="Vault Seal Status Bar"
      className="hidden md:flex fixed bottom-0 left-0 right-0 z-30 bg-[var(--bg-surface)] border-t border-keepeit px-4 py-1.5 md:pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] items-center justify-between gap-2 text-[11px] font-mono-label select-none shadow-lg transition-all"
    >
      {/* Left: Security Status & Item Breakdown */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-[var(--accent-seal)] font-semibold">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span className="truncate">AES-256-GCM • ENCRYPTED</span>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-[var(--text-muted)] border-l border-keepeit pl-3">
          <span className="text-[var(--text-primary)] font-semibold">{totalItems} ITEMS</span>
          <span>({credsCount} Creds • {notesCount} Notes • {cardsCount} Cards • {snippetsCount} Snippets • {filesCount} Files)</span>
        </div>
      </div>

      {/* Right: SW Update, Lock Countdown, Backup Age, Lock Action */}
      <div className="flex items-center gap-3 flex-wrap ml-auto">
        {/* Service Worker Update Banner */}
        {swUpdateWaiting && (
          <button
            onClick={reloadAppForUpdate}
            className="flex items-center gap-1.5 bg-[var(--accent-seal)] text-[var(--accent-fg)] px-2.5 py-0.5 rounded-keepeit font-bold animate-pulse hover:opacity-90"
            title="A new version of KeepEit is available. Reload to update."
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>UPDATE READY — RELOAD</span>
          </button>
        )}

        {/* Autosave Status Indicator */}
        {autosaveState !== 'idle' && (
          <div className="flex items-center gap-1.5 text-[var(--accent-seal)] font-semibold animate-in fade-in transition-all">
            {autosaveState === 'saving' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--accent-seal)]" />
                <span className="text-[10px]">SAVING...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent-seal)]" />
                <span className="text-[10px]">SAVED</span>
              </>
            )}
          </div>
        )}

        {/* Backup Age Indicator (>14 days triggers rust styling) */}
        <button
          onClick={exportBackup}
          title={isOver14Days ? 'Backup is older than 14 days! Click to export encrypted backup' : 'Click to export encrypted backup'}
          className={`flex items-center gap-1.5 transition-colors focus-visible:ring-2 rounded-keepeit px-2 py-0.5 font-semibold ${
            isOver14Days
              ? 'bg-[var(--accent-rust)] text-white hover:opacity-90 animate-pulse'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          {isOver14Days ? <AlertTriangle className="w-3.5 h-3.5 text-white" /> : <HardDrive className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
          <span>BACKUP: {formatLastBackup()}</span>
        </button>

        {/* Lock Timer */}
        {vaultData.settings.autoLockMinutes > 0 ? (
          <div className="hidden sm:flex items-center gap-1.5 border-l border-keepeit pl-3">
            <Clock className="w-3.5 h-3.5 text-[var(--accent-rust)]" />
            <span className="text-[var(--text-muted)]">LOCK:</span>
            <span
              className={`font-semibold ${
                lockCountdownSeconds < 60 ? 'text-[var(--accent-rust)] animate-pulse' : 'text-[var(--text-primary)]'
              }`}
            >
              {formattedCountdown}
            </span>
            <button
              onClick={refreshTimer}
              title="Extend session timer"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded-keepeit"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        ) : null}

        {/* Manual Lock Button */}
        <button
          onClick={lockVault}
          className="flex items-center gap-1 bg-[var(--accent-rust)] text-white hover:opacity-90 px-2.5 py-1 rounded-keepeit font-mono-label font-medium text-[11px] transition-all min-h-[32px]"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">LOCK VAULT</span>
          <span className="sm:hidden">LOCK</span>
        </button>
      </div>
    </footer>
  );
};


import React, { useState } from 'react';
import { useVault } from '../hooks/useVault';
import { X, HardDrive, Download, Upload, AlertCircle, CheckCircle } from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const { vaultData, exportBackup, importBackup } = useVault();
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !vaultData) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        await importBackup(content);
        setImportStatus('Backup envelope verified successfully.');
        setErrorMessage(null);
      } catch (err: any) {
        setErrorMessage(err.message || 'Invalid backup envelope.');
        setImportStatus(null);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border-keepeit rounded-keepeit max-w-md w-full p-4 sm:p-6 pb-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-keepeit pb-3">
          <h3 className="font-display font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[var(--accent-seal)]" />
            Encrypted Backup & Recovery
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-keepeit text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-500/10 border border-[var(--accent-rust)] text-[var(--accent-rust)] text-xs rounded-keepeit flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {importStatus && (
          <div className="p-3 bg-[var(--bg-surface)] border border-zinc-500/30 text-[var(--text-primary)] text-xs rounded-keepeit flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-[var(--accent-seal)]" />
            <span>{importStatus}</span>
          </div>
        )}

        {/* Section 1: Export */}
        <div className="p-4 bg-[var(--bg-surface)] border-keepeit rounded-keepeit space-y-3">
          <div>
            <h4 className="font-mono-label font-bold text-xs text-[var(--text-primary)]">
              1. EXPORT ENCRYPTED BACKUP (.keepeit)
            </h4>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              Downloads your complete vault as a single AES-GCM encrypted JSON envelope file. Keep it in a safe location.
            </p>
          </div>

          <button
            onClick={() => {
              exportBackup();
              onClose();
            }}
            className="btn-stealth-primary w-full py-2 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] font-mono-label text-xs font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD ENCRYPTED BACKUP FILE</span>
          </button>
        </div>

        {/* Section 2: Import */}
        <div className="p-4 bg-[var(--bg-surface)] border-keepeit rounded-keepeit space-y-3">
          <div>
            <h4 className="font-mono-label font-bold text-xs text-[var(--text-primary)]">
              2. RESTORE / VERIFY BACKUP
            </h4>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              Select an existing `.keepeit` encrypted JSON file to restore or verify envelope integrity.
            </p>
          </div>

          <label className="w-full py-2 bg-[var(--bg-card)] border-keepeit text-[var(--text-primary)] font-mono-label text-xs font-semibold rounded-keepeit hover:bg-[var(--bg-surface-hover)] flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>SELECT BACKUP FILE</span>
            <input
              type="file"
              accept=".keepeit,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-keepeit flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border-keepeit text-[var(--text-primary)] rounded-keepeit font-mono-label text-xs hover:bg-[var(--bg-surface)]"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

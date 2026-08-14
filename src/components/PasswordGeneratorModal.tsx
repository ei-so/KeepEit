import React, { useState, useEffect } from 'react';
import { generateSecurePassword, evaluatePasswordStrength } from '../services/crypto';
import { X, RefreshCw, Copy, Check, KeyRound, PlusCircle } from 'lucide-react';

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseInCredential?: (password: string) => void;
}

export const PasswordGeneratorModal: React.FC<PasswordGeneratorModalProps> = ({
  isOpen,
  onClose,
  onUseInCredential,
}) => {
  const [length, setLength] = useState(20);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const activeToggleCount = (uppercase ? 1 : 0) + (lowercase ? 1 : 0) + (numbers ? 1 : 0) + (symbols ? 1 : 0);

  const regenerate = () => {
    const pwd = generateSecurePassword({
      length,
      uppercase,
      lowercase,
      numbers,
      symbols,
    });
    setGeneratedPassword(pwd);
    setCopied(false);
  };

  useEffect(() => {
    if (isOpen) {
      regenerate();
    }
  }, [isOpen, length, uppercase, lowercase, numbers, symbols]);

  if (!isOpen) return null;

  const strength = evaluatePasswordStrength(generatedPassword);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseInCredential = () => {
    handleCopy();
    if (onUseInCredential) {
      onUseInCredential(generatedPassword);
    }
    onClose();
  };

  const renderColoredPassword = (pwd: string) => {
    return pwd.split('').map((char, index) => {
      let colorClass = 'text-[var(--text-primary)] font-semibold'; // letters
      if (/[0-9]/.test(char)) {
        colorClass = 'text-[var(--accent-seal)] font-bold'; // digits
      } else if (/[^a-zA-Z0-9]/.test(char)) {
        colorClass = 'text-[var(--accent-rust)] font-bold'; // symbols
      }
      return (
        <span key={index} className={colorClass}>
          {char}
        </span>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border-keepeit rounded-keepeit max-w-lg w-full p-4 sm:p-6 pb-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-keepeit pb-3">
          <h3 className="font-display font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[var(--accent-seal)]" />
            Cryptographic Password Generator
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-keepeit text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Display Box with per-character coloring */}
        <div className="p-4 bg-[var(--bg-surface)] border-keepeit rounded-keepeit space-y-3">
          <div className="p-3 bg-[var(--bg-main)] border border-keepeit rounded-keepeit flex items-center justify-between gap-2 overflow-x-auto min-h-[52px]">
            <span className="font-mono text-base md:text-lg break-all tracking-wider select-all">
              {renderColoredPassword(generatedPassword)}
            </span>
            <button
              onClick={regenerate}
              className="p-2 rounded-keepeit text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] shrink-0"
              title="Regenerate Password"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Color Legend */}
          <div className="flex items-center justify-center gap-4 text-[10px] font-mono-label text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--text-primary)] inline-block" />
              Letters
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-seal)] inline-block" />
              Digits
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-rust)] inline-block" />
              Symbols
            </span>
          </div>

          {/* Strength Bar */}
          <div className="pt-2 border-t border-keepeit space-y-1">
            <div className="flex justify-between text-[10px] font-mono-label">
              <span className="text-[var(--text-muted)]">ENTROPY STRENGTH:</span>
              <span className="font-bold text-[var(--accent-seal)]">{strength.label.toUpperCase()} ({strength.score * 32 + 32} BITS)</span>
            </div>
            <div className="h-1.5 w-full bg-[var(--bg-card)] rounded-full overflow-hidden flex gap-1">
              {[0, 1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-full flex-1 transition-all ${
                    step <= strength.score ? 'bg-[var(--accent-seal)]' : 'bg-transparent'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4 text-xs font-mono">
          {/* Length Slider (4 to 64) */}
          <div>
            <div className="flex justify-between font-mono-label text-[var(--text-muted)] mb-1">
              <span>LENGTH (4–64 CHARS):</span>
              <span className="font-bold text-[var(--text-primary)]">{length} CHARACTERS</span>
            </div>
            <input
              type="range"
              min={4}
              max={64}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="w-full accent-[var(--accent-seal)] cursor-pointer"
            />
          </div>

          {/* Options Toggles - never allow all four off */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2 p-2 bg-[var(--bg-surface)] border-keepeit rounded-keepeit cursor-pointer">
              <input
                type="checkbox"
                checked={uppercase}
                onChange={(e) => {
                  if (!e.target.checked && activeToggleCount <= 1) return;
                  setUppercase(e.target.checked);
                }}
                className="accent-[var(--accent-seal)]"
              />
              <span className="font-mono-label text-[11px]">UPPERCASE (A-Z)</span>
            </label>

            <label className="flex items-center gap-2 p-2 bg-[var(--bg-surface)] border-keepeit rounded-keepeit cursor-pointer">
              <input
                type="checkbox"
                checked={lowercase}
                onChange={(e) => {
                  if (!e.target.checked && activeToggleCount <= 1) return;
                  setLowercase(e.target.checked);
                }}
                className="accent-[var(--accent-seal)]"
              />
              <span className="font-mono-label text-[11px]">LOWERCASE (a-z)</span>
            </label>

            <label className="flex items-center gap-2 p-2 bg-[var(--bg-surface)] border-keepeit rounded-keepeit cursor-pointer">
              <input
                type="checkbox"
                checked={numbers}
                onChange={(e) => {
                  if (!e.target.checked && activeToggleCount <= 1) return;
                  setNumbers(e.target.checked);
                }}
                className="accent-[var(--accent-seal)]"
              />
              <span className="font-mono-label text-[11px]">NUMBERS (0-9)</span>
            </label>

            <label className="flex items-center gap-2 p-2 bg-[var(--bg-surface)] border-keepeit rounded-keepeit cursor-pointer">
              <input
                type="checkbox"
                checked={symbols}
                onChange={(e) => {
                  if (!e.target.checked && activeToggleCount <= 1) return;
                  setSymbols(e.target.checked);
                }}
                className="accent-[var(--accent-seal)]"
              />
              <span className="font-mono-label text-[11px]">SYMBOLS (!@#$)</span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-keepeit flex flex-col sm:flex-row items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleUseInCredential}
            className="w-full sm:w-auto px-3.5 py-2 bg-[var(--bg-surface)] border border-keepeit text-[var(--accent-seal)] hover:bg-[var(--bg-surface-hover)] font-mono-label text-xs font-semibold rounded-keepeit flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>USE IN NEW CREDENTIAL</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleCopy}
              className="btn-stealth-primary flex-1 sm:flex-none px-4 py-2 bg-zinc-900 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] font-mono-label text-xs font-semibold rounded-keepeit transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-[#09090B] flex items-center justify-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'COPIED' : 'COPY PASSWORD'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

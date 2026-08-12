import React, { useState, useEffect } from 'react';
import {
  Download,
  Share,
  PlusSquare,
  X,
  Smartphone,
  Info,
  ShieldAlert,
  Check,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showIosSheet, setShowIosSheet] = useState<boolean>(false);
  const [isIosBannerDismissed, setIsIosBannerDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Check Standalone mode
    const checkStandalone = () => {
      const standaloneNav = (window.navigator as any).standalone === true;
      const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
      return standaloneNav || displayModeStandalone;
    };

    const standalone = checkStandalone();
    setIsStandalone(standalone);

    // Check iOS
    const ua = window.navigator.userAgent;
    const iosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIos(iosDevice);

    // Check if iOS banner was dismissed this session
    const dismissed = sessionStorage.getItem('keepeit_ios_banner_dismissed') === 'true';
    setIsIosBannerDismissed(dismissed);

    // Chromium install prompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIos && !isStandalone) {
      setShowIosSheet(true);
    }
  };

  const dismissIosBanner = () => {
    sessionStorage.setItem('keepeit_ios_banner_dismissed', 'true');
    setIsIosBannerDismissed(true);
  };

  return {
    deferredPrompt,
    isStandalone,
    isIos,
    isInstalled,
    showIosSheet,
    setShowIosSheet,
    isIosBannerDismissed,
    dismissIosBanner,
    triggerInstall,
    canInstallChromium: !!deferredPrompt && !isStandalone && !isInstalled,
    canInstallIos: isIos && !isStandalone,
  };
}

/**
 * iOS Install Instruction Sheet Modal
 */
export const IosInstallSheetModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[var(--bg-card)] border border-keepeit rounded-t-2xl sm:rounded-keepeit max-w-md w-full p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between border-b border-keepeit pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[var(--accent-seal)]" />
            <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
              Install KeepEit on iOS
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-keepeit"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Follow these two steps in Safari to add KeepEit to your Home Screen. This prevents Safari from automatically clearing local vault cache after 7 days of inactivity.
        </p>

        {/* Step 1 */}
        <div className="p-3 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit flex items-start gap-3">
          <div className="p-2 bg-[var(--bg-card)] border border-keepeit rounded-keepeit text-[var(--accent-seal)] shrink-0">
            <Share className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 text-xs">
            <span className="font-mono-label font-bold text-[var(--text-primary)] block">
              STEP 1: TAP SAFARI SHARE BUTTON
            </span>
            <p className="text-[var(--text-muted)] text-[11px]">
              Tap the Share button at the bottom of the Safari toolbar (or top right on iPad).
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-3 bg-[var(--bg-surface)] border border-keepeit rounded-keepeit flex items-start gap-3">
          <div className="p-2 bg-[var(--bg-card)] border border-keepeit rounded-keepeit text-[var(--accent-seal)] shrink-0">
            <PlusSquare className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 text-xs">
            <span className="font-mono-label font-bold text-[var(--text-primary)] block">
              STEP 2: SELECT 'ADD TO HOME SCREEN'
            </span>
            <p className="text-[var(--text-muted)] text-[11px]">
              Scroll down the menu and tap <strong className="text-[var(--text-primary)]">"Add to Home Screen"</strong>, then tap Add.
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2 bg-[var(--accent-seal)] text-white font-mono-label text-xs font-semibold rounded-keepeit hover:opacity-90"
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * iOS 7-Day Inactivity Data Loss Warning Banner (Above Seal Bar)
 */
export const IosDataLossBanner: React.FC<{
  onOpenInstructions: () => void;
  onDismiss: () => void;
}> = ({ onOpenInstructions, onDismiss }) => {
  return (
    <div className="bg-[var(--accent-rust)] text-white px-4 py-2.5 flex items-center justify-between gap-3 text-xs shadow-md border-t border-b border-red-700/30 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-200" />
        <span className="truncate text-[11px] font-sans">
          Safari clears app data after 7 days of inactivity. Add KeepEit to your Home Screen to keep your vault.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenInstructions}
          className="px-2.5 py-1 bg-white text-[var(--accent-rust)] font-mono-label text-[10px] font-bold rounded-keepeit hover:bg-amber-50"
        >
          HOW TO INSTALL
        </button>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-white/20 rounded-keepeit text-white"
          title="Dismiss for session"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * Universal Install Button (for Settings > About or Headers)
 */
export const InstallButton: React.FC<{
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}> = ({ className, variant = 'primary' }) => {
  const { canInstallChromium, canInstallIos, triggerInstall, isStandalone } = usePWAInstall();

  if (isStandalone || (!canInstallChromium && !canInstallIos)) {
    return null;
  }

  const baseStyle = "px-3 py-1.5 font-mono-label text-xs font-semibold rounded-keepeit flex items-center gap-1.5 transition-opacity ";
  const variantStyle =
    variant === 'primary'
      ? "bg-[var(--accent-seal)] text-white hover:opacity-90"
      : variant === 'outline'
      ? "bg-[var(--bg-card)] border border-keepeit text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
      : "bg-[var(--bg-surface)] text-[var(--accent-seal)] hover:bg-[var(--bg-surface-hover)]";

  return (
    <button
      onClick={triggerInstall}
      className={baseStyle + variantStyle + (className ? ` ${className}` : '')}
      title="Install KeepEit App"
    >
      <Download className="w-4 h-4" />
      <span>INSTALL KEEPEIT</span>
    </button>
  );
};

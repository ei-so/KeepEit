import { useEffect, useState, useCallback } from 'react';

// Global bypass flag for WebAuthn, File Inputs, and Dialogs
let isBypassActive = false;
let bypassTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Triggers a temporary bypass of the privacy shield to prevent
 * false-positive blurring when native OS dialogs (e.g., file picker, WebAuthn) appear.
 */
export function bypassPrivacyShield(durationMs: number = 3500): void {
  isBypassActive = true;
  if (typeof window !== 'undefined') {
    (window as unknown as { __keepEitPrivacyShieldBypass?: boolean }).__keepEitPrivacyShieldBypass = true;
  }
  if (bypassTimeoutId) {
    clearTimeout(bypassTimeoutId);
  }
  bypassTimeoutId = setTimeout(() => {
    isBypassActive = false;
    if (typeof window !== 'undefined') {
      (window as unknown as { __keepEitPrivacyShieldBypass?: boolean }).__keepEitPrivacyShieldBypass = false;
    }
  }, durationMs);
}

interface UsePrivacyShieldOptions {
  enabled?: boolean;
}

export function usePrivacyShield({ enabled = true }: UsePrivacyShieldOptions = {}) {
  const [isBackgrounded, setIsBackgrounded] = useState<boolean>(false);

  const applyBackgroundState = useCallback((bg: boolean) => {
    if (bg && (isBypassActive || (window as unknown as { __keepEitPrivacyShieldBypass?: boolean }).__keepEitPrivacyShieldBypass)) {
      return;
    }

    setIsBackgrounded(bg);
    if (typeof document !== 'undefined') {
      if (bg) {
        document.body.classList.add('is-backgrounded');
      } else {
        document.body.classList.remove('is-backgrounded');
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      applyBackgroundState(false);
      return;
    }

    const handleHide = () => {
      applyBackgroundState(true);
    };

    const handleShow = () => {
      applyBackgroundState(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleHide();
      } else {
        handleShow();
      }
    };

    // Global file input click listener to automatically bypass privacy shield
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'file' ||
          target.closest('input[type="file"]') ||
          target.getAttribute('data-privacy-bypass') === 'true')
      ) {
        bypassPrivacyShield(4000);
      }
    };

    window.addEventListener('blur', handleHide, { passive: true });
    window.addEventListener('focus', handleShow, { passive: true });
    window.addEventListener('pagehide', handleHide, { passive: true });
    window.addEventListener('pageshow', handleShow, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    document.addEventListener('click', handleDocumentClick, { capture: true, passive: true });

    return () => {
      window.removeEventListener('blur', handleHide);
      window.removeEventListener('focus', handleShow);
      window.removeEventListener('pagehide', handleHide);
      window.removeEventListener('pageshow', handleShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleDocumentClick, { capture: true });
    };
  }, [enabled, applyBackgroundState]);

  return {
    isBackgrounded,
    bypassPrivacyShield,
  };
}

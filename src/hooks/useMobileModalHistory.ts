import { useEffect, useRef } from 'react';

/**
 * Hook to manage history entry for modals on mobile.
 * Pushes a history entry on open so Android hardware back button closes the modal.
 */
export function useMobileModalHistory(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const stateKey = 'modal_' + Math.random().toString(36).substring(2, 7);
    window.history.pushState({ modalOpen: true, stateKey }, '');

    const handlePopState = () => {
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Clean up history state if closed manually without back button
      if (window.history.state && window.history.state.stateKey === stateKey) {
        window.history.back();
      }
    };
  }, [isOpen]);
}

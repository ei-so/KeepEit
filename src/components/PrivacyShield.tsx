import React, { useEffect } from 'react';

/**
 * PrivacyShield React Component
 * Synchronizes the background blur state with the persistent #privacy-shield
 * pre-rendered in index.html to guarantee zero DOM lag during OS app switching.
 */
export const PrivacyShield: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isVisible) {
        document.body.classList.add('is-backgrounded');
      } else {
        document.body.classList.remove('is-backgrounded');
      }
    }
  }, [isVisible]);

  // The visual element is pre-rendered in index.html as #privacy-shield
  return null;
};


import React from 'react';
import { Shield } from 'lucide-react';

export const PrivacyShield: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div
      id="app-switcher-privacy-shield"
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-neutral-950/90 backdrop-blur-3xl text-white transition-opacity duration-150 select-none pointer-events-auto"
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shadow-2xl">
          <Shield className="w-7 h-7 text-neutral-200" />
        </div>
        <p className="text-sm font-semibold tracking-wider uppercase text-neutral-400">
          Vault Protected
        </p>
      </div>
    </div>
  );
};

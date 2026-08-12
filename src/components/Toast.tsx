import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type?: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-12 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-keepeit border-keepeit bg-[var(--bg-card)] shadow-xl text-xs font-mono transition-all animate-in fade-in slide-in-from-bottom-2 ${
              toast.type === 'error'
                ? 'border-[var(--accent-rust)] text-[var(--accent-rust)]'
                : toast.type === 'info'
                ? 'border-[var(--text-muted)] text-[var(--text-primary)]'
                : 'border-[var(--accent-seal)] text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-[var(--accent-rust)] shrink-0 mt-0.5" />
              ) : toast.type === 'info' ? (
                <Info className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[var(--accent-seal)] shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed font-medium">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  detail?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, detail?: string, duration?: number) => void;
  success: (message: string, detail?: string) => void;
  error: (message: string, detail?: string) => void;
  warning: (message: string, detail?: string) => void;
  info: (message: string, detail?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const lastToastMapRef = useRef<Record<string, number>>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, detail?: string, duration = 6000) => {
      const dedupeKey = `${type}:${message}:${detail || ''}`;
      const now = Date.now();
      if (lastToastMapRef.current[dedupeKey] && now - lastToastMapRef.current[dedupeKey] < 4000) {
        // Drop duplicate toast if triggered within 4 seconds
        return;
      }
      lastToastMapRef.current[dedupeKey] = now;

      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, message, detail, duration };

      setToasts((prev) => {
        const isDuplicate = prev.some(
          (t) => t.type === type && t.message === message && t.detail === detail
        );
        if (isDuplicate) return prev;
        return [...prev.slice(-4), newToast];
      });

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, detail?: string) => showToast('success', message, detail, 4000),
    [showToast]
  );
  const error = useCallback(
    (message: string, detail?: string) => showToast('error', message, detail, 8000),
    [showToast]
  );
  const warning = useCallback(
    (message: string, detail?: string) => showToast('warning', message, detail, 6000),
    [showToast]
  );
  const info = useCallback(
    (message: string, detail?: string) => showToast('info', message, detail, 4000),
    [showToast]
  );

  const contextValue = useMemo(
    () => ({ showToast, success, error, warning, info }),
    [showToast, success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        id="toast-container"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 duration-200 ${
              toast.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-900 dark:bg-rose-950/90 dark:border-rose-800 dark:text-rose-100'
                : toast.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900 dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-100'
                : toast.type === 'warning'
                ? 'bg-amber-50/95 border-amber-200 text-amber-900 dark:bg-amber-950/90 dark:border-amber-800 dark:text-amber-100'
                : 'bg-blue-50/95 border-blue-200 text-blue-900 dark:bg-blue-950/90 dark:border-blue-800 dark:text-blue-100'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
              {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            </div>
            <div className="flex-1 text-sm">
              <p className="font-semibold">{toast.message}</p>
              {toast.detail && (
                <p className="mt-1 text-xs opacity-90 break-words leading-relaxed">{toast.detail}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Yopish"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
};

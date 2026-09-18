import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Tasdiqlash',
  cancelLabel = 'Bekor qilish',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        id="confirm-modal-box"
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                variant === 'danger'
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : variant === 'warning'
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                  : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {description}
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            id="modal-cancel-btn"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            id="modal-confirm-btn"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2.5 text-sm font-semibold rounded-xl text-white transition cursor-pointer flex items-center gap-2 disabled:opacity-50 ${
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/30'
                : variant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700 shadow-sm shadow-amber-600/30'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/30'
            }`}
          >
            {isLoading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

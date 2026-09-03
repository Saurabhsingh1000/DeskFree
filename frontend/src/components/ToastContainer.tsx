import { useEffect, useRef } from 'react';
import { useToast, type Toast } from '../context/ToastContext';

const icons = {
  success: (
    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const colorMap = {
  success: 'border-emerald-500/40 bg-surface-800/95 text-emerald-300 shadow-emerald-500/10',
  error: 'border-red-500/40 bg-surface-800/95 text-red-300 shadow-red-500/10',
  warning: 'border-amber-500/40 bg-surface-800/95 text-amber-300 shadow-amber-500/10',
  info: 'border-brand-500/40 bg-surface-800/95 text-brand-300 shadow-brand-500/10',
};

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => removeToast(toast.id), 4800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, removeToast]);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border backdrop-blur-2xl shadow-xl animate-slide-up sm:animate-slide-in-right ${colorMap[toast.type]}`}
      role="alert"
      aria-live="polite"
    >
      <span className="flex-shrink-0 mt-0.5">{icons[toast.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-bold text-white leading-snug">{toast.title}</p>
        {toast.message && <p className="text-[11px] sm:text-xs mt-0.5 text-gray-300 leading-relaxed">{toast.message}</p>}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-white p-1 transition-colors"
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm sm:w-80 ml-auto"
      aria-label="System Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

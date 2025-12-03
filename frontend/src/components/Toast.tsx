import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToastStore, type Toast as ToastType } from '../stores/toastStore';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const styles = {
  success: 'bg-success-50 border-success-200 text-success-800 dark:bg-success-900/20 dark:border-success-800 dark:text-success-300',
  error: 'bg-danger-50 border-danger-200 text-danger-800 dark:bg-danger-900/20 dark:border-danger-800 dark:text-danger-300',
  info: 'bg-primary-50 border-primary-200 text-primary-800 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-300',
  warning: 'bg-warning-50 border-warning-200 text-warning-800 dark:bg-warning-900/20 dark:border-warning-800 dark:text-warning-300',
};

const iconStyles = {
  success: 'text-success-600 dark:text-success-400',
  error: 'text-danger-600 dark:text-danger-400',
  info: 'text-primary-600 dark:text-primary-400',
  warning: 'text-warning-600 dark:text-warning-400',
};

function ToastItem({ toast }: { toast: ToastType }) {
  const [isLeaving, setIsLeaving] = useState(false);
  const removeToast = useToastStore((state) => state.removeToast);
  const Icon = icons[toast.type];

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => removeToast(toast.id), 200);
  };

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const leaveTimer = setTimeout(() => {
        setIsLeaving(true);
      }, toast.duration - 200);

      return () => clearTimeout(leaveTimer);
    }
  }, [toast.duration]);

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all duration-200 ${
        styles[toast.type]
      } ${isLeaving ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconStyles[toast.type]}`} />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}

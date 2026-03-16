import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast Container */}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          
          return (
            <div
              key={toast.id}
              className="toast-enter"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minWidth: 320,
                maxWidth: 400,
                padding: '16px 20px',
                background: '#fff',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 25px -5px rgba(15,23,42,0.15)',
                borderLeft: `4px solid ${isSuccess ? 'var(--success)' : isError ? 'var(--danger)' : 'var(--primary-500)'}`,
                border: '1px solid rgba(15,23,42,0.05)',
                borderLeftWidth: 4,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ flexShrink: 0 }}>
                {isSuccess ? <CheckCircle2 size={24} color="var(--success)" /> :
                 isError ? <AlertCircle size={24} color="var(--danger)" /> :
                 <Info size={24} color="var(--primary-500)" />}
              </div>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--neutral-800)', lineHeight: 1.4 }}>
                {toast.message}
              </div>
              <button 
                onClick={() => removeToast(toast.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.5, transition: 'opacity 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
              >
                <X size={16} color="var(--neutral-600)" />
              </button>
            </div>
          );
        })}
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

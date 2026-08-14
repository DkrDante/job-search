'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, Info, Bell } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'alert';
  title?: string;
}

interface ToastContextValue {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  alert: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [{ ...toast, id }, ...prev].slice(0, 5));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const success = useCallback((message: string, title?: string) => addToast({ type: 'success', message, title }), [addToast]);
  const error   = useCallback((message: string, title?: string) => addToast({ type: 'error',   message, title }), [addToast]);
  const info    = useCallback((message: string, title?: string) => addToast({ type: 'info',    message, title }), [addToast]);
  const alert   = useCallback((message: string, title?: string) => addToast({ type: 'alert',   message, title }), [addToast]);

  const icons = {
    success: <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />,
    error:   <AlertTriangle size={16} className="text-rose-400 flex-shrink-0" />,
    info:    <Info size={16} className="text-indigo-400 flex-shrink-0" />,
    alert:   <Bell size={16} className="text-amber-400 flex-shrink-0" />,
  };

  const colors = {
    success: 'border-emerald-500/30',
    error:   'border-rose-500/30',
    info:    'border-indigo-500/30',
    alert:   'border-amber-500/30',
  };

  return (
    <ToastContext.Provider value={{ addToast, success, error, info, alert }}>
      {children}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              className={`toast border ${colors[toast.type]}`}
            >
              <div className="flex items-start gap-3">
                {icons[toast.type]}
                <div className="flex-1 min-w-0">
                  {toast.title && (
                    <p className="text-sm font-semibold text-white mb-0.5">{toast.title}</p>
                  )}
                  <p className="text-xs text-slate-400 leading-relaxed">{toast.message}</p>
                </div>
                <button
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="btn-ghost p-1 -mr-1 -mt-1"
                >
                  <X size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

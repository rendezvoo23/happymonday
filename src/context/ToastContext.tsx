import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type React from "react";
import { createContext, useContext, useState } from "react";

interface Toast {
  id: string;
  message: string;
  category?: string;
  amount?: string;
  color?: string;
  onUndo?: () => void;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5_000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-20 left-0 right-0 z-[100] flex flex-col items-center pointer-events-none gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="pointer-events-auto bg-[var(--liquid-background-color)] backdrop-blur-md px-6 py-2.5 rounded-full shadow-sm flex items-center justify-center gap-3 min-w-[240px] relative"
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: toast.color }}
                />
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  {toast.message}
                </p>
                <p className="text-sm font-semibold">
                  {toast.category} • {toast.amount}
                </p>
              </div>
              {toast.onUndo && (
                <button
                  type="button"
                  onClick={() => {
                    toast.onUndo?.();
                    setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                  }}
                  className="ml-2 text-xs font-bold uppercase tracking-wider text-blue-400 dark:text-blue-600"
                >
                  Undo
                </button>
              )}
              {!toast.onUndo && (
                <button
                  type="button"
                  onClick={() =>
                    setToasts((prev) => prev.filter((t) => t.id !== toast.id))
                  }
                  className="absolute right-4 p-1 rounded-full hover:bg-white/10 dark:hover:bg-black/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5 opacity-40" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

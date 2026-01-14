import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type React from "react";
import { createContext, useContext, useState } from "react";

interface Toast {
  id: string;
  message: string;
  category?: string;
  amount?: string;
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
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-6 left-0 right-0 z-[100] flex flex-col items-center pointer-events-none gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="pointer-events-auto bg-black/90 dark:bg-white/90 text-white dark:text-black px-4 py-2.5 rounded-full shadow-lg flex items-center gap-3 min-w-[200px] backdrop-blur-md"
            >
              <div className="flex flex-col">
                <p className="text-xs font-medium opacity-70">
                  Transaction Added
                </p>
                <p className="text-sm font-semibold truncate">
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
                  className="ml-auto text-xs font-bold uppercase tracking-wider text-blue-400 dark:text-blue-600"
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
                  className="ml-auto"
                >
                  <X className="w-4 h-4 opacity-50" />
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

import { AnimatePresence, motion } from "framer-motion";
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
      <div
        className="fixed left-0 right-0 z-[100] flex flex-col items-center pointer-events-none gap-2"
        style={{
          top: "calc(var(--tg-ui-top-margin, 0px) + 32px)",
        }}
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto bg-[var(--liquid-background-color)] backdrop-blur-md px-4 py-3 rounded-full shadow-lg flex items-center gap-4 min-w-[260px] relative overflow-hidden"
            >
              {/* Category circle - appears first, zooms from center to position */}
              <motion.div
                className="flex-shrink-0 rounded-full origin-center"
                initial={{ scale: 3, opacity: 1 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  delay: 0.05,
                }}
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: toast.color ?? "var(--text-default)",
                }}
              />
              {/* Text content - fades in after circle zooms out */}
              <motion.div
                className="flex flex-col items-start text-left flex-1 min-w-0"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.2 }}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  {toast.message}
                </p>
                <p className="text-sm font-semibold truncate w-full">
                  {toast.category}
                  {toast.amount != null && (
                    <span className="opacity-80"> • {toast.amount}</span>
                  )}
                </p>
              </motion.div>
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

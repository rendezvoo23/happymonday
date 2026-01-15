import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type * as React from "react";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        "app-viewport relative z-10",
        "responsive-container",
        "pb-[calc(var(--safe-area-bottom)+6rem)]",
        "pt-[calc(var(--safe-area-top)+1rem)]",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

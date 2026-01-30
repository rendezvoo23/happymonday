import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type * as React from "react";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  allowScroll?: boolean;
}

export function PageShell({
  children,
  className,
  allowScroll = true,
}: PageShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        "max-w-md mx-auto relative z-10",
        allowScroll ? "min-h-screen" : "h-screen overflow-hidden",
        "pt-12", // Added top padding for system buttons/island
        className
      )}
    >
      {children}
    </motion.div>
  );
}

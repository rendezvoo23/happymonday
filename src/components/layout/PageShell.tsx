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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        "mx-auto relative z-10 h-[var(--tg-viewport-stable-height, 100%)]",
        allowScroll ? undefined : "overflow-hidden",
        "safe-area-bottom safe-area-left safe-area-right",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

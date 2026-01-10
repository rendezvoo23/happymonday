import type * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PageShellProps {
    children: React.ReactNode;
    className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={cn("min-h-screen pb-24 px-4 pt-6 max-w-md mx-auto relative z-10", className)}
        >
            {children}
        </motion.div>
    );
}


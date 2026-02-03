import { cn } from "@/lib/utils";
import { type HTMLMotionProps, motion } from "framer-motion";
import * as React from "react";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      fullWidth,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        "bg-black dark:bg-white text-white dark:text-gray-900 dark:shadow-white/10 hover:bg-gray-800 dark:hover:bg-gray-200",
      secondary:
        "bg-white dark:bg-[var(--background-level-2)] text-black dark:text-white dark:border-gray-700 border border-[var(--border-level-2)]",
      ghost:
        "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10",
      danger:
        "bg-white dark:bg-[var(--background-level-2)] text-red-500 border border-red-500 dark:border-none",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs rounded-full",
      md: "h-10 px-4 text-base rounded-full",
      lg: "h-14 px-8 text-lg rounded-full",
      icon: "h-10 w-10 p-0 rounded-full flex items-center justify-center",
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 1.1 }}
        onTap={() => {
          if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred("medium");
          }
        }}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:opacity-80",
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";

export { Button };

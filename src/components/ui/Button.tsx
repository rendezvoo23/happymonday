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
        "bg-black dark:bg-white text-white dark:text-gray-900 shadow-lg shadow-black/10 dark:shadow-white/10 hover:bg-gray-800 dark:hover:bg-gray-200",
      secondary:
        "bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
      ghost:
        "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10",
      danger:
        "bg-red-500 dark:bg-red-600 text-white shadow-lg shadow-red-500/20 dark:shadow-red-600/20 hover:bg-red-600 dark:hover:bg-red-700",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs rounded-full",
      md: "h-12 px-6 text-base rounded-full",
      lg: "h-14 px-8 text-lg rounded-full",
      icon: "h-10 w-10 p-0 rounded-full flex items-center justify-center",
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.94 }}
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

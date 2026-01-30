import { cn } from "@/lib/utils";
import { type HTMLMotionProps, motion } from "framer-motion";
import * as React from "react";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon" | "icon-sm";
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
    const isIcon = size === "icon" || size === "icon-sm";

    // Use specific classes for glassmorphism
    const wrapClass = isIcon
      ? "glassmorphic-plus-wrap"
      : "glassmorphic-button-wrap";
    const shadowClass = isIcon
      ? "glassmorphic-plus-shadow"
      : "glassmorphic-button-shadow";
    const buttonClass = isIcon
      ? "glassmorphic-plus-button"
      : "glassmorphic-button";

    return (
      <div
        className={cn(
          wrapClass,
          fullWidth && "w-full",
          size === "sm" && "scale-75 origin-center",
          size === "lg" && "scale-110 origin-center",
          size === "icon-sm" &&
            "scale-[0.65] origin-center opacity-70 hover:opacity-100 transition-opacity",
          className
        )}
        style={{
          display: fullWidth ? "block" : "inline-block",
        }}
      >
        <div className={shadowClass} />
        <motion.button
          ref={ref}
          whileTap={{ scale: 0.95 }}
          onTap={() => {
            if (window.Telegram?.WebApp?.HapticFeedback) {
              const intensity = isIcon ? "heavy" : "medium";
              window.Telegram.WebApp.HapticFeedback.impactOccurred(intensity);
            }
          }}
          className={cn(buttonClass, fullWidth && "w-full")}
          {...props}
        >
          {isIcon ? (
            <div className="plus-icon flex items-center justify-center">
              {children as React.ReactNode}
            </div>
          ) : (
            <span>{children as React.ReactNode}</span>
          )}
        </motion.button>
      </div>
    );
  }
);
Button.displayName = "Button";

export { Button };

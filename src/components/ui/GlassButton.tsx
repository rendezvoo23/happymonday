import { cn } from "@/lib/utils";
import { type HTMLMotionProps, motion } from "framer-motion";
import * as React from "react";

interface GlassButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  fullWidth?: boolean;
  children?: React.ReactNode;
  wrapperClassName?: string;
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, wrapperClassName, fullWidth, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          "glassmorphic-button-wrap",
          fullWidth && "w-full",
          wrapperClassName
        )}
      >
        <div className="glassmorphic-button-shadow" />
        <motion.button
          ref={ref}
          className={cn(
            "glassmorphic-button",
            fullWidth && "w-full",
            className
          )}
          whileTap={{ scale: 0.975 }}
          {...props}
        >
          <span>{children}</span>
        </motion.button>
      </div>
    );
  }
);
GlassButton.displayName = "GlassButton";

export { GlassButton };

import { cn } from "@/lib/utils";
import { type HTMLMotionProps, motion } from "framer-motion";
import * as React from "react";

interface CardProps extends HTMLMotionProps<"div"> {
  glass?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, glass = true, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-3xl p-6",
          glass
            ? "glass-card"
            : "bg-white dark:bg-gray-800 shadow-sm transition-colors duration-200",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
Card.displayName = "Card";

export { Card };

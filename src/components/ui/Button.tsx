import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface ButtonProps extends HTMLMotionProps<"button"> {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg" | "icon";
    fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", fullWidth, children, ...props }, ref) => {
        const variants = {
            primary: "bg-black text-white shadow-lg shadow-black/10 hover:bg-gray-800",
            secondary: "bg-white text-black shadow-sm border border-gray-200 hover:bg-gray-50",
            ghost: "bg-transparent text-gray-600 hover:bg-black/5",
            danger: "bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600",
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
                whileTap={{ scale: 0.96 }}
                className={cn(
                    "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
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

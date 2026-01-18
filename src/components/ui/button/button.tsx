import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import { motion } from "framer-motion";
import { type PropsWithChildren, forwardRef, useState } from "react";

import "./button.css";

export const buttonVariants = cva("button", {
  variants: {
    variant: {
      primary: "button__variant--primary",
      secondary: "button__variant--secondary",
      outline: "button__variant--outline",
      ghost: "button__variant--ghost",
      link: "button__variant--link",
      "link-accent": "button__variant--link-accent",
      calltoaction: "button__variant--calltoaction",
      destructive: "button__variant--destructive",
      liquid: "button__variant--liquid",
    },
    size: {
      sm: "button__size--sm",
      md: "button__size--md",
      lg: "button__size--lg",

      "icon-sm": "button__size--icon-sm",
      "icon-md": "button__size--icon-md",
      "icon-lg": "button__size--icon-lg",

      // @deprecated naming!!!
      icon: "button__size--icon-lg",
      "sm-icon": "button__size--icon-sm",
      "md-icon": "button__size--icon-md",
    },
  },
  defaultVariants: {
    variant: "secondary",
    size: "md",
  },
});

export type buttonProps = PropsWithChildren<{
  tooltip?: React.ReactNode | string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  selected?: boolean;
  rounded?: boolean;
  align?: "left" | "right" | "center";
  noEffects?: boolean;
  type?: "button" | "submit" | "reset";
  icon?: React.ReactNode;
  tabIndex?: number;
  style?: React.CSSProperties;
  className?: string;
}> &
  VariantProps<typeof buttonVariants>;

/**
 * button component
 * @param props - buttonProps
 * @returns JSX.Element
 * @example
 * ```tsx
 * <button variant="primary" size="md" onClick={() => console.log("clicked")}>
 *  Click me
 * </button>
 * ```
 */
const LiquidButton = forwardRef<HTMLButtonElement, buttonProps>(
  (
    {
      className,
      variant,
      size,
      align = "center",
      onClick,
      onBlur,
      icon,
      disabled,
      selected,
      rounded,
      noEffects,
      children,
      style,
      tabIndex,
      type = "button",
    },
    ref
  ) => {
    const [ripple, setRipple] = useState(false);
    const skipEffects = disabled || variant === "link" || noEffects;

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;

      // Calculate click position relative to button
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;

      // Set CSS custom properties for ripple position
      event.currentTarget.style.setProperty("--ripple-x", `${x}%`);
      event.currentTarget.style.setProperty("--ripple-y", `${y}%`);

      // Trigger ripple effect
      setRipple(true);
      setTimeout(() => setRipple(false), 600);
    };
    return (
      <motion.button
        disabled={disabled}
        type={type}
        tabIndex={tabIndex}
        data-size={size}
        whileHover={
          size === "lg"
            ? skipEffects
              ? undefined
              : { scale: 1.02 }
            : undefined
        }
        whileTap={skipEffects ? undefined : { scale: 0.97 }}
        className={cn(
          buttonVariants({ variant, size }),
          disabled && "button--disabled",
          selected && "button--selected",
          rounded && "button--rounded",
          align && `button--align-${align}`,
          ripple && "ripple",
          className
        )}
        ref={ref as React.Ref<HTMLButtonElement & HTMLDivElement>}
        style={style}
        onClick={disabled ? undefined : onClick}
        onMouseDown={disabled ? undefined : handleClick}
        onBlur={disabled ? undefined : onBlur}
      >
        {icon && icon !== null && icon !== undefined ? (
          <span className="button__icon">{icon}</span>
        ) : null}
        {children && <span className="button__content">{children}</span>}
      </motion.button>
    );
  }
);

LiquidButton.displayName = "LiquidButton";

export { LiquidButton };

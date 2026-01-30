import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Option {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  layoutId?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
  layoutId = "segmented-indicator",
}: SegmentedControlProps) {
  return (
    <div className={cn("flex p-1 rounded-full relative gap-1", className)}>
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            type="button"
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex-1 py-1 px-2 text-sm font-medium transition-colors z-10 rounded-full",
              isActive
                ? "text-white bg-[var(--accent-color)]"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0  rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10 whitespace-nowrap">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

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
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps) {
  return (
    <div
      className={cn("flex p-1 bg-gray-200/50 rounded-full relative", className)}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            type="button"
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex-1 py-2 text-sm font-medium transition-colors z-10",
              isActive ? "text-black" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="segmented-indicator"
                className="absolute inset-0 bg-white rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

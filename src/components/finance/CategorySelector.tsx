import { cn } from "@/lib/utils";
import type { Category, CategoryId } from "@/types";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface CategorySelectorProps {
  categories: Category[];
  selectedId: CategoryId;
  onSelect: (id: CategoryId) => void;
}

export function CategorySelector({
  categories,
  selectedId,
  onSelect,
}: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-4 py-4">
      {categories.map((category) => {
        const isSelected = selectedId === category.id;

        return (
          <div
            key={category.id}
            className="flex flex-col items-center gap-1 group"
          >
            <div
              className={cn(
                "glassmorphic-circle-wrap",
                isSelected && "selected"
              )}
              style={
                {
                  "--circle-color": category.color,
                  "--circle-size": "56px",
                } as React.CSSProperties
              }
            >
              <div className="glassmorphic-circle-shadow" />
              <button
                type="button"
                onClick={() => {
                  if (window.Telegram?.WebApp?.HapticFeedback) {
                    window.Telegram.WebApp.HapticFeedback.selectionChanged();
                  }
                  onSelect(category.id);
                }}
                className="glassmorphic-circle-btn"
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                    }}
                    className="circle-icon"
                  >
                    <Check className="w-6 h-6 text-white" strokeWidth={3} />
                  </motion.div>
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() => onSelect(category.id)}
              className={cn(
                "text-xs font-medium text-center leading-tight transition-colors duration-200 mt-1 outline-none",
                isSelected
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-gray-500"
              )}
            >
              {category.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}

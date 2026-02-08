import { useCategoryLabel } from "@/hooks/useCategoryLabel";
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
  const { getCategoryLabel } = useCategoryLabel();

  return (
    <div className="grid grid-cols-4 gap-4 mt-[8px]">
      {categories.map((category) => {
        const isSelected = selectedId === category.id;

        return (
          <button
            type="button"
            key={category.id}
            onClick={() => {
              if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred("medium");
              }
              onSelect(category.id);
            }}
            className="flex flex-col items-center gap-2 group outline-none"
          >
            <div className="relative">
              <motion.div
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
                  isSelected
                    ? "shadow-medium scale-110"
                    : "scale-100 shadow-none hover:scale-105"
                )}
                style={{ backgroundColor: category.color }}
                whileTap={{ scale: 1.2 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center rounded-full"
                  >
                    <Check className="w-6 h-6 text-white" strokeWidth={3} />
                  </motion.div>
                )}
              </motion.div>
            </div>
            <span
              className={cn(
                "text-xs font-medium text-center leading-tight transition-colors duration-200",
                isSelected
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-gray-500"
              )}
            >
              {getCategoryLabel(category.label)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

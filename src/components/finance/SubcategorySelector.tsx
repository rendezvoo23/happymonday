import type { Subcategory } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { getIconComponent } from "../icons";

interface SubcategorySelectorProps {
  subcategories: Subcategory[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  categoryColor?: string;
}

export function SubcategorySelector({
  subcategories,
  selectedId,
  onSelect,
  categoryColor = "#6B7280",
}: SubcategorySelectorProps) {
  // const { t } = useLocale();

  if (subcategories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-3 py-2">
        {subcategories.map((subcategory) => {
          const isSelected = selectedId === subcategory.id;
          return (
            <button
              type="button"
              key={subcategory.id}
              onClick={() => {
                if (window.Telegram?.WebApp?.HapticFeedback) {
                  window.Telegram.WebApp.HapticFeedback.selectionChanged();
                }
                onSelect(isSelected ? null : subcategory.id);
              }}
              className="flex flex-col items-center gap-2 group outline-none"
            >
              <div className="relative">
                <motion.div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                    isSelected
                      ? "shadow-sm scale-110"
                      : "scale-100 opacity-85 hover:opacity-100"
                  )}
                  style={{ backgroundColor: categoryColor }}
                  whileTap={{ scale: 0.9 }}
                >
                  {isSelected ? (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-white"
                    >
                      <Check strokeWidth={3} className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <div className="relative z-10 flex items-center justify-center">
                      {getIconComponent(subcategory.icon)}
                    </div>
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
                {subcategory.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

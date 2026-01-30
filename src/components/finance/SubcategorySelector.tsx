import { useLocale } from "@/context/LocaleContext";
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
  const { t } = useLocale();

  if (subcategories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-500 ml-1">
        {t("transactions.subcategoryOptional")}
      </div>
      <div className="grid grid-cols-4 gap-3 py-2">
        {subcategories.map((subcategory) => {
          const isSelected = selectedId === subcategory.id;
          return (
            <div
              key={subcategory.id}
              className="flex flex-col items-center gap-1 group"
            >
              <div
                className={cn(
                  "glassmorphic-circle-wrap",
                  isSelected && "selected"
                )}
                style={
                  {
                    "--circle-color": categoryColor,
                    "--circle-size": "48px",
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
                    onSelect(isSelected ? null : subcategory.id);
                  }}
                  className="glassmorphic-circle-btn"
                >
                  {isSelected ? (
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
                      <Check strokeWidth={3} className="w-5 h-5 text-white" />
                    </motion.div>
                  ) : (
                    <div className="circle-icon text-white/90">
                      {getIconComponent(subcategory.icon)}
                    </div>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={() => onSelect(isSelected ? null : subcategory.id)}
                className={cn(
                  "text-xs font-medium text-center leading-tight transition-colors duration-200 mt-1 outline-none",
                  isSelected
                    ? "text-gray-900 dark:text-gray-100"
                    : "text-gray-500"
                )}
              >
                {subcategory.name}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

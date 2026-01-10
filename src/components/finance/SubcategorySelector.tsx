import { getIconComponent } from "@/components/icons";
import type { Subcategory } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

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
  if (subcategories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-500 ml-1">Subcategory (Optional)</div>
      <div className="grid grid-cols-4 gap-3 py-2">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "flex flex-col items-center gap-2 group p-2 rounded-lg border-2 transition-colors",
            selectedId === null
              ? "border-gray-900 bg-gray-50"
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="text-xs font-medium text-center leading-tight">None</div>
        </button>
        {subcategories.map((subcategory) => {
          const isSelected = selectedId === subcategory.id;
          const IconComponent = getIconComponent(subcategory.icon);
          return (
            <button
              type="button"
              key={subcategory.id}
              onClick={() => onSelect(subcategory.id)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="relative">
                <motion.div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shadow-sm transition-transform",
                    isSelected ? "scale-110" : "scale-100 group-hover:scale-105"
                  )}
                  style={{ backgroundColor: categoryColor }}
                  whileTap={{ scale: 0.9 }}
                >
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-white"
                    >
                      <Check strokeWidth={3} className="w-5 h-5" />
                    </motion.div>
                  )}
                  {!isSelected && subcategory.icon && (
                    <div className="text-white text-lg flex items-center justify-center">
                      {IconComponent ? IconComponent : <span>{subcategory.icon}</span>}
                    </div>
                  )}
                </motion.div>
              </div>
              <span
                className={cn(
                  "text-xs font-medium text-center leading-tight",
                  isSelected ? "text-black" : "text-gray-500"
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

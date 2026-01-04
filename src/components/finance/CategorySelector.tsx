import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Category, CategoryId } from "@/types";
import { cn } from "@/lib/utils";

interface CategorySelectorProps {
    categories: Category[];
    selectedId: CategoryId;
    onSelect: (id: CategoryId) => void;
}

export function CategorySelector({ categories, selectedId, onSelect }: CategorySelectorProps) {
    return (
        <div className="grid grid-cols-4 gap-4 py-4">
            {categories.map((category) => {
                const isSelected = selectedId === category.id;
                return (
                    <button
                        key={category.id}
                        onClick={() => onSelect(category.id)}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="relative">
                            <motion.div
                                className={cn(
                                    "w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-transform",
                                    isSelected ? "scale-110" : "scale-100 group-hover:scale-105"
                                )}
                                style={{ backgroundColor: category.color }}
                                whileTap={{ scale: 0.9 }}
                            >
                                {isSelected && (
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="text-white"
                                    >
                                        <Check strokeWidth={3} className="w-6 h-6" />
                                    </motion.div>
                                )}
                            </motion.div>
                        </div>
                        <span className={cn(
                            "text-xs font-medium text-center leading-tight",
                            isSelected ? "text-black" : "text-gray-500"
                        )}>
                            {category.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

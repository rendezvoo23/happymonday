import { getIconComponent } from "@/components/icons";
import { cn } from "@/lib/utils";
import { getCategoryColor } from "@/stores/categoryStore";
import type { Tables } from "@/types/supabase";
import { format, parseISO } from "date-fns";
import { Edit2, Trash2 } from "lucide-react";

type Transaction = Tables<"transactions">;

interface TransactionWithCategory extends Transaction {
  categories: Pick<
    Tables<"categories">,
    "id" | "name" | "color" | "icon"
  > | null;
  subcategories: Pick<Tables<"subcategories">, "id" | "name" | "icon"> | null;
}

interface TransactionItemProps {
  transaction: TransactionWithCategory;
  onEdit: (t: TransactionWithCategory) => void;
  onDelete: (id: string) => void;
}

export function TransactionItem({
  transaction,
  onEdit,
  onDelete,
}: TransactionItemProps) {
  const category = transaction.categories;
  const subcategory = transaction.subcategories;
  const isExpense = transaction.direction === "expense";
  const categoryLabel = subcategory?.name || category?.name || "Unknown";
  const categoryColor = getCategoryColor(category?.color, category?.name);

  // Use subcategory icon if subcategoryId exists and subcategory has an icon, otherwise fall back to category icon
  const iconToUse =
    transaction.subcategory_id && subcategory?.icon
      ? subcategory.icon
      : category?.icon || null;
  const iconComponent = getIconComponent(iconToUse);

  return (
    <div className="group flex items-center justify-between p-4 bg-white/60 backdrop-blur-md rounded-2xl mb-3 shadow-sm transition-all hover:bg-white/80 ring-1 ring-black/5">
      <div className="flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm relative overflow-hidden"
          style={{ backgroundColor: categoryColor }}
        >
          {/* Glossy Effect on Circle */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
          {iconComponent ? (
            <div className="relative z-10 flex items-center justify-center">
              {iconComponent}
            </div>
          ) : (
            <span className="relative z-10">
              {subcategory ? categoryLabel.substring(0, 2).toUpperCase() : ""}
            </span>
          )}
        </div>
        <div>
          <p className="font-semibold text-gray-900 leading-tight">
            {categoryLabel}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {format(parseISO(transaction.occurred_at), "MMM d")}
            {transaction.note && ` • ${transaction.note}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span
          className={cn(
            "font-bold text-sm",
            isExpense ? "text-gray-900" : "text-green-600"
          )}
        >
          {isExpense ? "-" : "+"}${transaction.amount.toLocaleString()}
        </span>

        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(transaction)}
            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(transaction.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

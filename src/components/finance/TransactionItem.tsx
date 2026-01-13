import { MoreIcon, getIconComponent } from "@/components/icons";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import { getCategoryColor } from "@/stores/categoryStore";
import type { Tables } from "@/types/supabase";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { TransactionActionsMenu } from "./TransactionActionsMenu";

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  const { formatAmount } = useCurrency();

  return (
    <>
      <div className="group flex items-center justify-between p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl mb-3 shadow-sm transition-all hover:bg-white/80 dark:hover:bg-gray-800/80 ring-1 ring-black/5 dark:ring-white/5">
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm relative overflow-hidden"
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
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
              {categoryLabel}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5 truncate">
              {format(parseISO(transaction.occurred_at), "MMM d")}
              {transaction.note && ` • ${transaction.note}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span
            className={cn(
              "font-bold text-sm",
              isExpense
                ? "text-gray-900 dark:text-gray-100"
                : "text-green-600 dark:text-green-500"
            )}
          >
            {isExpense ? "-" : "+"}
            {formatAmount(transaction.amount)}
          </span>

          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <MoreIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <TransactionActionsMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        transaction={transaction}
        onEdit={() => onEdit(transaction)}
        onDelete={() => onDelete(transaction.id)}
      />
    </>
  );
}

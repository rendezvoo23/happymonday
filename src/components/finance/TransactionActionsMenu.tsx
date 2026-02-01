import { PencilIcon, TrashIcon } from "@/components/icons";
import { useCurrency } from "@/hooks/useCurrency";
import { useCategoryLabel } from "@/hooks/useCategoryLabel";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/supabase";
import { format, parseISO } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

type Transaction = Tables<"transactions">;

interface TransactionWithCategory extends Transaction {
  categories: Pick<
    Tables<"categories">,
    "id" | "name" | "color" | "icon"
  > | null;
  subcategories: Pick<Tables<"subcategories">, "id" | "name" | "icon"> | null;
}

interface TransactionActionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionWithCategory;
  onEdit: () => void;
  onDelete: () => void;
}

export function TransactionActionsMenu({
  isOpen,
  onClose,
  transaction,
  onEdit,
  onDelete,
}: TransactionActionsMenuProps) {
  const { formatAmount } = useCurrency();
  const { getCategoryLabel } = useCategoryLabel();

  if (typeof document === "undefined") return null;

  const isExpense = transaction.direction === "expense";
  const categoryLabel = transaction.subcategories?.name || getCategoryLabel(transaction.categories?.name);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100]"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-[110] bg-white dark:bg-gray-900 rounded-t-[32px] shadow-2xl safe-area-bottom pb-8 transition-colors duration-200"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-6">
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>

            {/* Header / Info */}
            <div className="px-6 pb-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {categoryLabel}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {transaction.occurred_at
                      ? format(
                          parseISO(transaction.occurred_at),
                          "MMMM d, yyyy"
                        )
                      : "N/A"}
                  </p>
                </div>
                <div
                  className={cn(
                    "text-xl font-bold",
                    isExpense
                      ? "text-gray-900 dark:text-gray-100"
                      : "text-green-600 dark:text-green-500"
                  )}
                >
                  {isExpense ? "-" : "+"}
                  {formatAmount(transaction.amount)}
                </div>
              </div>
              {transaction.note && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                  "{transaction.note}"
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="px-4 py-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  onEdit();
                  onClose();
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <PencilIcon className="w-5 h-5" />
                </div>
                <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Edit Transaction
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                  <TrashIcon className="w-5 h-5" />
                </div>
                <span className="text-base font-semibold text-red-600 dark:text-red-400">
                  Delete Transaction
                </span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

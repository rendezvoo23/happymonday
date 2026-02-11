import { TransactionForm } from "@/components/finance/TransactionForm";
import { useToast } from "@/context/ToastContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { getCategoryColor, useCategoryStore } from "@/stores/categoryStore";
import { useTransactionStore } from "@/stores/transactionStore";
import type { Enums } from "@/types/supabase";
import { Drawer } from "vaul";

type TransactionDirection = Enums<"transaction_direction">;

interface OnTransactionAddedData {
  amount: number;
  categoryId: string;
  subcategoryId?: string | null;
  date: string;
  type: TransactionDirection;
}

interface TransactionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TransactionDirection;
  onTransactionAdded?: (data?: OnTransactionAddedData) => void | Promise<void>;
  showEditNote?: boolean;
}

export function TransactionDrawer({
  isOpen,
  onClose,
  initialType = "expense",
  showEditNote = true,
  onTransactionAdded,
}: TransactionDrawerProps) {
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const { formatAmount } = useCurrency();
  const { showToast } = useToast();
  const { getCategoryById } = useCategoryStore();
  const { t } = useTranslation();

  const handleSubmit = async (data: {
    type: TransactionDirection;
    amount: number;
    categoryId: string;
    subcategoryId?: string | null;
    date: string;
    note: string;
  }) => {
    const category = getCategoryById(data.categoryId);

    await addTransaction({
      amount: data.amount,
      category_id: data.categoryId,
      subcategory_id: data.subcategoryId || null,
      occurred_at: data.date,
      note: data.note,
      direction: data.type,
      currency_code: "USD",
    });

    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred("success");
    }

    showToast({
      message: t("success.transactionAdded"),
      category: category?.name || t("transactions.expense"),
      color:
        getCategoryColor(category?.color, category?.name) ||
        "var(--text-default)",
      amount: formatAmount(data.amount),
    });

    // Trigger reload in parent component (optimistic update + refresh)
    await onTransactionAdded?.({
      amount: data.amount,
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId,
      date: data.date,
      type: data.type,
    });

    onClose();
  };

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      shouldScaleBackground={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/10 z-[100]" />
        <Drawer.Content
          className={cn(
            "bg-[#f5f5f7bb] dark:bg-[#161b2277] flex flex-col fixed bottom-0 left-0 right-0 max-h-[calc(100vh-80px)] rounded-t-[24px] z-[101] focus:outline-none",
            "backdrop-blur-2xl",
            "border-t border-gray-200 dark:border-gray-700"
          )}
        >
          {/* Handle - Only this area should drag the drawer */}

          {/* Content - Prevent dragging on form area */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden"
            data-vaul-no-drag
          >
            <TransactionForm
              initialType={initialType}
              onCancel={onClose}
              onSubmit={handleSubmit}
              showEditNote={showEditNote}
            />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

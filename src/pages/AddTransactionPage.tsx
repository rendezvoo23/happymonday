import { TransactionForm } from "@/components/finance/TransactionForm";
import { PageShell } from "@/components/layout/PageShell";
import { useToast } from "@/context/ToastContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useCategoryStore } from "@/stores/categoryStore";
import { useTransactionStore } from "@/stores/transactionStore";
import type { Enums } from "@/types/supabase";
import { useNavigate, useSearchParams } from "react-router-dom";

type TransactionDirection = Enums<"transaction_direction">;

export function AddTransactionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const { formatAmount } = useCurrency();
  const { showToast } = useToast();
  const { getCategoryById } = useCategoryStore();

  const initialType =
    (searchParams.get("type") as TransactionDirection) || "expense";

  return (
    <PageShell className="pb-6 pt-10">
      <TransactionForm
        initialType={initialType}
        onCancel={() => navigate(-1)}
        onSubmit={async (data) => {
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
            window.Telegram.WebApp.HapticFeedback.notificationOccurred(
              "success"
            );
          }

          showToast({
            message: "Transaction Added",
            category: category?.name || "Expense",
            amount: formatAmount(data.amount),
          });

          navigate(-1);
        }}
      />
    </PageShell>
  );
}

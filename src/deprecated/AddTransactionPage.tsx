import { TransactionForm } from "@/components/finance/TransactionForm";
import { useToast } from "@/context/ToastContext";
import { useCreateTransaction } from "@/hooks/use-transactions-query";
import { useCategoryLabel } from "@/hooks/useCategoryLabel";
import { useCurrency } from "@/hooks/useCurrency";
import { useTranslation } from "@/hooks/useTranslation";
import { useCategoryStore } from "@/stores/categoryStore";
import type { Enums } from "@/types/supabase";
import { useNavigate, useSearchParams } from "react-router-dom";

type TransactionDirection = Enums<"transaction_direction">;

export function AddTransactionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createTransactionMutation = useCreateTransaction();
  const { formatAmount } = useCurrency();
  const { showToast } = useToast();
  const { getCategoryById } = useCategoryStore();
  const { t } = useTranslation();
  const { getCategoryLabel } = useCategoryLabel();

  const initialType =
    (searchParams.get("type") as TransactionDirection) || "expense";

  return (
    <TransactionForm
      initialType={initialType}
      onCancel={() => navigate(-1)}
      onSubmit={async (data) => {
        const category = getCategoryById(data.categoryId);

        await createTransactionMutation.mutateAsync({
          amount: data.amount,
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId ?? null,
          date: data.date,
          description: data.note,
          type: data.type,
        });

        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred("success");
        }

        showToast({
          message: t("success.transactionAdded"),
          category:
            getCategoryLabel(category?.name) || t("transactions.expense"),
          amount: formatAmount(data.amount),
        });

        navigate(-1);
      }}
    />
  );
}

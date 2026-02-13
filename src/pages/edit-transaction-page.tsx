import { TransactionForm } from "@/components/finance/TransactionForm";
import { Header } from "@/components/layout/Header";
import { PageShell } from "@/components/layout/PageShell";
import { Spinner } from "@/components/spinner";
import { useDate } from "@/context/DateContext";
import {
  useTransactionById,
  useUpdateTransaction,
} from "@/hooks/use-transactions-query";
import { useTelegramBackButton } from "@/hooks/useTelegramBackButton";
import { useTranslation } from "@/hooks/useTranslation";
import type { CategoryId, TransactionType } from "@/types";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

interface EditTransactionPageProps {
  transactionId: string;
}

export function EditTransactionPage({
  transactionId,
}: EditTransactionPageProps) {
  const navigate = useNavigate();
  const { selectedDate } = useDate();
  const {
    data: transaction,
    isLoading,
    isError,
  } = useTransactionById(transactionId);
  const updateTransactionMutation = useUpdateTransaction();
  const { t } = useTranslation();

  const statsSearch = {
    month: getMonthKey(selectedDate),
    mode: "week" as const,
    category: undefined as string | undefined,
  };

  useTelegramBackButton({
    to: "/statistics",
    search: statsSearch,
  });

  if (isLoading || !transaction) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          {isLoading ? (
            <Spinner size="lg" />
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              {isError ? t("errors.generic") : "Transaction not found"}
            </p>
          )}
        </div>
      </PageShell>
    );
  }

  const formData = {
    type: transaction.direction as TransactionType,
    amount: transaction.amount,
    categoryId: transaction.category_id as CategoryId,
    subcategoryId: transaction.subcategory_id || null,
    note: transaction.note || "",
    date: transaction.occurred_at,
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <PageShell className="pb-6">
        <Header>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t("transactions.edit")}
          </h1>
        </Header>
        <main className="px-3">
          <TransactionForm
            initialData={formData}
            onCancel={() =>
              navigate({ to: "/statistics", search: statsSearch })
            }
            onSubmit={async (data) => {
              await updateTransactionMutation.mutateAsync({
                id: transaction.id,
                payload: {
                  type: data.type,
                  amount: data.amount,
                  categoryId: data.categoryId,
                  subcategoryId: data.subcategoryId ?? null,
                  note: data.note,
                  date: data.date,
                },
              });
              navigate({ to: "/statistics", search: statsSearch });
            }}
          />
        </main>
      </PageShell>
    </motion.div>
  );
}

import { TransactionForm } from "@/components/finance/TransactionForm";
import { Header } from "@/components/layout/Header";
import { PageShell } from "@/components/layout/PageShell";
import { useTelegramBackButton } from "@/hooks/useTelegramBackButton";
import { useTranslation } from "@/hooks/useTranslation";
import { useTransactionStore } from "@/stores/transactionStore";
import type { CategoryId, TransactionType } from "@/types";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface EditTransactionPageProps {
  transactionId: string;
}

export function EditTransactionPage({
  transactionId,
}: EditTransactionPageProps) {
  const navigate = useNavigate();
  const { updateTransaction, loadTransactionById, isLoading } =
    useTransactionStore();
  const [transaction, setTransaction] = useState<Awaited<
    ReturnType<typeof loadTransactionById>
  > | null>(null);
  const { t } = useTranslation();

  useTelegramBackButton({ to: "/statistics" });

  // Load the specific transaction by ID
  useEffect(() => {
    loadTransactionById(transactionId).then((data) => {
      setTransaction(data);
    });
  }, [transactionId, loadTransactionById]);

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </PageShell>
    );
  }

  if (!transaction) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-gray-500 dark:text-gray-400">
            Transaction not found
          </p>
        </div>
      </PageShell>
    );
  }

  // Map Supabase fields to form fields
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
            onCancel={() => navigate({ to: "/statistics" })}
            onSubmit={async (data) => {
              // Map form fields back to Supabase fields
              await updateTransaction(transaction.id, {
                direction: data.type,
                amount: data.amount,
                category_id: data.categoryId,
                subcategory_id: data.subcategoryId || null,
                note: data.note,
                occurred_at: data.date,
              });
              navigate({ to: "/statistics" });
            }}
          />
        </main>
      </PageShell>
    </motion.div>
  );
}

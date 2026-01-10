import { TransactionForm } from "@/components/finance/TransactionForm";
import { PageShell } from "@/components/layout/PageShell";
import { useDate } from "@/context/DateContext";
import { useTransactionStore } from "@/stores/transactionStore";
import type { CategoryId, TransactionType } from "@/types";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function EditTransactionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { transactions, updateTransaction, loadTransactions, isLoading } = useTransactionStore();
  const { selectedDate } = useDate();

  // Load transactions if not already loaded
  useEffect(() => {
    if (transactions.length === 0) {
      loadTransactions(selectedDate);
    }
  }, [transactions.length, loadTransactions, selectedDate]);

  const transaction = transactions.find((t) => t.id === id);

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-gray-500">Loading...</p>
        </div>
      </PageShell>
    );
  }

  if (!transaction) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-gray-500">Transaction not found</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-4 text-blue-600 font-medium"
          >
            Go Back
          </button>
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
    <PageShell className="pb-6">
      <header className="flex flex-col items-center pt-4 pb-6">
        <h1 className="text-xl font-semibold text-gray-900">Edit Transaction</h1>
      </header>

      <TransactionForm
        initialData={formData}
        onCancel={() => navigate(-1)}
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
          navigate(-1);
        }}
      />
    </PageShell>
  );
}

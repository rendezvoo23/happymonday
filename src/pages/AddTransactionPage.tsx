import { TransactionForm } from "@/components/finance/TransactionForm";
import { PageShell } from "@/components/layout/PageShell";
import { useTransactionStore } from "@/stores/transactionStore";
import type { Enums } from "@/types/supabase";
import { useNavigate, useSearchParams } from "react-router-dom";

type TransactionDirection = Enums<"transaction_direction">;

export function AddTransactionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addTransaction = useTransactionStore((state) => state.addTransaction);

  const initialType =
    (searchParams.get("type") as TransactionDirection) || "expense";

  return (
    <PageShell className="pb-6">
      <header className="flex flex-col items-center pt-4 pb-6">
        <h1 className="text-xl font-semibold text-gray-900">Add Transaction</h1>
      </header>

      <TransactionForm
        initialType={initialType}
        onCancel={() => navigate(-1)}
        onSubmit={async (data) => {
          await addTransaction({
            amount: data.amount,
            category_id: data.categoryId,
            occurred_at: data.date,
            note: data.note,
            direction: data.type,
            currency_code: "USD",
          });
          navigate(-1);
        }}
      />
    </PageShell>
  );
}

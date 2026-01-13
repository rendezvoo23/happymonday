import type { Tables } from "@/types/supabase";
import { TransactionItem } from "./TransactionItem";

type Transaction = Tables<"transactions">;

interface TransactionWithCategory extends Transaction {
  categories: Pick<
    Tables<"categories">,
    "id" | "name" | "color" | "icon"
  > | null;
  subcategories: Pick<Tables<"subcategories">, "id" | "name" | "icon"> | null;
}

interface TransactionListProps {
  transactions: TransactionWithCategory[];
  onEdit: (t: TransactionWithCategory) => void;
  onDelete: (id: string) => void;
  limit?: number;
  disableLimit?: boolean;
}

import { Button } from "@/components/ui/Button";
import { useNavigate } from "react-router-dom";

export function TransactionList({
  transactions,
  onEdit,
  onDelete,
  limit,
  disableLimit,
}: TransactionListProps) {
  const navigate = useNavigate();
  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        No transactions yet.
      </div>
    );
  }

  // Sort by date desc
  const sorted = [...transactions].sort(
    (a, b) =>
      new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  );

  const displayed = disableLimit || !limit ? sorted : sorted.slice(0, limit);

  return (
    <div className="w-full pb-20">
      <h3 className="text-lg font-semibold mb-4 px-1 text-gray-500">
        Recent transactions
      </h3>
      {displayed.map((t) => (
        <TransactionItem
          key={t.id}
          transaction={t}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
      {!disableLimit && limit && sorted.length > limit && (
        <Button
          variant="secondary"
          fullWidth
          className="mt-6 rounded-2xl h-12 text-blue-600 font-medium bg-white dark:bg-gray-800 border-none shadow-sm"
          onClick={() => navigate("/history")}
        >
          View all transactions
        </Button>
      )}
    </div>
  );
}

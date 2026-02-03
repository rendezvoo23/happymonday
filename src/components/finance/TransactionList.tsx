import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/hooks/useTranslation";
import type { Tables } from "@/types/supabase";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
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

export function TransactionList({
  transactions,
  onEdit,
  onDelete,
  limit,
  disableLimit,
}: TransactionListProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
        {t("transactions.noTransactions")}
      </div>
    );
  }

  // Sort by date desc
  const sorted = [...transactions].sort((a, b) => {
    const dateA = a.occurred_at ? new Date(a.occurred_at).getTime() : 0;
    const dateB = b.occurred_at ? new Date(b.occurred_at).getTime() : 0;
    return dateB - dateA;
  });

  const displayed = disableLimit || !limit ? sorted : sorted.slice(0, limit);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
      className="w-full pb-0"
    >
      <div className="card-level-1">
        {displayed.map((t, index, array) => (
          <motion.div
            key={t.id}
            variants={{
              hidden: { opacity: 0, y: 15, scale: 0.98 },
              show: { opacity: 1, y: 0, scale: 1 },
            }}
          >
            <TransactionItem
              transaction={t}
              onEdit={onEdit}
              onDelete={onDelete}
              zIndex={array.length - index}
            />
          </motion.div>
        ))}
      </div>
      {!disableLimit && limit && sorted.length > limit && (
        <motion.div
          className="w-full text-center"
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 },
          }}
        >
          <Button
            variant="ghost"
            className="mt-5"
            style={{ color: "var(--accent-color)" }}
            onClick={() => navigate({ to: "/statistics/history" })}
          >
            {t("transactions.viewAll")}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

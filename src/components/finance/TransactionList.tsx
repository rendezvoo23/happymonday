import { Button } from "@/components/ui/Button";
import { useLocale } from "@/context/LocaleContext";
import { useTranslation } from "@/hooks/useTranslation";
import type { Tables } from "@/types/supabase";
import { useNavigate } from "@tanstack/react-router";
import type { Locale } from "date-fns";
import { format } from "date-fns";
import {
  ar,
  de,
  enUS,
  es,
  fr,
  hi,
  it,
  ja,
  ko,
  pt,
  ru,
  zhCN,
} from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { TransactionItem } from "./TransactionItem";

type Transaction = Tables<"transactions">;

interface TransactionWithCategory extends Transaction {
  categories: Pick<
    Tables<"categories">,
    "id" | "name" | "color" | "icon"
  > | null;
  subcategories: Pick<Tables<"subcategories">, "id" | "name" | "icon"> | null;
}

const dateLocales: Record<string, Locale> = {
  en: enUS,
  es,
  fr,
  de,
  ru,
  zh: zhCN,
  ja,
  pt,
  it,
  ko,
  ar,
  hi,
};

function groupByYearAndMonth(
  transactions: TransactionWithCategory[],
  dateField: "occurred_at" | "updated_at"
): Map<number, Map<number, TransactionWithCategory[]>> {
  const grouped = new Map<number, Map<number, TransactionWithCategory[]>>();

  for (const t of transactions) {
    const dateStr = t[dateField];
    if (!dateStr) continue;
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();

    let yearGroup = grouped.get(year);
    if (!yearGroup) {
      yearGroup = new Map();
      grouped.set(year, yearGroup);
    }
    let monthGroup = yearGroup.get(month);
    if (!monthGroup) {
      monthGroup = [];
      yearGroup.set(month, monthGroup);
    }
    monthGroup.push(t);
  }

  return grouped;
}

interface TransactionListProps {
  transactions: TransactionWithCategory[];
  onEdit: (t: TransactionWithCategory) => void;
  onDelete: (id: string) => void;
  limit?: number;
  disableLimit?: boolean;
  groupByMonth?: boolean;
  sortBy?: "occurred_at" | "updated_at";
}

export function TransactionList({
  transactions,
  onEdit,
  onDelete,
  limit,
  disableLimit,
  groupByMonth = false,
  sortBy = "occurred_at",
}: TransactionListProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const dateLocale = dateLocales[locale] ?? enUS;

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
        {t("transactions.noTransactions")}
      </div>
    );
  }

  const sorted = [...transactions].sort((a, b) => {
    const dateA = (a[sortBy] ? new Date(a[sortBy]).getTime() : 0) as number;
    const dateB = (b[sortBy] ? new Date(b[sortBy]).getTime() : 0) as number;
    return dateB - dateA;
  });

  const displayed = disableLimit || !limit ? sorted : sorted.slice(0, limit);

  if (groupByMonth) {
    const grouped = groupByYearAndMonth(displayed, sortBy);
    const years = Array.from(grouped.keys()).sort((a, b) => b - a);

    return (
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.03 },
          },
        }}
        className="w-full pb-0 space-y-6"
      >
        {years.map((year) => {
          const yearData = grouped.get(year);
          if (!yearData) return null;
          const months = Array.from(yearData.keys()).sort((a, b) => b - a);
          return (
            <div key={year} className="space-y-3">
              <div className="px-2 text-2xl font-semibold text-gray-500 dark:text-gray-400">
                {year}
              </div>
              {months.map((month) => {
                const monthTransactions = yearData.get(month) ?? [];
                const monthDate = new Date(year, month, 1);
                const monthName = format(monthDate, "MMM", {
                  locale: dateLocale,
                });
                return (
                  <div key={`${year}-${month}`} className="space-y-1">
                    <div className="px-2 text-xl font-medium text-gray-500 dark:text-gray-400">
                      {monthName}
                    </div>
                    <div className="card-level-1">
                      <AnimatePresence mode="popLayout">
                        {monthTransactions.map((transaction, index, array) => (
                          <motion.div
                            key={transaction.id}
                            layout
                            variants={{
                              hidden: {
                                opacity: 0,
                                y: 15,
                                scale: 0.98,
                              },
                              show: {
                                opacity: 1,
                                y: 0,
                                scale: 1,
                              },
                              exit: {
                                opacity: 0,
                                height: 0,
                                overflow: "hidden",
                                transition: { duration: 0.2 },
                              },
                            }}
                            exit="exit"
                          >
                            <TransactionItem
                            transaction={transaction}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            zIndex={array.length - index}
                          />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </motion.div>
    );
  }

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
        <AnimatePresence mode="popLayout">
          {displayed.map((txn, index, array) => (
            <motion.div
              key={txn.id}
              layout
              variants={{
                hidden: { opacity: 0, y: 15, scale: 0.98 },
                show: { opacity: 1, y: 0, scale: 1 },
                exit: {
                  opacity: 0,
                  height: 0,
                  overflow: "hidden",
                  transition: { duration: 0.2 },
                },
              }}
              exit="exit"
            >
              <TransactionItem
              transaction={txn}
              onEdit={onEdit}
              onDelete={onDelete}
              zIndex={array.length - index}
            />
            </motion.div>
          ))}
        </AnimatePresence>
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

import { useLocale } from "@/context/LocaleContext";
import { useTranslation } from "@/hooks/useTranslation";
import type { Tables } from "@/types/supabase";
import type { Locale } from "date-fns";
import { format, isToday, isYesterday } from "date-fns";
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

function groupTransactionsByDay(
  transactions: TransactionWithCategory[],
  dateField: "occurred_at" | "updated_at"
): Map<string, TransactionWithCategory[]> {
  const grouped = new Map<string, TransactionWithCategory[]>();

  for (const t of transactions) {
    const dateStr = t[dateField];
    if (!dateStr) continue;
    const date = new Date(dateStr);
    const key = format(date, "yyyy-MM-dd");

    const dayGroup = grouped.get(key) ?? [];
    dayGroup.push(t);
    grouped.set(key, dayGroup);
  }

  return grouped;
}

function groupByYearMonthDay(
  transactions: TransactionWithCategory[],
  dateField: "occurred_at" | "updated_at"
): Map<number, Map<number, Map<string, TransactionWithCategory[]>>> {
  const grouped = new Map<
    number,
    Map<number, Map<string, TransactionWithCategory[]>>
  >();

  for (const t of transactions) {
    const dateStr = t[dateField];
    if (!dateStr) continue;
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();
    const dateKey = format(date, "yyyy-MM-dd");

    let yearGroup = grouped.get(year);
    if (!yearGroup) {
      yearGroup = new Map();
      grouped.set(year, yearGroup);
    }
    let monthGroup = yearGroup.get(month);
    if (!monthGroup) {
      monthGroup = new Map();
      yearGroup.set(month, monthGroup);
    }
    const dayGroup = monthGroup.get(dateKey) ?? [];
    dayGroup.push(t);
    monthGroup.set(dateKey, dayGroup);
  }

  return grouped;
}

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
  groupByDay?: boolean;
  /** When true with groupByMonth, show days within each month */
  groupByDayInMonth?: boolean;
  sortBy?: "occurred_at" | "updated_at";
}

export function TransactionList({
  transactions,
  onEdit,
  onDelete,
  limit,
  disableLimit,
  groupByMonth = false,
  groupByDay = false,
  groupByDayInMonth = false,
  sortBy = "occurred_at",
}: TransactionListProps) {
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

  if (groupByMonth && groupByDayInMonth) {
    const grouped = groupByYearMonthDay(displayed, sortBy);
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
                const monthDays = yearData.get(month);
                if (!monthDays) return null;
                const monthDate = new Date(year, month, 1);
                const monthName = format(monthDate, "MMM", {
                  locale: dateLocale,
                });
                const dayKeys = Array.from(monthDays.keys()).sort((a, b) =>
                  b.localeCompare(a)
                );
                return (
                  <div key={`${year}-${month}`} className="space-y-3">
                    <div className="px-2 text-xl font-medium text-gray-500 dark:text-gray-400">
                      {monthName}
                    </div>
                    {dayKeys.map((dateKey) => {
                      const dayTransactions = monthDays.get(dateKey) ?? [];
                      const [y, m, d] = dateKey.split("-").map(Number);
                      const dayDate = new Date(y, m - 1, d);
                      const dayLabel = isToday(dayDate)
                        ? t("date.today")
                        : isYesterday(dayDate)
                          ? t("date.yesterday")
                          : format(dayDate, "EEEE, MMM d", {
                              locale: dateLocale,
                            });
                      return (
                        <div key={dateKey} className="space-y-1">
                          <div className="px-2 text-lg font-normal opacity-70 py-1">
                            {dayLabel}
                          </div>
                          <div className="card-level-1">
                            <AnimatePresence mode="popLayout">
                              {dayTransactions.map(
                                (transaction, index, array) => (
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
                                )
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </motion.div>
    );
  }

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

  if (groupByDay) {
    const grouped = groupTransactionsByDay(displayed, sortBy);
    const dayKeys = Array.from(grouped.keys()).sort((a, b) =>
      b.localeCompare(a)
    );

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
        {dayKeys.map((dayKey) => {
          const dayTransactions = grouped.get(dayKey) ?? [];
          const [y, m, d] = dayKey.split("-").map(Number);
          const dayDate = new Date(y, m - 1, d);
          const dayLabel = isToday(dayDate)
            ? t("date.today")
            : isYesterday(dayDate)
              ? t("date.yesterday")
              : format(dayDate, "EEEE, MMM d", { locale: dateLocale });

          return (
            <div key={dayKey} className="space-y-3">
              <div className="px-2 text-xl font-medium text-gray-500 dark:text-gray-400">
                {dayLabel}
              </div>
              <div className="card-level-1">
                <AnimatePresence mode="popLayout">
                  {dayTransactions.map((transaction, index, array) => (
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
    </motion.div>
  );
}

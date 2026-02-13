import {
  createTransaction,
  deleteTransaction,
  getMonthSummary,
  getSpendByCategory,
  getTransactionById,
  listTransactions,
  listTransactionsForHistory,
  listTransactionsWithCategories,
  updateTransaction,
} from "@/lib/api";
import type { Transaction, TransactionType } from "@/types";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { endOfMonth, format, startOfMonth } from "date-fns";

const DEFAULT_STALE_TIME = 1000 * 60 * 5; // 5 minutes

// Query keys
export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (fromISO: string, toISO: string) =>
    [...transactionKeys.lists(), { fromISO, toISO }] as const,
  detail: (id: string) => [...transactionKeys.all, "detail", id] as const,
  history: (sortBy: string) =>
    [...transactionKeys.all, "history", sortBy] as const,
  summary: (fromISO: string, toISO: string) =>
    [...transactionKeys.all, "summary", { fromISO, toISO }] as const,
  spendByCategory: (fromISO: string, toISO: string) =>
    [...transactionKeys.all, "spend-by-category", { fromISO, toISO }] as const,
};

// Hook to fetch transactions for a date range
export function useTransactions(fromISO: string, toISO: string) {
  return useQuery({
    queryKey: transactionKeys.list(fromISO, toISO),
    queryFn: () => listTransactions(fromISO, toISO),
    staleTime: DEFAULT_STALE_TIME,
  });
}

// Hook to fetch transactions for a specific month
export function useMonthTransactions(date: Date) {
  const fromISO = format(startOfMonth(date), "yyyy-MM-dd'T'00:00:00");
  const toISO = format(endOfMonth(date), "yyyy-MM-dd'T'23:59:59");

  return useTransactions(fromISO, toISO);
}

// Hook to fetch transactions with full category and subcategory data
export function useMonthTransactionsWithCategories(date: Date) {
  const fromISO = format(startOfMonth(date), "yyyy-MM-dd'T'00:00:00");
  const toISO = format(endOfMonth(date), "yyyy-MM-dd'T'23:59:59");

  return useQuery({
    queryKey: [...transactionKeys.list(fromISO, toISO), "with-categories"],
    queryFn: () => listTransactionsWithCategories(fromISO, toISO),
    staleTime: DEFAULT_STALE_TIME,
  });
}

// Hook to fetch month summary
export function useMonthSummary(date: Date) {
  const fromISO = format(startOfMonth(date), "yyyy-MM-dd'T'00:00:00");
  const toISO = format(endOfMonth(date), "yyyy-MM-dd'T'23:59:59");

  return useQuery({
    queryKey: transactionKeys.summary(fromISO, toISO),
    queryFn: () => getMonthSummary(fromISO, toISO),
    staleTime: DEFAULT_STALE_TIME,
  });
}

// Hook to fetch spend by category
export function useSpendByCategory(date: Date) {
  const fromISO = format(startOfMonth(date), "yyyy-MM-dd'T'00:00:00");
  const toISO = format(endOfMonth(date), "yyyy-MM-dd'T'23:59:59");

  return useQuery({
    queryKey: transactionKeys.spendByCategory(fromISO, toISO),
    queryFn: () => getSpendByCategory(fromISO, toISO),
    staleTime: DEFAULT_STALE_TIME,
  });
}

// Hook to create a transaction
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      amount: number;
      categoryId: string;
      subcategoryId?: string | null;
      date: string;
      description?: string;
      type: TransactionType;
    }) => createTransaction(payload),
    onSuccess: () => {
      // Invalidate all transaction queries
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

// Hook to fetch a single transaction by ID
export function useTransactionById(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: transactionKeys.detail(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("Transaction ID required");
      return getTransactionById(id);
    },
    enabled: !!id && enabled,
  });
}

// Hook for infinite history list
export function useHistoryTransactions(
  sortBy: "occurred_at" | "updated_at" = "occurred_at",
  pageSize = 20
) {
  return useInfiniteQuery({
    queryKey: transactionKeys.history(sortBy),
    queryFn: ({ pageParam }) =>
      listTransactionsForHistory(pageParam, pageSize, sortBy),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length : undefined,
  });
}

// Hook to delete a transaction
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

// Hook to update a transaction
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: { id: string; payload: Partial<Transaction> }) =>
      updateTransaction(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

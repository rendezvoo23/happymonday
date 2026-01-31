import {
  createTransaction,
  deleteTransaction,
  getMonthSummary,
  getSpendByCategory,
  listTransactions,
  listTransactionsWithCategories,
  updateTransaction,
} from "@/lib/api";
import type { Transaction, TransactionType } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endOfMonth, format, startOfMonth } from "date-fns";

// Query keys
export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (fromISO: string, toISO: string) =>
    [...transactionKeys.lists(), { fromISO, toISO }] as const,
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
    staleTime: 1000 * 60 * 5, // 5 minutes
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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to fetch month summary
export function useMonthSummary(date: Date) {
  const fromISO = format(startOfMonth(date), "yyyy-MM-dd'T'00:00:00");
  const toISO = format(endOfMonth(date), "yyyy-MM-dd'T'23:59:59");

  return useQuery({
    queryKey: transactionKeys.summary(fromISO, toISO),
    queryFn: () => getMonthSummary(fromISO, toISO),
    staleTime: 1000 * 60 * 5,
  });
}

// Hook to fetch spend by category
export function useSpendByCategory(date: Date) {
  const fromISO = format(startOfMonth(date), "yyyy-MM-dd'T'00:00:00");
  const toISO = format(endOfMonth(date), "yyyy-MM-dd'T'23:59:59");

  return useQuery({
    queryKey: transactionKeys.spendByCategory(fromISO, toISO),
    queryFn: () => getSpendByCategory(fromISO, toISO),
    staleTime: 1000 * 60 * 5,
  });
}

// Hook to create a transaction
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      amount: number;
      categoryId: string;
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

import { endOfMonth, startOfMonth } from "date-fns";
import { create } from "zustand";
import { supabase } from "../lib/supabaseClient";
import type { Tables, TablesInsert, TablesUpdate } from "../types/supabase";

// Types from Supabase schema
type Transaction = Tables<"transactions">;
type TransactionInsert = TablesInsert<"transactions">;
type TransactionUpdate = TablesUpdate<"transactions">;

// Extended type with joined category and subcategory
type TransactionWithCategory = Transaction & {
  categories: Pick<
    Tables<"categories">,
    "id" | "name" | "color" | "icon"
  > | null;
  subcategories: Pick<Tables<"subcategories">, "id" | "name" | "icon"> | null;
};

interface TransactionState {
  transactions: TransactionWithCategory[];
  historyTransactions: TransactionWithCategory[]; // Separate list for full history
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTransactions: (date: Date) => Promise<TransactionWithCategory[]>;
  loadHistory: (
    page: number,
    pageSize: number
  ) => Promise<{ hasMore: boolean }>;
  addTransaction: (
    transaction: Omit<TransactionInsert, "user_id">
  ) => Promise<void>;
  updateTransaction: (id: string, updates: TransactionUpdate) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Computed helpers
  getBalance: () => number;
  getTotalIncome: () => number;
  getTotalExpenses: () => number;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  historyTransactions: [],
  isLoading: false,
  error: null,

  loadTransactions: async (date: Date) => {
    set({ isLoading: true, error: null });
    try {
      const start = startOfMonth(date).toISOString();
      const end = endOfMonth(date).toISOString();

      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
                    *,
                    categories (
                        id,
                        name,
                        color,
                        icon
                    ),
                    subcategories (
                        id,
                        name,
                        icon
                    )
                `
        )
        .gte("occurred_at", start)
        .lt("occurred_at", end)
        .is("deleted_at", null)
        .order("occurred_at", { ascending: false });

      if (error) throw error;
      const transactions = data || [];
      set({ transactions, isLoading: false });
      return transactions;
    } catch (err: unknown) {
      console.error("Failed to load transactions", err);
      set({
        error:
          err instanceof Error ? err.message : "Failed to load transactions",
        isLoading: false,
      });
      return [];
    }
  },

  loadHistory: async (page: number, pageSize: number) => {
    // optimize: do not set global loading if it's pagination?
    // User wants "no long loading time", so we rely on appending.
    if (page === 0)
      set({ isLoading: true, error: null, historyTransactions: [] });
    else set({ isLoading: true, error: null }); // Keep existing history

    try {
      const start = page * pageSize;
      const end = start + pageSize - 1;

      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
                    *,
                    categories (
                        id,
                        name,
                        color,
                        icon
                    ),
                    subcategories (
                        id,
                        name,
                        icon
                    )
                `
        )
        .is("deleted_at", null)
        .order("occurred_at", { ascending: false })
        .range(start, end);

      if (error) throw error;

      const newTransactions = data || [];
      const hasMore = newTransactions.length === pageSize;

      set((state) => ({
        historyTransactions:
          page === 0
            ? newTransactions
            : [...state.historyTransactions, ...newTransactions],
        isLoading: false,
      }));

      return { hasMore };
    } catch (err: unknown) {
      console.error("Failed to load history", err);
      set({
        error: err instanceof Error ? err.message : "Failed to load history",
        isLoading: false,
      });
      return { hasMore: false };
    }
  },

  addTransaction: async (transaction) => {
    set({ isLoading: true, error: null });
    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError) throw userError;

      const { error } = await supabase.from("transactions").insert({
        ...transaction,
        user_id: userData.user.id,
      });

      if (error) throw error;

      // Reload for the month of the new transaction
      const date = new Date(transaction.occurred_at);
      await get().loadTransactions(date);
    } catch (err: unknown) {
      console.error("Failed to add transaction", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to add transaction";
      set({ error: errorMessage, isLoading: false });
      throw err;
    }
  },

  updateTransaction: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from("transactions")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      // Optimistic update
      set((state) => ({
        transactions: state.transactions.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
        isLoading: false,
      }));
    } catch (err: unknown) {
      console.error("Failed to update transaction", err);
      set({
        error:
          err instanceof Error ? err.message : "Failed to update transaction",
        isLoading: false,
      });
    }
  },

  deleteTransaction: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // Soft delete
      const { error } = await supabase
        .from("transactions")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      // Remove from local state
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
        isLoading: false,
      }));
    } catch (err: unknown) {
      console.error("Failed to delete transaction", err);
      set({
        error:
          err instanceof Error ? err.message : "Failed to delete transaction",
        isLoading: false,
      });
    }
  },

  getBalance: () => {
    const { transactions } = get();
    return transactions.reduce((acc, t) => {
      return t.direction === "income" ? acc + t.amount : acc - t.amount;
    }, 0);
  },

  getTotalIncome: () => {
    const { transactions } = get();
    return transactions
      .filter((t) => t.direction === "income")
      .reduce((acc, t) => acc + t.amount, 0);
  },

  getTotalExpenses: () => {
    const { transactions } = get();
    return transactions
      .filter((t) => t.direction === "expense")
      .reduce((acc, t) => acc + t.amount, 0);
  },
}));

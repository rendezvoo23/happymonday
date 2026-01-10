import type { Category, CategoryId, Transaction, TransactionType } from "../types";
import { supabase } from "./supabaseClient";

// Database Row Interfaces

interface DbCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: "expense" | "income";
  sort_order: number;
}

interface DbTransactionRow {
  id: string;
  type: TransactionType;
  amount: number;
  category_id: string;
  occurred_at: string;
  description: string | null;
}

interface DbTransactionWithCategory extends DbTransactionRow {
  categories: {
    id: string;
    label?: string;
    name?: string;
    color: string | null;
    icon: string | null;
  } | null;
}

interface DbTransactionForSpend {
  amount: number;
  category_id: string;
  categories: {
    name: string;
    color: string | null;
  } | null;
}

// 1. Settings
export const getSettings = async () => {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .single();

  if (error) throw error;
  return data;
};

// 2. Categories
export const getCategories = async (
  type: TransactionType
): Promise<Category[]> => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("type", type)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  // Map DB category to Frontend Category
  // Note: Frontend uses specific string literals for IDs in types/index.ts.
  // We assume the DB IDs match these or we might need to adjust the frontend types to allow string.
  return (data || []).map((c: DbCategory) => ({
    id: c.id as CategoryId,
    label: c.name,
    color: c.color || "#6B7280",
    icon: c.icon || undefined,
    type: c.type,
  }));
};

// 2.1. Subcategories
export interface Subcategory {
  id: string;
  name: string;
  icon: string | null;
  category_id: string;
  user_id: string | null;
}

export const getSubcategories = async (
  categoryId: string
): Promise<Subcategory[]> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const { data, error } = await supabase
    .from("subcategories")
    .select("*")
    .eq("category_id", categoryId)
    .or(`user_id.is.null,user_id.eq.${userData.user.id}`)
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
};

// 3. Create Transaction
export const createTransaction = async (payload: {
  amount: number;
  categoryId: string;
  date: string; // ISO
  description?: string;
  type: TransactionType;
}) => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const { error } = await supabase.from("transactions").insert({
    user_id: userData.user.id,
    amount: payload.amount,
    category_id: payload.categoryId,
    occurred_at: payload.date,
    note: payload.description || "",
    direction: payload.type,
    currency_code: "USD", // Defaulting to USD as per context constraints or lack thereof
  });

  if (error) throw error;
};

// 4. List Transactions
export const listTransactions = async (
  fromISO: string,
  toISO: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      *,
      categories (
        id,
        label,
        color,
        icon
      )
    `
    )
    .gte("occurred_at", fromISO)
    .lt("occurred_at", toISO)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((t: DbTransactionWithCategory) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    categoryId: t.category_id as CategoryId,
    date: t.occurred_at,
    note: t.description || "",
    // We could attach category details if the frontend needed them inline,
    // but the Transaction interface primarily uses categoryId.
  }));
};

// 5. Month Summary
export const getMonthSummary = async (fromISO: string, toISO: string) => {
  // Supabase/PostgreSQL aggregation
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, direction")
    .gte("occurred_at", fromISO)
    .lt("occurred_at", toISO)
    .is("deleted_at", null);

  if (error) throw error;

  const summary = {
    income: 0,
    expense: 0,
  };

  data?.forEach((t: { amount: number; direction: string }) => {
    if (t.direction === "income") summary.income += t.amount;
    else if (t.direction === "expense") summary.expense += t.amount;
  });

  return summary;
};

// 6. Spend by Category
export const getSpendByCategory = async (fromISO: string, toISO: string) => {
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, category_id, categories(name, color)")
    .eq("direction", "expense")
    .gte("occurred_at", fromISO)
    .lt("occurred_at", toISO)
    .is("deleted_at", null);

  if (error) throw error;

  const grouped: Record<
    string,
    { amount: number; label: string; color: string }
  > = {};

  data?.forEach((t: DbTransactionForSpend) => {
    const catId = t.category_id;
    if (!grouped[catId]) {
      grouped[catId] = {
        amount: 0,
        label: t.categories?.name || "Unknown",
        color: t.categories?.color || "#000000",
      };
    }
    grouped[catId].amount += t.amount;
  });

  return Object.entries(grouped).map(([id, val]) => ({
    categoryId: id,
    ...val,
  }));
};

export const deleteTransaction = async (id: string) => {
  // Soft delete
  const { error } = await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
};

export const updateTransaction = async (
  id: string,
  payload: Partial<Transaction>
) => {
  // Map frontend fields to DB fields if necessary
  const dbPayload: {
    amount?: number;
    category_id?: string;
    occurred_at?: string;
    description?: string;
    type?: TransactionType;
  } = {};
  if (payload.amount !== undefined) dbPayload.amount = payload.amount;
  if (payload.categoryId !== undefined)
    dbPayload.category_id = payload.categoryId;
  if (payload.date !== undefined) dbPayload.occurred_at = payload.date;
  if (payload.note !== undefined) dbPayload.description = payload.note;
  if (payload.type !== undefined) dbPayload.type = payload.type;

  const { error } = await supabase
    .from("transactions")
    .update(dbPayload)
    .eq("id", id);

  if (error) throw error;
};

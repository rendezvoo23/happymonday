import { create } from "zustand";
import { supabase } from "../lib/supabaseClient";
import type { Category, TransactionType } from "../types";
import type { Enums, Tables } from "../types/supabase";

type SupabaseCategory = Tables<"categories">;
type TransactionDirection = Enums<"transaction_direction">;

// Apple iCard color map for category names
export const CATEGORY_COLOR_MAP: Record<string, string> = {
  "Food & Drink": "#FF9F0A", // Orange
  Shopping: "#FFD60A", // Yellow
  Travel: "#30D158", // Green
  Transport: "#0A84FF", // Blue
  Services: "#BF5AF2", // Purple
  Fun: "#FF375F", // Pink
  Health: "#FF453A", // Red
};

// Helper function to get category color with fallback
export const getCategoryColor = (
  color: string | null | undefined,
  categoryName: string | null | undefined
): string => {
  return color || CATEGORY_COLOR_MAP[categoryName || ""] || "#8E8E93";
};

interface CategoryState {
  categories: SupabaseCategory[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadCategories: (type?: TransactionDirection) => Promise<void>;
  getCategoryById: (id: string) => SupabaseCategory | undefined;

  // Helper methods to transform Supabase categories to UI format
  getCategoriesForType: (type: TransactionType) => Category[];
  getExpenseCategories: () => Category[];
  getIncomeCategories: () => Category[];
}

// Transform Supabase category to UI Category format
const transformCategory = (cat: SupabaseCategory): Category => {
  return {
    id: cat.id,
    label: cat.name,
    color: getCategoryColor(cat.color, cat.name),
    icon: cat.icon || undefined,
    type: cat.type as TransactionType,
  };
};

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,

  loadCategories: async (type) => {
    set({ isLoading: true, error: null });
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      let query = supabase
        .from("categories")
        .select("*")
        .eq("is_archived", false)
        .order("sort_order", { ascending: true });

      // Filter by user: include user-specific categories and global categories (user_id is null)
      if (userData?.user?.id) {
        query = query.or(`user_id.eq.${userData.user.id},user_id.is.null`);
      } else {
        // If no user, only get global categories
        query = query.is("user_id", null);
      }

      if (type) {
        query = query.eq("type", type);
      }

      const { data, error } = await query;

      if (error) throw error;
      set({ categories: data || [], isLoading: false });
    } catch (err: unknown) {
      console.error("Failed to load categories", err);
      set({
        error: err instanceof Error ? err.message : "Failed to load categories",
        isLoading: false,
      });
    }
  },

  getCategoryById: (id) => {
    return get().categories.find((c) => c.id === id);
  },

  getCategoriesForType: (type: TransactionType) => {
    const { categories } = get();
    return categories.filter((c) => c.type === type).map(transformCategory);
  },

  getExpenseCategories: () => {
    return get().getCategoriesForType("expense");
  },

  getIncomeCategories: () => {
    return get().getCategoriesForType("income");
  },
}));

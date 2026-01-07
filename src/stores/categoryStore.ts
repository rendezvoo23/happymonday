import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import type { Tables, Enums } from '../types/supabase';

type Category = Tables<'categories'>;
type TransactionDirection = Enums<'transaction_direction'>;

interface CategoryState {
    categories: Category[];
    isLoading: boolean;
    error: string | null;

    // Actions
    loadCategories: (type?: TransactionDirection) => Promise<void>;
    getCategoryById: (id: string) => Category | undefined;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
    categories: [],
    isLoading: false,
    error: null,

    loadCategories: async (type) => {
        set({ isLoading: true, error: null });
        try {
            let query = supabase
                .from('categories')
                .select('*')
                .eq('is_archived', false)
                .order('sort_order', { ascending: true });

            if (type) {
                query = query.eq('type', type);
            }

            const { data, error } = await query;

            if (error) throw error;
            set({ categories: data || [], isLoading: false });
        } catch (err: any) {
            console.error('Failed to load categories', err);
            set({ error: err.message, isLoading: false });
        }
    },

    getCategoryById: (id) => {
        return get().categories.find((c) => c.id === id);
    },
}));


import { supabase } from './supabaseClient';
import { Transaction, TransactionType, Category, CategoryId } from '../types';

// Database Row Interfaces

interface DbCategory {
    id: string;
    label: string;
    icon: string | null;
    color: string;
    type: TransactionType;
    sort_order: number;
}

// 1. Settings
export const getSettings = async () => {
    const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .single();

    if (error) throw error;
    return data;
};

// 2. Categories
export const getCategories = async (type: TransactionType): Promise<Category[]> => {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('type', type)
        .order('sort_order', { ascending: true });

    if (error) throw error;

    // Map DB category to Frontend Category
    // Note: Frontend uses specific string literals for IDs in types/index.ts.
    // We assume the DB IDs match these or we might need to adjust the frontend types to allow string.
    return (data || []).map((c: DbCategory) => ({
        id: c.id as CategoryId, // Casting assuming DB ids match frontend known IDs
        label: c.label,
        color: c.color,
        icon: c.icon || undefined,
        type: c.type,
    }));
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

    const { error } = await supabase
        .from('transactions')
        .insert({
            user_id: userData.user.id,
            amount: payload.amount,
            category_id: payload.categoryId,
            occurred_at: payload.date,
            description: payload.description || '',
            type: payload.type,
            currency: 'USD', // Defaulting to USD as per context constraints or lack thereof
        });

    if (error) throw error;
};

// 4. List Transactions
export const listTransactions = async (fromISO: string, toISO: string): Promise<Transaction[]> => {
    const { data, error } = await supabase
        .from('transactions')
        .select(`
      *,
      categories (
        id,
        label,
        color,
        icon
      )
    `)
        .gte('occurred_at', fromISO)
        .lt('occurred_at', toISO)
        .is('deleted_at', null)
        .order('occurred_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((t: any) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        categoryId: t.category_id as CategoryId,
        date: t.occurred_at,
        note: t.description,
        // We could attach category details if the frontend needed them inline, 
        // but the Transaction interface primarily uses categoryId.
    }));
};

// 5. Month Summary
export const getMonthSummary = async (fromISO: string, toISO: string) => {
    // Supabase/PostgreSQL aggregation
    const { data, error } = await supabase
        .from('transactions')
        .select('amount, type')
        .gte('occurred_at', fromISO)
        .lt('occurred_at', toISO)
        .is('deleted_at', null);

    if (error) throw error;

    const summary = {
        income: 0,
        expense: 0,
    };

    data?.forEach((t: { amount: number; type: string }) => {
        if (t.type === 'income') summary.income += t.amount;
        else if (t.type === 'expense') summary.expense += t.amount;
    });

    return summary;
};

// 6. Spend by Category
export const getSpendByCategory = async (fromISO: string, toISO: string) => {
    const { data, error } = await supabase
        .from('transactions')
        .select('amount, category_id, categories(label, color)')
        .eq('type', 'expense')
        .gte('occurred_at', fromISO)
        .lt('occurred_at', toISO)
        .is('deleted_at', null);

    if (error) throw error;

    const grouped: Record<string, { amount: number; label: string; color: string }> = {};

    data?.forEach((t: any) => {
        const catId = t.category_id;
        if (!grouped[catId]) {
            grouped[catId] = {
                amount: 0,
                label: t.categories?.label || 'Unknown',
                color: t.categories?.color || '#000000',
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
        .from('transactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

    if (error) throw error;
};

export const updateTransaction = async (id: string, payload: Partial<Transaction>) => {
    // Map frontend fields to DB fields if necessary
    const dbPayload: any = {};
    if (payload.amount !== undefined) dbPayload.amount = payload.amount;
    if (payload.categoryId !== undefined) dbPayload.category_id = payload.categoryId;
    if (payload.date !== undefined) dbPayload.occurred_at = payload.date;
    if (payload.note !== undefined) dbPayload.description = payload.note;
    if (payload.type !== undefined) dbPayload.type = payload.type;

    const { error } = await supabase
        .from('transactions')
        .update(dbPayload)
        .eq('id', id);

    if (error) throw error;
};

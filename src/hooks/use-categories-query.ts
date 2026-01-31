import { useQuery } from '@tanstack/react-query';
import { getCategories, getSubcategories } from '@/lib/api';
import type { TransactionType } from '@/types';

// Query keys
export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (type: TransactionType) => [...categoryKeys.lists(), { type }] as const,
  subcategories: (categoryId: string) =>
    [...categoryKeys.all, 'subcategories', categoryId] as const,
};

// Hook to fetch categories by type
export function useCategories(type: TransactionType) {
  return useQuery({
    queryKey: categoryKeys.list(type),
    queryFn: () => getCategories(type),
    staleTime: 1000 * 60 * 30, // 30 minutes - categories don't change often
  });
}

// Hook to fetch expense categories
export function useExpenseCategories() {
  return useCategories('expense');
}

// Hook to fetch income categories
export function useIncomeCategories() {
  return useCategories('income');
}

// Hook to fetch subcategories for a category
export function useSubcategories(categoryId: string, enabled = true) {
  return useQuery({
    queryKey: categoryKeys.subcategories(categoryId),
    queryFn: () => getSubcategories(categoryId),
    staleTime: 1000 * 60 * 30,
    enabled: enabled && !!categoryId,
  });
}

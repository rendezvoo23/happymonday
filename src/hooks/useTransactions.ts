
import { useState, useCallback } from 'react';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { Transaction } from '../types';
import * as api from '../lib/api';

export function useTransactions() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadTransactions = useCallback(async (date: Date) => {
        setIsLoading(true);
        setError(null);
        try {
            const start = startOfMonth(date);
            const end = endOfMonth(date);
            const data = await api.listTransactions(start.toISOString(), end.toISOString());
            setTransactions(data);
        } catch (err: any) {
            console.error('Failed to load transactions', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>) => {
        setIsLoading(true);
        setError(null);
        try {
            await api.createTransaction({
                amount: transaction.amount,
                categoryId: transaction.categoryId,
                date: transaction.date,
                description: transaction.note,
                type: transaction.type
            });
            // Optionally reload transactions for the month of the added transaction
            // But for now we might rely on the caller or just add it locally if we want optimistic UI
            // simpler to just reload or let the user navigate back and reload
            const date = parseISO(transaction.date);
            await loadTransactions(date);
        } catch (err: any) {
            console.error('Failed to add transaction', err);
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [loadTransactions]);

    const deleteTransaction = useCallback(async (id: string) => {
        setIsLoading(true);
        try {
            await api.deleteTransaction(id);
            // Remove from local state immediately for UI responsiveness
            setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (err: any) {
            console.error('Failed to delete transaction', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
        setIsLoading(true);
        try {
            await api.updateTransaction(id, updates);
            // Optimistic update or reload?
            // Simple: reload. Or map.
            // Mapping is faster.
            setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
        } catch (err: any) {
            console.error('Failed to update transaction', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);


    // Helper for synchornisous filtering if we have loaded data? 
    // The previous getTransactionsByMonth filtered the *entire* local history.
    // Now we likely only load one month at a time in `transactions`.
    // So `transactions` IS the monthly view effectively if used with `loadTransactions`.
    // We can keep specific helpers if needed.

    const getBalance = () => {
        return transactions.reduce((acc, t) => {
            return t.type === 'income' ? acc + t.amount : acc - t.amount;
        }, 0);
    };

    const getTotalIncome = () => {
        return transactions
            .filter(t => t.type === 'income')
            .reduce((acc, t) => acc + t.amount, 0);
    };

    const getTotalExpenses = () => {
        return transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => acc + t.amount, 0);
    };

    return {
        transactions,
        isLoading,
        error,
        loadTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        getBalance,
        getTotalIncome,
        getTotalExpenses
    };
}

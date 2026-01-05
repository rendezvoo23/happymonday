
import { v4 as uuidv4 } from 'uuid';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { Transaction } from '../types';
import { useLocalStorage } from './useLocalStorage';

export function useTransactions() {
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('finance-pwa-transactions', []);

    const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
        const newTransaction: Transaction = {
            ...transaction,
            id: uuidv4(),
        };
        setTransactions((prev) => [newTransaction, ...prev]);
    };

    const updateTransaction = (id: string, updatedFields: Partial<Transaction>) => {
        setTransactions((prev) =>
            prev.map((t) => (t.id === id ? { ...t, ...updatedFields } : t))
        );
    };

    const deleteTransaction = (id: string) => {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
    };

    const getTransactionsByMonth = (date: Date) => {
        const start = startOfMonth(date);
        const end = endOfMonth(date);

        return transactions.filter((t) =>
            isWithinInterval(parseISO(t.date), { start, end })
        );
    };

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
        addTransaction,
        updateTransaction,
        deleteTransaction,
        getTransactionsByMonth,
        getBalance,
        getTotalIncome,
        getTotalExpenses
    };
}

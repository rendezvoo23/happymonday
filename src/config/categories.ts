import type { Category, CategoryId } from '../types';

export const CATEGORIES: Record<CategoryId, Category> = {
    food_drink: {
        id: '27be5565-c758-4c30-92e5-5d9d51e421ee',
        label: 'Food & Drink',
        color: '#FF9F0A', // Orange
        type: 'expense'
    },
    shopping: {
        id: 'shopping',
        label: 'Shopping',
        color: '#FFD60A', // Yellow
        type: 'expense'
    },
    travel: {
        id: 'travel',
        label: 'Travel',
        color: '#30D158', // Green
        type: 'expense'
    },
    transportation: {
        id: 'transportation',
        label: 'Transport',
        color: '#0A84FF', // Blue
        type: 'expense'
    },
    services: {
        id: 'services',
        label: 'Services',
        color: '#BF5AF2', // Purple
        type: 'expense'
    },
    entertainment: {
        id: 'entertainment',
        label: 'Fun',
        color: '#FF375F', // Pink
        type: 'expense'
    },
    health: {
        id: 'health',
        label: 'Health',
        color: '#FF453A', // Red
        type: 'expense'
    },
    salary: {
        id: 'salary',
        label: 'Salary',
        color: '#30D158', // Green (Income)
        type: 'income'
    },
    investment: {
        id: 'investment',
        label: 'Investment',
        color: '#0A84FF', // Blue (Income)
        type: 'income'
    },
    other: {
        id: 'other',
        label: 'Other',
        color: '#8E8E93', // Gray
        type: 'both'
    }
};

export const EXPENSE_CATEGORIES = Object.values(CATEGORIES).filter(c => c.type === 'expense' || c.type === 'both');
export const INCOME_CATEGORIES = Object.values(CATEGORIES).filter(c => c.type === 'income' || c.type === 'both');

export const getCategoryById = (id: CategoryId): Category => {
    return CATEGORIES[id] || CATEGORIES.other;
};

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { Tables } from "@/types/supabase";
import { useCategoryStore } from "@/stores/categoryStore";

type Transaction = Tables<'transactions'>;

interface TransactionWithCategory extends Transaction {
    categories: Pick<Tables<'categories'>, 'id' | 'name' | 'color' | 'icon'> | null;
}

interface DynamicBackgroundProps {
    transactions: TransactionWithCategory[];
}

export function DynamicBackground({ transactions }: DynamicBackgroundProps) {
    const { getCategoryById } = useCategoryStore();

    const gradientColors = useMemo(() => {
        // 1. Filter expenses
        const expenses = transactions.filter(t => t.direction === 'expense');
        if (expenses.length === 0) return ['#f3f4f6', '#e5e7eb']; // Default grays

        // 2. Group by category
        const byCategory = expenses.reduce((acc, t) => {
            const catId = t.category_id || 'uncategorized';
            acc[catId] = (acc[catId] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

        // 3. Sort by amount and take top 3
        const topCategories = Object.entries(byCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([catId]) => {
                // Try to get color from joined category data or store
                const txWithCat = transactions.find(t => t.category_id === catId);
                const category = txWithCat?.categories || getCategoryById(catId);
                return category?.color || '#6B7280';
            });

        // Ensure we have at least 2 colors for a gradient
        if (topCategories.length === 0) return ['#f3f4f6', '#e5e7eb'];
        if (topCategories.length === 1) return [topCategories[0], '#f3f4f6'];

        return topCategories;
    }, [transactions, getCategoryById]);

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-white/80 backdrop-blur-3xl" /> {/* Overlay to soften */}

            {/* Animated Blobs */}
            {gradientColors.map((color, index) => (
                <motion.div
                    key={index}
                    className="absolute rounded-full blur-[100px] opacity-40"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                        x: [0, 50, 0],
                        y: [0, 30, 0],
                    }}
                    transition={{
                        duration: 10 + index * 2,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut"
                    }}
                    style={{
                        backgroundColor: color,
                        width: '60vw',
                        height: '60vw',
                        top: index === 0 ? '-10%' : index === 1 ? '40%' : 'auto',
                        bottom: index === 2 ? '-10%' : 'auto',
                        left: index === 0 ? '-10%' : index === 2 ? '20%' : 'auto',
                        right: index === 1 ? '-10%' : 'auto',
                    }}
                />
            ))}
        </div>
    );
}

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Transaction } from "@/types";
import { getCategoryById } from "@/config/categories";

interface DynamicBackgroundProps {
    transactions: Transaction[];
}

export function DynamicBackground({ transactions }: DynamicBackgroundProps) {
    const gradientColors = useMemo(() => {
        // 1. Filter expenses
        const expenses = transactions.filter(t => t.type === 'expense');
        if (expenses.length === 0) return ['#f3f4f6', '#e5e7eb']; // Default grays

        // 2. Group by category
        const byCategory = expenses.reduce((acc, t) => {
            acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

        // 3. Sort by amount and take top 3
        const topCategories = Object.entries(byCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([catId]) => getCategoryById(catId as any).color);

        // Ensure we have at least 2 colors for a gradient
        if (topCategories.length === 0) return ['#f3f4f6', '#e5e7eb'];
        if (topCategories.length === 1) return [topCategories[0], '#f3f4f6'];

        return topCategories;
    }, [transactions]);

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

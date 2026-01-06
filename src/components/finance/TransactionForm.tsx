import { useState } from "react";

import { TransactionType, CategoryId } from "@/types";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/config/categories";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { CategorySelector } from "./CategorySelector";
import { useDate } from "@/context/DateContext";

interface TransactionFormProps {
    onSubmit: (data: {
        type: TransactionType;
        amount: number;
        categoryId: CategoryId;
        note: string;
        date: string;
    }) => void;
    initialData?: {
        type: TransactionType;
        amount: number;
        categoryId: CategoryId;
        note: string;
        date?: string;
    };
    initialType?: TransactionType;
    onCancel: () => void;
}

export function TransactionForm({ onSubmit, initialData, initialType = 'expense', onCancel }: TransactionFormProps) {
    const [type, setType] = useState<TransactionType>(initialData?.type || initialType);
    const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
    const [categoryId, setCategoryId] = useState<CategoryId>(
        initialData?.categoryId || (type === 'expense' ? 'food_drink' : 'salary')
    );
    const [note, setNote] = useState(initialData?.note || "");

    const { selectedDate } = useDate();
    const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

    console.log({ selectedDate });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !categoryId) return;

        onSubmit({
            type,
            amount: parseFloat(amount),
            categoryId,
            note,
            date: initialData?.date || selectedDate.toISOString(),
        });
    };

    // Reset category when type changes if current category is invalid for new type
    const handleTypeChange = (newType: string) => {
        const t = newType as TransactionType;
        setType(t);
        const validCategories = t === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
        if (!validCategories.find(c => c.id === categoryId)) {
            setCategoryId(validCategories[0].id);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <SegmentedControl
                options={[
                    { value: 'expense', label: 'Expense' },
                    { value: 'income', label: 'Income' },
                ]}
                value={type}
                onChange={handleTypeChange}
            />

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500 ml-1">Amount</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-gray-400">$</span>
                    <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-8 text-2xl font-semibold"
                        autoFocus
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500 ml-1">Category</label>
                <CategorySelector
                    categories={categories}
                    selectedId={categoryId}
                    onSelect={setCategoryId}
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500 ml-1">Note (Optional)</label>
                <Input
                    placeholder="What was this for?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
            </div>

            <div className="pt-4 flex gap-3">
                <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" className="flex-[2]" disabled={!amount}>
                    {initialData ? 'Save Changes' : 'Add Transaction'}
                </Button>
            </div>
        </form>
    );
}

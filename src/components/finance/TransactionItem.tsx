import { format, parseISO } from "date-fns";
import { Edit2, Trash2 } from "lucide-react";
import { Transaction } from "@/types";
import { getCategoryById } from "@/config/categories";
import { cn } from "@/lib/utils";

interface TransactionItemProps {
    transaction: Transaction;
    onEdit: (t: Transaction) => void;
    onDelete: (id: string) => void;
}

export function TransactionItem({ transaction, onEdit, onDelete }: TransactionItemProps) {
    const category = getCategoryById(transaction.categoryId);
    const isExpense = transaction.type === 'expense';

    return (
        <div className="group flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-2xl mb-3 shadow-sm transition-all hover:bg-white/80">
            <div className="flex items-center gap-4">
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                    style={{ backgroundColor: category.color }}
                >
                    {category.label.substring(0, 2).toUpperCase()}
                </div>
                <div>
                    <p className="font-medium text-gray-900">{category.label}</p>
                    <p className="text-xs text-gray-500">
                        {format(parseISO(transaction.date), 'MMM d')}
                        {transaction.note && ` • ${transaction.note}`}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <span className={cn(
                    "font-semibold",
                    isExpense ? "text-gray-900" : "text-green-600"
                )}>
                    {isExpense ? '-' : '+'}${transaction.amount.toLocaleString()}
                </span>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(transaction)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(transaction.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

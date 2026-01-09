import { format, parseISO } from "date-fns";
import { Edit2, Trash2 } from "lucide-react";
import type { Tables } from "@/types/supabase";
import { cn } from "@/lib/utils";
import { getCategoryColor } from "@/stores/categoryStore";
import { useCurrency } from "@/hooks/useCurrency";

type Transaction = Tables<'transactions'>;

interface TransactionWithCategory extends Transaction {
    categories: Pick<Tables<'categories'>, 'id' | 'name' | 'color' | 'icon'> | null;
}

interface TransactionItemProps {
    transaction: TransactionWithCategory;
    onEdit: (t: TransactionWithCategory) => void;
    onDelete: (id: string) => void;
}

export function TransactionItem({ transaction, onEdit, onDelete }: TransactionItemProps) {
    const category = transaction.categories;
    const isExpense = transaction.direction === 'expense';
    const categoryLabel = category?.name || 'Unknown';
    const categoryColor = getCategoryColor(category?.color, category?.name);
    const { formatAmount } = useCurrency();

    return (
        <div className="group flex items-center justify-between p-4 bg-white/60 backdrop-blur-md rounded-2xl mb-3 shadow-sm transition-all hover:bg-white/80 ring-1 ring-black/5">
            <div className="flex items-center gap-4">
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm relative overflow-hidden"
                    style={{ backgroundColor: categoryColor }}
                >
                    {/* Glossy Effect on Circle */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                    <span className="relative z-10">{categoryLabel.substring(0, 2).toUpperCase()}</span>
                </div>
                <div>
                    <p className="font-semibold text-gray-900 leading-tight">{categoryLabel}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                        {format(parseISO(transaction.occurred_at), 'MMM d')}
                        {transaction.note && ` • ${transaction.note}`}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <span className={cn(
                    "font-bold text-sm",
                    isExpense ? "text-gray-900" : "text-green-600"
                )}>
                    {formatAmount(isExpense ? -transaction.amount : transaction.amount, { showSign: true })}
                </span>

                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(transaction)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => onDelete(transaction.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

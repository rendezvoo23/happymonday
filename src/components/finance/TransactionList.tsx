import { Transaction } from "@/types";
import { TransactionItem } from "./TransactionItem";

interface TransactionListProps {
    transactions: Transaction[];
    onEdit: (t: Transaction) => void;
    onDelete: (id: string) => void;
}

export function TransactionList({ transactions, onEdit, onDelete }: TransactionListProps) {
    if (transactions.length === 0) {
        return (
            <div className="text-center py-10 text-gray-400">
                No transactions yet.
            </div>
        );
    }

    // Sort by date desc
    const sorted = [...transactions].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return (
        <div className="w-full pb-20">
            <h3 className="text-lg font-semibold mb-4 px-1">Recent Transactions</h3>
            {sorted.map((t) => (
                <TransactionItem
                    key={t.id}
                    transaction={t}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}

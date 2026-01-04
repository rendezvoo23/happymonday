import { useNavigate, useParams } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";
import { TransactionForm } from "@/components/finance/TransactionForm";
import { useTransactions } from "@/hooks/useTransactions";

export function EditTransactionPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { transactions, updateTransaction } = useTransactions();

    const transaction = transactions.find(t => t.id === id);

    if (!transaction) {
        return (
            <PageShell>
                <div className="flex flex-col items-center justify-center h-[60vh]">
                    <p className="text-gray-500">Transaction not found</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-4 text-blue-600 font-medium"
                    >
                        Go Back
                    </button>
                </div>
            </PageShell>
        );
    }

    return (
        <PageShell className="pb-6">
            <header className="flex flex-col items-center pt-4 pb-6">
                <h1 className="text-xl font-semibold text-gray-900">Edit Transaction</h1>
            </header>

            <TransactionForm
                initialData={{
                    ...transaction,
                    note: transaction.note || ''
                }}
                onCancel={() => navigate(-1)}
                onSubmit={(data) => {
                    updateTransaction(transaction.id, data);
                    navigate(-1);
                }}
            />
        </PageShell>
    );
}

import { useNavigate, useSearchParams } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";
import { TransactionForm } from "@/components/finance/TransactionForm";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionType } from "@/types";

export function AddTransactionPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { addTransaction } = useTransactions();

    const initialType = (searchParams.get('type') as TransactionType) || 'expense';

    return (
        <PageShell className="pb-6">
            <header className="flex flex-col items-center pt-4 pb-6">
                <h1 className="text-xl font-semibold text-gray-900">Add Transaction</h1>
            </header>

            <TransactionForm
                initialType={initialType}
                onCancel={() => navigate(-1)}
                onSubmit={(data) => {
                    addTransaction(data);
                    navigate(-1);
                }}
            />
        </PageShell>
    );
}

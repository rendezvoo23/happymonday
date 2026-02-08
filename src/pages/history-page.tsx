import { TransactionList } from "@/components/finance/TransactionList";
import { FilterIcon } from "@/components/icons/filter";
import { Header } from "@/components/layout/Header";
import { PageShell } from "@/components/layout/PageShell";
import { ModalListItem } from "@/components/lists/modal-list-item";
import { ConfirmAction } from "@/components/modals/confirm-action";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/Button";
import { InlineButtonDialog } from "@/components/ui/inline-button-dialog";
import { useDeleteTransaction } from "@/hooks/use-transactions-query";
import { useTelegramBackButton } from "@/hooks/useTelegramBackButton";
import { useTranslation } from "@/hooks/useTranslation";
import { useTransactionStore } from "@/stores/transactionStore";
import { useNavigate } from "@tanstack/react-router";

import { useEffect, useState } from "react";

type SortByOption = "occurred_at" | "updated_at";

const SORT_OPTIONS: { value: SortByOption; labelKey: string }[] = [
  { value: "occurred_at", labelKey: "history.sortByOccurredAt" },
  { value: "updated_at", labelKey: "history.sortByUpdatedAt" },
];

export function HistoryPage() {
  const navigate = useNavigate();
  const { historyTransactions, loadHistory } = useTransactionStore();
  const deleteTransactionMutation = useDeleteTransaction();
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<SortByOption>("occurred_at");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const pageSize = 20;

  useTelegramBackButton();

  useEffect(() => {
    // Initial load
    loadHistory(0, pageSize, sortBy).then(({ hasMore }) => {
      setHasMore(hasMore);
    });
  }, [sortBy]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const { hasMore: more } = await loadHistory(nextPage, pageSize, sortBy);
    setHasMore(more);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const handleSortBySelect = (value: SortByOption) => {
    setSortBy(value);
    setPage(0);
  };

  const handleEdit = (transaction: { id: string }) => {
    navigate({ to: "/edit/$id", params: { id: transaction.id } });
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteTargetId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteTargetId) {
      await deleteTransactionMutation.mutateAsync(deleteTargetId);
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
      // Reload filtering
      loadHistory(0, (page + 1) * pageSize, sortBy);
    }
  };

  return (
    <PageShell>
      <Header>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex-1">
          {t("nav.history")}
        </h1>
      </Header>

      <div className="flex items-center justify-end w-full relative px-6 gap-4 relative">
        <InlineButtonDialog
          icon={<FilterIcon className="w-full h-full" />}
          height={SORT_OPTIONS.length * 50}
          width={230}
          zIndex={1}
          buttonSize={36}
          expandedYOffset={8}
          useOutsideClick
        >
          {({ onClose }) => (
            <div className="flex flex-col gap-0">
              {SORT_OPTIONS.map((option, index) => (
                <ModalListItem
                  key={option.value}
                  onClick={() => {
                    handleSortBySelect(option.value);
                    onClose?.();
                  }}
                  position={
                    index === 0
                      ? SORT_OPTIONS.length === 1
                        ? "single"
                        : "first"
                      : index === SORT_OPTIONS.length - 1
                        ? "last"
                        : "middle"
                  }
                  isSelected={sortBy === option.value}
                >
                  <span className="font-normal text-[17px] text-gray-900 dark:text-gray-100 truncate">
                    {t(option.labelKey)}
                  </span>
                </ModalListItem>
              ))}
            </div>
          )}
        </InlineButtonDialog>
      </div>

      <main className="px-3 pb-32">
        <TransactionList
          transactions={historyTransactions}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          disableLimit
          groupByMonth
          sortBy={sortBy}
        />

        <div className="flex items-center justify-center w-full mt-4">
          {hasMore && (
            <Button
              variant="ghost"
              size="md"
              style={{ color: "var(--accent-color)" }}
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? <Spinner size="md" /> : t("transactions.loadMore")}
            </Button>
          )}
        </div>

        {!hasMore && historyTransactions.length > 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            {t("history.endOfList")}
          </div>
        )}
      </main>

      <ConfirmAction
        title={t("statistics.deleteTransaction")}
        description={t("statistics.deleteConfirmation")}
        onAction={confirmDelete}
        onClose={() => setIsDeleteModalOpen(false)}
        isDestructive
        open={isDeleteModalOpen}
      />
    </PageShell>
  );
}

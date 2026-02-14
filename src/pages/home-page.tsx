import { BubblesCluster } from "@/components/finance/BubblesCluster";
import { TransactionDrawer } from "@/components/finance/TransactionDrawer";
import { Header } from "@/components/layout/Header";
import { PageShell } from "@/components/layout/PageShell";
import { Spinner } from "@/components/spinner";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { useDate } from "@/context/DateContext";
import { useMonthTransactionsWithCategories } from "@/hooks/use-transactions-query";
import { useCurrency } from "@/hooks/useCurrency";
import { Route } from "@/routes/_authenticated/home";
import { useCategoryStore } from "@/stores/categoryStore";
import { useUIStore } from "@/stores/uiStore";
import { useNavigate } from "@tanstack/react-router";
import { addMonths, isSameMonth, subMonths } from "date-fns";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./home.css";
import "./styles.css";

type TransactionDirection = "expense" | "income";

function parseMonthKey(monthKey: string): Date {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function HomePage() {
  const { loadCategories } = useCategoryStore();
  const { setDate } = useDate();
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  const { month: urlMonth, mode: urlMode } = Route.useSearch();

  // Selected date from URL (source of truth for home page)
  const selectedDate = useMemo(() => {
    if (urlMonth) {
      return parseMonthKey(urlMonth);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, [urlMonth]);

  // canGoNext: allow swiping to next month only when viewing a past month
  const canGoNext = useMemo(() => {
    const today = new Date();
    return !isSameMonth(selectedDate, today) && selectedDate < today;
  }, [selectedDate]);

  // UI store for drawer
  const {
    addTransactionDrawer,
    openAddTransactionDrawer,
    closeAddTransactionDrawer,
  } = useUIStore();

  // Touch gesture state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const screenWidthRef = useRef(0);
  const [clusterHeight, setClusterHeight] = useState<number>(300);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const windowHeight = window.innerHeight;
    if (!windowHeight) return;
    setClusterHeight(Math.max(windowHeight - (116 + 300), 350));
  }, []);

  // Sync URL -> DateContext when URL changes (for MonthSelector, BubblesCluster)
  useEffect(() => {
    if (urlMonth) {
      const parsed = parseMonthKey(urlMonth);
      setDate(parsed);
    }
  }, [urlMonth, setDate]);

  // Ensure URL has month on initial load; preserve mode (ignored on home for now)
  const updateUrlMonth = useCallback(
    (date: Date) => {
      navigate({
        to: "/home",
        search: {
          month: getMonthKey(date),
          mode: urlMode ?? "month",
        },
        replace: true,
      });
    },
    [navigate, urlMode]
  );

  useEffect(() => {
    if (!urlMonth) {
      updateUrlMonth(selectedDate);
    }
  }, [urlMonth, selectedDate, updateUrlMonth]);

  // TanStack Query: fetch current, prev, next month in parallel
  const currentMonthQuery = useMonthTransactionsWithCategories(selectedDate);
  const prevDate = subMonths(selectedDate, 1);
  const nextDate = addMonths(selectedDate, 1);
  const prevMonthQuery = useMonthTransactionsWithCategories(prevDate);
  const nextMonthQuery = useMonthTransactionsWithCategories(nextDate);

  const transactions = currentMonthQuery.data ?? [];
  const prevMonthTransactions = prevMonthQuery.data ?? [];
  const nextMonthTransactions = canGoNext ? (nextMonthQuery.data ?? []) : [];

  const isInitialLoading =
    currentMonthQuery.isLoading && !currentMonthQuery.data;

  const totalExpenses = useMemo(() => {
    const expenses = transactions.filter((t) => t.direction === "expense");
    return expenses.reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTransitioning) return;
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setTouchCurrentX(touch.clientX);
    screenWidthRef.current = window.innerWidth;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isTransitioning || touchStartX === null) return;
    const touch = e.touches[0];
    setTouchCurrentX(touch.clientX);

    const diff = touch.clientX - touchStartX;
    const screenWidth = screenWidthRef.current;

    if (diff > 0) {
      const progress = Math.min(diff / screenWidth, 1);
      setSwipeProgress(progress);
    } else if (diff < 0 && canGoNext) {
      const progress = Math.max(diff / screenWidth, -1);
      setSwipeProgress(progress);
    }
  };

  const handleTouchEnd = () => {
    if (isTransitioning || touchStartX === null || touchCurrentX === null)
      return;

    const diff = touchCurrentX - touchStartX;
    const screenWidth = screenWidthRef.current;
    const diffPercentage = diff / screenWidth;
    const threshold = 0.2;

    if (diffPercentage > threshold) {
      setIsTransitioning(true);
      setSwipeProgress(1);
      setTimeout(() => {
        const newDate = subMonths(selectedDate, 1);
        updateUrlMonth(newDate);
        setSwipeProgress(0);
        setIsTransitioning(false);
        setTouchStartX(null);
        setTouchCurrentX(null);
      }, 300);
    } else if (diffPercentage < -threshold && canGoNext) {
      setIsTransitioning(true);
      setSwipeProgress(-1);
      setTimeout(() => {
        const newDate = addMonths(selectedDate, 1);
        updateUrlMonth(newDate);
        setSwipeProgress(0);
        setIsTransitioning(false);
        setTouchStartX(null);
        setTouchCurrentX(null);
      }, 300);
    } else {
      setIsTransitioning(true);
      setSwipeProgress(0);
      setTimeout(() => {
        setIsTransitioning(false);
        setTouchStartX(null);
        setTouchCurrentX(null);
      }, 300);
    }
  };

  const handlePrevMonthClick = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setSwipeProgress(1);
    setTimeout(() => {
      const newDate = subMonths(selectedDate, 1);
      updateUrlMonth(newDate);
      setSwipeProgress(0);
      setIsTransitioning(false);
    }, 300);
  };

  const handleNextMonthClick = () => {
    if (isTransitioning || !canGoNext) return;
    setIsTransitioning(true);
    setSwipeProgress(-1);
    setTimeout(() => {
      const newDate = addMonths(selectedDate, 1);
      updateUrlMonth(newDate);
      setSwipeProgress(0);
      setIsTransitioning(false);
    }, 300);
  };

  const handleOpenAdd = (type: TransactionDirection) => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred("heavy");
    }
    openAddTransactionDrawer(type);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <PageShell allowScroll={true}>
        <Header>
          <MonthSelector
            totalExpenses={formatAmount(totalExpenses)}
            onPrevMonth={handlePrevMonthClick}
            onNextMonth={handleNextMonthClick}
            onJumpToCurrentMonth={() =>
              updateUrlMonth(
                new Date(new Date().getFullYear(), new Date().getMonth(), 1)
              )
            }
          />
        </Header>
        <main
          ref={containerRef}
          className="flex flex-col items-center gap-2 touch-none"
        >
          <div className="w-full flex justify-center relative overflow-hidden">
            {isInitialLoading ? (
              <div
                className="text-gray-500 dark:text-gray-400 flex items-center justify-center"
                style={{ height: clusterHeight }}
              >
                <Spinner size="lg" />
              </div>
            ) : (
              <div
                className="w-full relative"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                  transform: `translateX(${swipeProgress * 100}%)`,
                  transition: isTransitioning
                    ? "transform 0.3s ease-out"
                    : "none",
                }}
              >
                {/* Previous month bubbles */}
                <div
                  className="absolute top-0 left-0 w-full"
                  style={{ transform: "translateX(-100%)" }}
                >
                  <BubblesCluster
                    transactions={prevMonthTransactions}
                    mode="cluster"
                    animateBubbles={false}
                    key="prev-month-bubbles"
                    height={clusterHeight}
                  />
                </div>

                {/* Current month bubbles */}
                <div className="w-full">
                  <BubblesCluster
                    transactions={transactions}
                    mode="cluster"
                    animateBubbles={!addTransactionDrawer.isOpen}
                    height={clusterHeight}
                  />
                </div>

                {/* Next month bubbles */}
                {canGoNext && (
                  <div
                    className="absolute top-0 right-0 w-full"
                    style={{ transform: "translateX(100%)" }}
                  >
                    <BubblesCluster
                      transactions={nextMonthTransactions}
                      mode="cluster"
                      animateBubbles={false}
                      height={clusterHeight}
                      key="next-month-bubbles"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {transactions.length > 0 && (
            <div className="fixed bottom-0 left-0 z-[-1] w-full">
              <BubblesCluster
                transactions={transactions}
                mode="blurred"
                animateBubbles={false}
                height={280}
              />
            </div>
          )}
        </main>
      </PageShell>

      <div className="plus-button-container z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0, rotate: -90 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0, rotate: -90 }}
          transition={{
            type: "spring",
            delay: 0.2,
            stiffness: 300,
            damping: 10,
            duration: 0.5,
          }}
          className="glassmorphic-plus-wrap"
        >
          <motion.button
            type="button"
            title="Add expense"
            className="glassmorphic-plus-button"
            onClick={() => handleOpenAdd("expense")}
            whileTap={{ scale: 0.9 }}
          >
            <Plus className="plus-icon" color="var(--primary-text-color)" />
          </motion.button>
          <div className="glassmorphic-plus-shadow" />
        </motion.div>
      </div>

      <TransactionDrawer
        isOpen={addTransactionDrawer.isOpen}
        onClose={closeAddTransactionDrawer}
        initialType={addTransactionDrawer.transactionType}
        showEditNote={false}
      />
    </motion.div>
  );
}

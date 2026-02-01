import { BubblesCluster } from "@/components/finance/BubblesCluster";
import { TransactionDrawer } from "@/components/finance/TransactionDrawer";
import { PageShell } from "@/components/layout/PageShell";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { useDate } from "@/context/DateContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useCategoryStore } from "@/stores/categoryStore";
import { useTransactionStore } from "@/stores/transactionStore";
import type { Enums, Tables } from "@/types/supabase";
import { addMonths, subMonths } from "date-fns";
import { motion } from "framer-motion";
import { Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";

type TransactionDirection = Enums<"transaction_direction">;
type TransactionWithCategory = Tables<"transactions"> & {
  categories: Pick<
    Tables<"categories">,
    "id" | "name" | "color" | "icon"
  > | null;
  subcategories: Pick<Tables<"subcategories">, "id" | "name" | "icon"> | null;
};

export function HomePage() {
  const { loadTransactions } = useTransactionStore();
  const { loadCategories } = useCategoryStore();
  const { selectedDate, prevMonth, nextMonth, canGoNext } = useDate();
  const { formatAmount } = useCurrency();

  // Transaction drawer state
  const [isTransactionDrawerOpen, setIsTransactionDrawerOpen] = useState(false);
  const [transactionType, setTransactionType] =
    useState<TransactionDirection>("expense");

  // Touch gesture state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const screenWidthRef = useRef(0);

  // Cache for all loaded months - key is "YYYY-MM" format
  const [monthsCache, setMonthsCache] = useState<
    Map<string, TransactionWithCategory[]>
  >(new Map());
  const monthsCacheRef = useRef(monthsCache);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Keep ref in sync with state
  useEffect(() => {
    monthsCacheRef.current = monthsCache;
  }, [monthsCache]);

  // Helper to generate month key
  const getMonthKey = useCallback((date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  // Helper to load and cache a month's transactions
  const loadAndCacheMonth = useCallback(
    async (date: Date, forceReload = false) => {
      const monthKey = getMonthKey(date);

      const cached = monthsCacheRef.current.get(monthKey);
      if (cached && !forceReload) {
        return cached;
      }

      console.log(`[HomePage] Loading transactions for ${monthKey}...`);
      const txs = await loadTransactions(date);

      setMonthsCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(monthKey, txs || []);
        monthsCacheRef.current = newCache;
        return newCache;
      });

      return txs || [];
    },
    [getMonthKey, loadTransactions]
  );

  // Function to reload transactions
  const reloadTransactions = useCallback(async () => {
    console.log("[HomePage] Reloading current month and neighbors...");

    await loadAndCacheMonth(selectedDate, true);

    const prevDate = subMonths(selectedDate, 1);
    if (monthsCacheRef.current.has(getMonthKey(prevDate))) {
      loadAndCacheMonth(prevDate, true);
    }

    if (canGoNext) {
      const nextDate = addMonths(selectedDate, 1);
      if (monthsCacheRef.current.has(getMonthKey(nextDate))) {
        loadAndCacheMonth(nextDate, true);
      }
    }
  }, [selectedDate, getMonthKey, loadAndCacheMonth, canGoNext]);

  useEffect(() => {
    const loadAllMonthsData = async () => {
      setIsInitialLoading(true);
      loadCategories();

      await loadAndCacheMonth(selectedDate);
      setIsInitialLoading(false);

      const prevDate = subMonths(selectedDate, 1);
      loadAndCacheMonth(prevDate);

      if (canGoNext) {
        const nextDate = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth() + 1,
          1
        );
        loadAndCacheMonth(nextDate);
      }
    };

    loadAllMonthsData();
  }, [selectedDate, loadCategories, canGoNext, loadAndCacheMonth]);

  // Get transactions from cache
  const currentMonthKey = getMonthKey(selectedDate);
  const prevMonthKey = getMonthKey(subMonths(selectedDate, 1));
  const nextMonthKey = getMonthKey(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1)
  );

  const transactions = monthsCache.get(currentMonthKey) || [];
  const prevMonthTransactions = monthsCache.get(prevMonthKey) || [];
  const nextMonthTransactions = monthsCache.get(nextMonthKey) || [];

  const totalExpenses = useMemo(() => {
    const expenses = transactions.filter((t) => t.direction === "expense");
    const total = expenses.reduce((sum, t) => sum + t.amount, 0);
    return total;
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
        prevMonth();
        setSwipeProgress(0);
        setIsTransitioning(false);
        setTouchStartX(null);
        setTouchCurrentX(null);
      }, 300);
    } else if (diffPercentage < -threshold && canGoNext) {
      setIsTransitioning(true);
      setSwipeProgress(-1);

      setTimeout(() => {
        nextMonth();
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
      prevMonth();
      setSwipeProgress(0);
      setIsTransitioning(false);
    }, 300);
  };

  const handleNextMonthClick = () => {
    if (isTransitioning || !canGoNext) return;

    setIsTransitioning(true);
    setSwipeProgress(-1);

    setTimeout(() => {
      nextMonth();
      setSwipeProgress(0);
      setIsTransitioning(false);
    }, 300);
  };

  const handleOpenAdd = (type: TransactionDirection) => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred("heavy");
    }
    setTransactionType(type);
    setIsTransactionDrawerOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <PageShell allowScroll={true}>
        <main
          ref={containerRef}
          className="flex flex-col items-center gap-2 touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-full flex justify-center relative overflow-hidden">
            {isInitialLoading ? (
              <div className="text-gray-500 dark:text-gray-400 h-[380px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <div
                className="w-full relative"
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
                  style={{
                    transform: "translateX(-100%)",
                  }}
                >
                  <BubblesCluster
                    transactions={prevMonthTransactions}
                    mode="cluster"
                    animateBubbles={false}
                    key="prev-month-bubbles"
                    height={380}
                  />
                </div>

                {/* Current month bubbles */}
                <div className="w-full">
                  <BubblesCluster
                    transactions={transactions}
                    mode="cluster"
                    animateBubbles={!isTransactionDrawerOpen}
                    height={380}
                  />
                </div>

                {/* Next month bubbles */}
                {canGoNext && (
                  <div
                    className="absolute top-0 right-0 w-full"
                    style={{
                      transform: "translateX(100%)",
                    }}
                  >
                    <BubblesCluster
                      transactions={nextMonthTransactions}
                      mode="cluster"
                      animateBubbles={false}
                      height={380}
                      key="next-month-bubbles"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <MonthSelector
            totalExpenses={formatAmount(totalExpenses)}
            onPrevMonth={handlePrevMonthClick}
            onNextMonth={handleNextMonthClick}
          />

          <div className="flex items-center justify-center mt-8">
            <div className="glassmorphic-plus-wrap">
              <button
                type="button"
                title="Add expense"
                className="glassmorphic-plus-button"
                onClick={() => handleOpenAdd("expense")}
              >
                <Plus className="plus-icon" color="var(--primary-text-color)" />
              </button>
              <div className="glassmorphic-plus-shadow" />
            </div>
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

      <TransactionDrawer
        isOpen={isTransactionDrawerOpen}
        onClose={() => setIsTransactionDrawerOpen(false)}
        initialType={transactionType}
        onTransactionAdded={reloadTransactions}
      />
    </motion.div>
  );
}

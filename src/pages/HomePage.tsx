import { BubblesCluster } from "@/components/finance/BubblesCluster";
import { TransactionDrawer } from "@/components/finance/TransactionDrawer";
import { CircleGradientIcon } from "@/components/icons/circle-gradient";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { useDate } from "@/context/DateContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useTranslation } from "@/hooks/useTranslation";
import { useCategoryStore } from "@/stores/categoryStore";
import { useTransactionStore } from "@/stores/transactionStore";
import type { Enums, Tables } from "@/types/supabase";
import { subMonths } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TransactionDirection = Enums<"transaction_direction">;
type TransactionWithCategory = Tables<"transactions"> & {
  categories: Pick<
    Tables<"categories">,
    "id" | "name" | "color" | "icon"
  > | null;
};

export function HomePage() {
  const { loadTransactions } = useTransactionStore();
  const { loadCategories } = useCategoryStore();
  const { selectedDate, prevMonth, nextMonth, canGoNext } = useDate();
  const { formatAmount } = useCurrency();
  const { t } = useTranslation();

  // Transaction drawer state
  const [isTransactionDrawerOpen, setIsTransactionDrawerOpen] = useState(false);
  const [transactionType, setTransactionType] =
    useState<TransactionDirection>("expense");

  // Touch gesture state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0); // -1 to 1, where 1 = full swipe right (prev month), -1 = full swipe left (next month)
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
    async (date: Date) => {
      const monthKey = getMonthKey(date);

      // Return from cache if already loaded
      const cached = monthsCacheRef.current.get(monthKey);
      if (cached) {
        return cached;
      }

      // Load from API
      const txs = await loadTransactions(date);
      setMonthsCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(monthKey, txs || []);
        return newCache;
      });

      return txs || [];
    },
    [getMonthKey, loadTransactions]
  );

  // Function to reload transactions (used after adding a new transaction)
  const reloadTransactions = useCallback(async () => {
    // Clear cache for current month to force reload
    const currentKey = getMonthKey(selectedDate);
    setMonthsCache((prev) => {
      const newCache = new Map(prev);
      newCache.delete(currentKey);
      return newCache;
    });

    // Reload current month
    await loadAndCacheMonth(selectedDate);

    // Also reload adjacent months if they're in cache
    const prevDate = subMonths(selectedDate, 1);
    const prevKey = getMonthKey(prevDate);
    if (monthsCacheRef.current.has(prevKey)) {
      setMonthsCache((prev) => {
        const newCache = new Map(prev);
        newCache.delete(prevKey);
        return newCache;
      });
      loadAndCacheMonth(prevDate);
    }

    if (canGoNext) {
      const nextDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        1
      );
      const nextKey = getMonthKey(nextDate);
      if (monthsCacheRef.current.has(nextKey)) {
        setMonthsCache((prev) => {
          const newCache = new Map(prev);
          newCache.delete(nextKey);
          return newCache;
        });
        loadAndCacheMonth(nextDate);
      }
    }
  }, [selectedDate, getMonthKey, loadAndCacheMonth, canGoNext]);

  // Disable Telegram swipe-to-close behavior
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      // Disable vertical swipes that would close the mini app
      window.Telegram.WebApp.disableVerticalSwipes();

      // Expand to full height
      window.Telegram.WebApp.expand();
    }

    return () => {
      // Re-enable on unmount (cleanup)
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.enableVerticalSwipes();
      }
    };
  }, []);

  useEffect(() => {
    const loadAllMonthsData = async () => {
      setIsInitialLoading(true);
      loadCategories();

      // Load current month first
      await loadAndCacheMonth(selectedDate);
      setIsInitialLoading(false);

      // Eagerly preload adjacent months in the background
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

  // Calculate total expenses for the selected month
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
      // Swiping right (to previous month)
      const progress = Math.min(diff / screenWidth, 1);
      setSwipeProgress(progress);
    } else if (diff < 0 && canGoNext) {
      // Swiping left (to next month) - only if allowed
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

    // Threshold: 20% of screen width
    const threshold = 0.2;

    if (diffPercentage > threshold) {
      // Commit to previous month (swiped right)
      setIsTransitioning(true);
      setSwipeProgress(1); // Animate to full swipe

      // Wait for animation then change month
      setTimeout(() => {
        prevMonth();
        setSwipeProgress(0);
        setIsTransitioning(false);
        setTouchStartX(null);
        setTouchCurrentX(null);
      }, 300);
    } else if (diffPercentage < -threshold && canGoNext) {
      // Commit to next month (swiped left)
      setIsTransitioning(true);
      setSwipeProgress(-1); // Animate to full swipe left

      // Wait for animation then change month
      setTimeout(() => {
        nextMonth();
        setSwipeProgress(0);
        setIsTransitioning(false);
        setTouchStartX(null);
        setTouchCurrentX(null);
      }, 300);
    } else {
      // Snap back to current month
      setIsTransitioning(true);
      setSwipeProgress(0);
      setTimeout(() => {
        setIsTransitioning(false);
        setTouchStartX(null);
        setTouchCurrentX(null);
      }, 300);
    }
  };

  // Animated month navigation for button clicks
  const handlePrevMonthClick = () => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    setSwipeProgress(1); // Animate to full swipe right

    // Wait for animation then change month
    setTimeout(() => {
      prevMonth();
      setSwipeProgress(0);
      setIsTransitioning(false);
    }, 300);
  };

  const handleNextMonthClick = () => {
    if (isTransitioning || !canGoNext) return;

    setIsTransitioning(true);
    setSwipeProgress(-1); // Animate to full swipe left

    // Wait for animation then change month
    setTimeout(() => {
      nextMonth();
      setSwipeProgress(0);
      setIsTransitioning(false);
    }, 300);
  };

  const handleOpenAdd = (type: TransactionDirection) => {
    setTransactionType(type);
    setIsTransactionDrawerOpen(true);
  };

  return (
    <>
      <PageShell allowScroll={true}>
        <main
          ref={containerRef}
          className="flex flex-col items-center gap-2 pb-10 touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-full flex justify-center relative overflow-hidden">
            {isInitialLoading ? (
              <div className="text-gray-500 mt-6 h-[380px] flex items-center justify-center">
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
                {/* Previous month bubbles - positioned to the left */}
                <div
                  className="absolute top-0 left-0 w-full"
                  style={{
                    transform: "translateX(-100%)",
                  }}
                >
                  <BubblesCluster
                    transactions={prevMonthTransactions}
                    mode="separated"
                    height={380}
                  />
                </div>

                {/* Current month bubbles */}
                <div className="w-full">
                  <BubblesCluster
                    transactions={transactions}
                    mode="cluster"
                    height={380}
                  />
                </div>

                {/* Next month bubbles - positioned to the right */}
                {canGoNext && (
                  <div
                    className="absolute top-0 right-0 w-full"
                    style={{
                      transform: "translateX(100%)",
                    }}
                  >
                    <BubblesCluster
                      transactions={nextMonthTransactions}
                      mode="separated"
                      height={380}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-center space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t("transactions.total")}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatAmount(totalExpenses)}
            </p>
          </div>

          <header className="flex flex-col items-center pt-2 pb-4">
            <MonthSelector
              onPrevMonth={handlePrevMonthClick}
              onNextMonth={handleNextMonthClick}
            />
          </header>

          <div className="mt-28 flex justify-center">
            <Button
              size="icon"
              className="w-16 h-16 rounded-full shadow-2xl border-2 border-white flex items-center justify-center overflow-hidden transition-transform active:scale-95 z-50 relative"
              onClick={() => handleOpenAdd("expense")}
            >
              <CircleGradientIcon className="absolute inset-0 w-full h-full" />
              <Plus className="w-8 h-8 text-white relative z-10" />
            </Button>
          </div>
        </main>
      </PageShell>

      {/* Transaction Drawer */}
      <TransactionDrawer
        isOpen={isTransactionDrawerOpen}
        onClose={() => setIsTransactionDrawerOpen(false)}
        initialType={transactionType}
        onTransactionAdded={reloadTransactions}
      />
    </>
  );
}

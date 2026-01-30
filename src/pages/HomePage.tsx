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
import { Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./button.css";

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
    async (date: Date, forceReload = false) => {
      const monthKey = getMonthKey(date);

      // Return from cache if already loaded and not forcing reload
      const cached = monthsCacheRef.current.get(monthKey);
      if (cached && !forceReload) {
        return cached;
      }

      console.log(`[HomePage] Loading transactions for ${monthKey}...`);
      // Load from API
      const txs = await loadTransactions(date);

      setMonthsCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(monthKey, txs || []);
        // Update ref immediately so other calls see it
        monthsCacheRef.current = newCache;
        return newCache;
      });

      return txs || [];
    },
    [getMonthKey, loadTransactions]
  );

  // Function to reload transactions (used after adding a new transaction)
  const reloadTransactions = useCallback(async () => {
    console.log("[HomePage] Reloading current month and neighbors...");

    // Simply call loadAndCacheMonth with forceReload=true
    // This will fetch fresh data and update state/ref in one go
    // without clearing the state first (preventing disappearing bubbles)
    await loadAndCacheMonth(selectedDate, true);

    // Also reload adjacent months if they're in cache (background)
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
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred("heavy");
    }
    setTransactionType(type);
    setIsTransactionDrawerOpen(true);
  };

  return (
    <>
      <PageShell allowScroll={true}>
        <main
          ref={containerRef}
          className="flex flex-col items-center gap-2 pb-32 touch-none min-h-[calc(100vh-env(safe-area-inset-top))]"
          style={{
            // background: `linear-gradient(to bottom, var(--background), rgba(0, 0, 0, 0.3)), url(${darkBgVariant1}) bottom / auto 100% no-repeat fixed`,
            // backgroundBlendMode: "normal, multiply",
            // backgroundPositionY: "200px",
            marginTop: "calc(env(safe-area-inset-top) + 50px)",
          }}
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

          <div className="flex-1 flex items-center justify-center">
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

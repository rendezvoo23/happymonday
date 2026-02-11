import { BubblesCluster } from "@/components/finance/BubblesCluster";
import { TransactionDrawer } from "@/components/finance/TransactionDrawer";
import { Header } from "@/components/layout/Header";
import { PageShell } from "@/components/layout/PageShell";
import { Spinner } from "@/components/spinner";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { useDate } from "@/context/DateContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useCategoryStore } from "@/stores/categoryStore";
import { useTransactionStore } from "@/stores/transactionStore";
import type { Enums, Tables } from "@/types/supabase";
import { useNavigate } from "@tanstack/react-router";
import { addMonths, isSameMonth, subMonths } from "date-fns";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Route } from "@/routes/_authenticated/home";
import "./home.css";
import "./styles.css";

type TransactionDirection = Enums<"transaction_direction">;
type TransactionWithCategory = Tables<"transactions"> & {
  categories: Pick<
    Tables<"categories">,
    "id" | "name" | "color" | "icon"
  > | null;
  subcategories: Pick<Tables<"subcategories">, "id" | "name" | "icon"> | null;
};

function parseMonthKey(monthKey: string): Date {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

export function HomePage() {
  const { loadTransactions } = useTransactionStore();
  const { loadCategories } = useCategoryStore();
  const { selectedDate, setDate, prevMonth, nextMonth, canGoNext } = useDate();
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  const { month: urlMonth } = Route.useSearch();

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
  const [clusterHeight, setClusterHeight] = useState<number>(300);

  useEffect(() => {
    const windowHeight = window.innerHeight;

    console.log("[HomePage] Window height:", {
      windowHeight,
      innerHeight: window.innerHeight,
    });

    if (!windowHeight) return;

    const clusterHeight = Math.max(windowHeight - (116 + 300), 350);
    console.log("[HomePage] Cluster height:", { clusterHeight });

    setClusterHeight(clusterHeight);
  }, []);

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
    async (date: Date, forceReload = false, preserveIfEmpty = false) => {
      const monthKey = getMonthKey(date);

      const cached = monthsCacheRef.current.get(monthKey);
      if (cached && !forceReload) {
        return cached;
      }

      const txs = await loadTransactions(date);

      setMonthsCache((prev) => {
        const newCache = new Map(prev);
        // Don't overwrite with empty when we just added a transaction (Supabase read-after-write lag)
        const existing = prev.get(monthKey) || [];
        const hasOptimistic = existing.some((t) => t.id.startsWith("temp-"));
        if (
          preserveIfEmpty &&
          (txs?.length ?? 0) === 0 &&
          existing.length > 0 &&
          hasOptimistic
        ) {
          return prev;
        }
        newCache.set(monthKey, txs || []);
        monthsCacheRef.current = newCache;
        return newCache;
      });

      return txs || [];
    },
    [getMonthKey, loadTransactions]
  );

  // Function to reload transactions
  const reloadTransactions = useCallback(
    async (preserveIfEmpty = false) => {
      console.log("[HomePage] Reloading current month and neighbors...");

      await loadAndCacheMonth(selectedDate, true, preserveIfEmpty);

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
    },
    [selectedDate, getMonthKey, loadAndCacheMonth, canGoNext]
  );

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

  // Sync URL <-> selected month (for reload persistence)
  const updateUrlMonth = useCallback(
    (date: Date) => {
      const monthKey = getMonthKey(date);
      navigate({
        to: "/home",
        search: { month: monthKey },
        replace: true,
      });
    },
    [navigate, getMonthKey]
  );

  useEffect(() => {
    if (urlMonth) {
      const parsed = parseMonthKey(urlMonth);
      if (!isSameMonth(selectedDate, parsed)) {
        setDate(parsed);
      }
    } else {
      updateUrlMonth(selectedDate);
    }
  }, [urlMonth]); // Only run when URL changes (e.g. initial load, back/forward)

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
        const newDate = subMonths(selectedDate, 1);
        prevMonth();
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
        nextMonth();
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
      prevMonth();
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
      nextMonth();
      updateUrlMonth(newDate);
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

  // Optimistically add new transaction to cache so both BubblesClusters update immediately
  const handleTransactionAdded = useCallback(
    async (optimisticData?: {
      amount: number;
      categoryId: string;
      subcategoryId?: string | null;
      date: string;
      type: TransactionDirection;
    }) => {
      if (optimisticData) {
        const { getCategoryById } = useCategoryStore.getState();
        const category = getCategoryById(optimisticData.categoryId);
        const txDate = new Date(optimisticData.date);
        const monthKey = getMonthKey(txDate);
        const optimisticTx: TransactionWithCategory = {
          id: `temp-${Date.now()}`,
          amount: optimisticData.amount,
          category_id: optimisticData.categoryId,
          subcategory_id: optimisticData.subcategoryId ?? null,
          occurred_at: optimisticData.date,
          direction: optimisticData.type,
          currency_code: "USD",
          note: null,
          user_id: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          categories: category
            ? {
                id: category.id,
                name: category.name,
                color: category.color,
                icon: category.icon,
              }
            : null,
          subcategories: null,
        };
        setMonthsCache((prev) => {
          const newCache = new Map(prev);
          const existing = newCache.get(monthKey) || [];
          newCache.set(monthKey, [optimisticTx, ...existing]);
          monthsCacheRef.current = newCache;
          return newCache;
        });
      }
      // Preserve optimistic data if Supabase returns empty (read-after-write lag)
      await reloadTransactions(!!optimisticData);
      // Retry after delay if we preserved (Supabase may need time to propagate)
      if (optimisticData) {
        setTimeout(() => reloadTransactions(false), 1500);
      }
    },
    [getMonthKey, reloadTransactions]
  );

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
          />
        </Header>
        <main
          ref={containerRef}
          className="flex flex-col items-center gap-2 touch-none" //
        >
          <div className="w-full flex justify-center relative overflow-hidden">
            {isInitialLoading ? (
              <div className="text-gray-500 dark:text-gray-400 flex items-center justify-center">
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
                  style={{
                    transform: "translateX(-100%)",
                  }}
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
                    animateBubbles={!isTransactionDrawerOpen}
                    height={clusterHeight}
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
                      height={clusterHeight}
                      key="next-month-bubbles"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="plus-button-container">
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
        onTransactionAdded={handleTransactionAdded}
        showEditNote={false}
      />
    </motion.div>
  );
}

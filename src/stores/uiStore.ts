import type { Enums } from "@/types/supabase";
import { create } from "zustand";

type TransactionDirection = Enums<"transaction_direction">;

export type ChartMode = "day" | "week" | "month";

interface AddTransactionDrawerState {
  isOpen: boolean;
  transactionType: TransactionDirection;
}

/** Persisted search params per tab for URL restoration when switching tabs */
export interface LastHomeSearch {
  month?: string;
  mode?: ChartMode; // In URL for future use; ignored on home for now
}

export interface LastStatisticsSearch {
  month?: string;
  mode?: ChartMode;
  category?: string;
}

interface UIState {
  // Nav bar visibility (e.g. hide on scroll)
  isNavBarVisible: boolean;

  // Add transaction drawer
  addTransactionDrawer: AddTransactionDrawerState;

  // Last URL search params per tab (persisted when switching tabs)
  lastHomeSearch: LastHomeSearch;
  lastStatisticsSearch: LastStatisticsSearch;

  // Actions
  setNavBarVisible: (visible: boolean) => void;
  openAddTransactionDrawer: (type?: TransactionDirection) => void;
  closeAddTransactionDrawer: () => void;
  setLastHomeSearch: (search: LastHomeSearch) => void;
  setLastStatisticsSearch: (search: LastStatisticsSearch) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isNavBarVisible: true,
  addTransactionDrawer: {
    isOpen: false,
    transactionType: "expense",
  },
  lastHomeSearch: {},
  lastStatisticsSearch: {},

  setNavBarVisible: (visible) => set({ isNavBarVisible: visible }),

  openAddTransactionDrawer: (type = "expense") =>
    set({
      addTransactionDrawer: {
        isOpen: true,
        transactionType: type,
      },
    }),

  closeAddTransactionDrawer: () =>
    set({
      addTransactionDrawer: {
        isOpen: false,
        transactionType: "expense",
      },
    }),

  setLastHomeSearch: (search) => set({ lastHomeSearch: search }),

  setLastStatisticsSearch: (search) => set({ lastStatisticsSearch: search }),
}));

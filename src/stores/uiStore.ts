import type { Enums } from "@/types/supabase";
import { create } from "zustand";

type TransactionDirection = Enums<"transaction_direction">;

interface AddTransactionDrawerState {
  isOpen: boolean;
  transactionType: TransactionDirection;
}

interface UIState {
  // Nav bar visibility (e.g. hide on scroll)
  isNavBarVisible: boolean;

  // Add transaction drawer
  addTransactionDrawer: AddTransactionDrawerState;

  // Actions
  setNavBarVisible: (visible: boolean) => void;
  openAddTransactionDrawer: (type?: TransactionDirection) => void;
  closeAddTransactionDrawer: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isNavBarVisible: true,
  addTransactionDrawer: {
    isOpen: false,
    transactionType: "expense",
  },

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
}));

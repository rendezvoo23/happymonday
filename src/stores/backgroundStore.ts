import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BackgroundId } from "../config/backgrounds";

interface BackgroundState {
  activeBackgroundId: BackgroundId;
  setBackground: (id: BackgroundId) => void;
}

export const useBackgroundStore = create<BackgroundState>()(
  persist(
    (set) => ({
      activeBackgroundId: "variant-3", // Default to the one currently used
      setBackground: (id) => set({ activeBackgroundId: id }),
    }),
    {
      name: "finance-pwa-background",
    }
  )
);

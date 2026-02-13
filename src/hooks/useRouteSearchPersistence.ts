import type { ChartMode } from "@/stores/uiStore";
import { useUIStore } from "@/stores/uiStore";
import { useLocation, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";

const MODE_SCHEMA = ["day", "week", "month"] as const;

function isValidMonth(month: unknown): month is string {
  return typeof month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

/**
 * Persists current route's search params to the UI store so they are
 * restored when switching tabs in the NavBar.
 */
export function useRouteSearchPersistence() {
  const location = useLocation();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const setLastHomeSearch = useUIStore((s) => s.setLastHomeSearch);
  const setLastStatisticsSearch = useUIStore((s) => s.setLastStatisticsSearch);

  useEffect(() => {
    const pathname = location.pathname;

    if (pathname === "/home") {
      const month = isValidMonth(search?.month) ? search.month : undefined;
      const mode =
        typeof search?.mode === "string" &&
        MODE_SCHEMA.includes(search.mode as ChartMode)
          ? (search.mode as ChartMode)
          : undefined;
      setLastHomeSearch({ month, mode });
    }

    const isStatisticsMain =
      pathname === "/statistics" ||
      pathname === "/statistics/" ||
      (pathname.startsWith("/statistics/") &&
        !pathname.startsWith("/statistics/history"));
    if (isStatisticsMain) {
      // Month can be in search or in path (e.g. /statistics/2025-10)
      let month = isValidMonth(search?.month) ? search.month : undefined;
      const pathMonth = pathname.match(/^\/statistics\/(\d{4}-\d{2})/)?.[1];
      if (!month && pathMonth && isValidMonth(pathMonth)) {
        month = pathMonth;
      }
      const mode =
        typeof search?.mode === "string" &&
        MODE_SCHEMA.includes(search.mode as ChartMode)
          ? (search.mode as ChartMode)
          : undefined;
      const category =
        typeof search?.category === "string" && search.category.length > 0
          ? search.category
          : undefined;
      setLastStatisticsSearch({ month, mode, category });
    }
  }, [
    location.pathname,
    location.search,
    search,
    setLastHomeSearch,
    setLastStatisticsSearch,
  ]);
}

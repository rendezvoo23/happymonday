import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

const modeSchema = ["day", "week", "month"] as const;
type ChartMode = (typeof modeSchema)[number];

export const Route = createFileRoute("/_authenticated/statistics/")({
  validateSearch: (search: Record<string, unknown>) => {
    const month =
      typeof search.month === "string" &&
      /^\d{4}-(0[1-9]|1[0-2])$/.test(search.month)
        ? search.month
        : undefined;
    const mode =
      typeof search.mode === "string" &&
      modeSchema.includes(search.mode as ChartMode)
        ? (search.mode as ChartMode)
        : undefined;
    const category =
      typeof search.category === "string" && search.category.length > 0
        ? search.category
        : undefined;
    return { month, mode, category };
  },
  component: lazyRouteComponent(() =>
    import("@/pages/statistics-page").then((m) => ({
      default: m.StatisticsPage,
    }))
  ),
});

import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

const modeSchema = ["day", "week", "month"] as const;

export const Route = createFileRoute("/_authenticated/home")({
  validateSearch: (search: Record<string, unknown>) => {
    const month = typeof search.month === "string" ? search.month : undefined;
    const validMonth =
      month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : undefined;
    const mode =
      typeof search.mode === "string" &&
      modeSchema.includes(search.mode as (typeof modeSchema)[number])
        ? (search.mode as (typeof modeSchema)[number])
        : undefined;
    return { month: validMonth, mode };
  },
  component: lazyRouteComponent(() =>
    import("@/pages/home-page").then((m) => ({ default: m.HomePage }))
  ),
});

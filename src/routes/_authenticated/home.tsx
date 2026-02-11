import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/home")({
  validateSearch: (search: Record<string, unknown>) => {
    const month = typeof search.month === "string" ? search.month : undefined;
    // Validate YYYY-MM format
    if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return { month };
    }
    return { month: undefined };
  },
  component: lazyRouteComponent(() =>
    import("@/pages/home-page").then((m) => ({ default: m.HomePage }))
  ),
});

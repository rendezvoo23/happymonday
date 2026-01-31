import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/history")({
  component: lazyRouteComponent(() =>
    import("@/pages/history-page").then((m) => ({ default: m.HistoryPage }))
  ),
});

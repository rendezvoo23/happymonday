import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/")({
  component: lazyRouteComponent(() =>
    import("@/pages/settings-page").then((m) => ({ default: m.SettingsPage }))
  ),
});

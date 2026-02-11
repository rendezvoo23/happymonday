import { Navigate, createFileRoute } from "@tanstack/react-router";

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const Route = createFileRoute("/")({
  component: () => (
    <Navigate
      to="/home"
      search={{ month: getCurrentMonthKey() }}
      replace
    />
  ),
});

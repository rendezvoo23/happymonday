import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/statistics')({
  component: StatisticsLayout,
});

function StatisticsLayout() {
  return <Outlet />;
}

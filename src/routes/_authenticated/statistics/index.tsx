import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/statistics/')({
  component: lazyRouteComponent(() => import('@/pages/statistics-page').then(m => ({ default: m.StatisticsPage }))),
});

import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/home')({
  component: lazyRouteComponent(() => import('@/pages/home-page').then(m => ({ default: m.HomePage }))),
});

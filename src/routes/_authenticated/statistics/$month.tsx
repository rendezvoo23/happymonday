import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/statistics/$month')({
  component: lazyRouteComponent(() => 
    import('@/pages/statistics-page').then(m => {
      function MonthStatisticsPage() {
        const { month } = Route.useParams();
        return <m.StatisticsPage selectedMonth={month} />;
      }
      return { default: MonthStatisticsPage };
    })
  ),
});

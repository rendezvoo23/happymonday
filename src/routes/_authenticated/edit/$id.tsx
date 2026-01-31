import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/edit/$id")({
  component: lazyRouteComponent(() =>
    import("@/pages/edit-transaction-page").then((m) => {
      function EditTransactionPageRoute() {
        const { id } = Route.useParams();
        return <m.EditTransactionPage transactionId={id} />;
      }
      return { default: EditTransactionPageRoute };
    })
  ),
});

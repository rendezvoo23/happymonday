import { BottomNav } from "@/components/layout/BottomNav";
import { useRouteSearchPersistence } from "@/hooks/useRouteSearchPersistence";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
  pendingComponent: LoadingScreen,
});

function AuthenticatedLayout() {
  useRouteSearchPersistence();

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Outlet />
      </motion.div>
      <BottomNav />
    </>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center bg-[var(--background)] text-gray-900 dark:text-gray-100">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  );
}

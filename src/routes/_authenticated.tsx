import { BottomNav } from "@/components/layout/BottomNav";
import { useRouteSearchPersistence } from "@/hooks/useRouteSearchPersistence";
import { useUIStore } from "@/stores/uiStore";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

const INPUT_SELECTOR =
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, [contenteditable="true"]';

function isInputLike(el: EventTarget | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  return el.matches(INPUT_SELECTOR);
}

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
  pendingComponent: LoadingScreen,
});

function AuthenticatedLayout() {
  useRouteSearchPersistence();
  const setNavBarVisible = useUIStore((s) => s.setNavBarVisible);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (isInputLike(e.target)) setNavBarVisible(false);
    };
    const handleFocusOut = (e: FocusEvent) => {
      if (!isInputLike(e.target)) return;
      // Defer to allow focus to move to the new element
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (!active || !isInputLike(active)) setNavBarVisible(true);
      });
    };
    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("focusout", handleFocusOut, true);
    return () => {
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
    };
  }, [setNavBarVisible]);

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

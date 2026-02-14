import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

type BackButtonOptions = {
  to?: string;
  search?: Record<string, unknown>;
  /** When true, uses history.back() to return to the previous page */
  back?: boolean;
};

export function useTelegramBackButton({
  to = "..",
  search,
  back = false,
}: BackButtonOptions = {}) {
  const navigate = useNavigate();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      return;
    }

    // Show the back button
    tg.BackButton.show();

    // Set up the click handler
    const handleBackClick = () => {
      if (back) {
        window.history.back();
      } else {
        navigate({ to, ...(search && { search }) });
      }
    };

    tg.BackButton.onClick(handleBackClick);

    // Cleanup: hide the back button and remove the click handler
    return () => {
      tg.BackButton.hide();
      tg.BackButton.offClick(handleBackClick);
    };
  }, [navigate, to, search, back]);
}

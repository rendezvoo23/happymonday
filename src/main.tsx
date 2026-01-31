import { registerSW } from "virtual:pwa-register";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DateProvider } from "./context/DateContext";
import { LocaleProvider } from "./context/LocaleContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import "./lib/i18n";
import { queryClient, router } from "./router";
import "./styles/globals.css";

// Register PWA Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("New content available. Reload?")) {
      updateSW(true);
    }
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ThemeProvider>
          <DateProvider>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </DateProvider>
        </ThemeProvider>
      </LocaleProvider>
    </QueryClientProvider>
  </StrictMode>
);

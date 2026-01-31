import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  actualTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // Update Telegram WebApp colors to match theme
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;

    if (theme === "dark") {
      // For dark theme → black header
      tg.setHeaderColor("#000000");
      tg.setBackgroundColor("#000000");
    } else {
      // For light theme → white header
      tg.setHeaderColor("#ffffff");
      tg.setBackgroundColor("#ffffff");
    }
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [storedTheme, setStoredTheme] = useLocalStorage<Theme>(
    "theme",
    "system"
  );
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() =>
    getSystemTheme()
  );
  const actualTheme = storedTheme === "system" ? systemTheme : storedTheme;

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyTheme(actualTheme);
  }, [actualTheme]);

  // Listen for system theme changes when using "system" mode
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const newSystemTheme = e.matches ? "dark" : "light";
      setSystemTheme(newSystemTheme);
      if (storedTheme === "system") {
        applyTheme(newSystemTheme);
      }
    };

    // Set initial system theme
    setSystemTheme(getSystemTheme());

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [storedTheme]);

  const setTheme = useCallback(
    (theme: Theme) => {
      setStoredTheme(theme);
    },
    [setStoredTheme]
  );

  return (
    <ThemeContext.Provider
      value={{
        theme: storedTheme,
        actualTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

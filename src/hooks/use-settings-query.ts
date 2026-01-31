import { getSettings } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

// Query keys
export const settingsKeys = {
  all: ["settings"] as const,
  detail: () => [...settingsKeys.all, "detail"] as const,
};

// Hook to fetch user settings
export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.detail(),
    queryFn: getSettings,
    staleTime: 1000 * 60 * 30, // 30 minutes - settings don't change often
  });
}

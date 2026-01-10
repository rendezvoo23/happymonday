import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parses Telegram initData URL-encoded string into a JSON object.
 * Values that are valid JSON (like the `user` field) are automatically parsed.
 */
export function parseInitData(initData: string): Record<string, unknown> & { user: TelegramUser } {
  const params = new URLSearchParams(initData);
  const result: Record<string, unknown> = {};

  for (const [key, value] of params.entries()) {
    try {
      result[key] = JSON.parse(decodeURIComponent(value));
    } catch {
      result[key] = value;
    }
  }

  return result as Record<string, unknown> & { user: TelegramUser };
}

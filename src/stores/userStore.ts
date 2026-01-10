import { create } from "zustand";
import { supabase } from "../lib/supabaseClient";
import type { Tables, TablesUpdate } from "../types/supabase";

type Profile = Tables<"profiles">;
type UserSettings = Tables<"user_settings">;
type UserSettingsUpdate = TablesUpdate<"user_settings">;
type Currency = Tables<"currencies">;

interface UserState {
  profile: Profile | null;
  settings: UserSettings | null;
  currencies: Currency[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadProfile: () => Promise<void>;
  loadSettings: () => Promise<void>;
  loadCurrencies: () => Promise<void>;
  updateSettings: (updates: UserSettingsUpdate) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  settings: null,
  currencies: [],
  isLoading: false,
  error: null,

  loadProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError) throw userError;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single();

      if (error) throw error;
      set({ profile: data, isLoading: false });
    } catch (err: unknown) {
      console.error("Failed to load profile", err);
      set({
        error: err instanceof Error ? err.message : "Failed to load profile",
        isLoading: false,
      });
    }
  },

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError) throw userError;

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (error) throw error;
      set({ settings: data, isLoading: false });
    } catch (err: unknown) {
      console.error("Failed to load settings", err);
      set({
        error: err instanceof Error ? err.message : "Failed to load settings",
        isLoading: false,
      });
    }
  },

  loadCurrencies: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("currencies")
        .select("*")
        .eq("is_active", true)
        .order("code");

      if (error) throw error;
      set({ currencies: data, isLoading: false });
    } catch (err: unknown) {
      console.error("Failed to load currencies", err);
      set({
        error: err instanceof Error ? err.message : "Failed to load currencies",
        isLoading: false,
      });
    }
  },

  updateSettings: async (updates) => {
    set({ isLoading: true, error: null });
    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError) throw userError;

      const existingSettings = get().settings;
      const default_currency =
        updates.default_currency || existingSettings?.default_currency || "USD";

      // Merge with existing settings to prevent overwriting missing fields
      const upsertData = {
        ...(existingSettings || {}),
        ...updates,
        user_id: userData.user.id,
        default_currency,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("user_settings")
        .upsert(upsertData, { onConflict: "user_id" });

      if (error) throw error;

      // Optimistic update
      set((state) => ({
        settings: state.settings
          ? {
              ...state.settings,
              ...updates,
              updated_at: new Date().toISOString(),
            }
          : ({
              user_id: userData.user.id,
              default_currency,
              language: updates.language || "en",
              timezone: updates.timezone || "UTC",
              week_start: updates.week_start || 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...updates,
            } as UserSettings),
        isLoading: false,
      }));
    } catch (err: unknown) {
      console.error("Failed to update settings", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update settings";
      set({ error: errorMessage, isLoading: false });
      throw err;
    }
  },
}));

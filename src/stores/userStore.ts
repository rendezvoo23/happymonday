import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import type { Tables, TablesUpdate } from '../types/supabase';

type Profile = Tables<'profiles'>;
type UserSettings = Tables<'user_settings'>;
type UserSettingsUpdate = TablesUpdate<'user_settings'>;

interface UserState {
    profile: Profile | null;
    settings: UserSettings | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    loadProfile: () => Promise<void>;
    loadSettings: () => Promise<void>;
    updateSettings: (updates: UserSettingsUpdate) => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
    profile: null,
    settings: null,
    isLoading: false,
    error: null,

    loadProfile: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userData.user.id)
                .single();

            if (error) throw error;
            set({ profile: data, isLoading: false });
        } catch (err: any) {
            console.error('Failed to load profile', err);
            set({ error: err.message, isLoading: false });
        }
    },

    loadSettings: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;

            const { data, error } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', userData.user.id)
                .single();

            if (error) throw error;
            set({ settings: data, isLoading: false });
        } catch (err: any) {
            console.error('Failed to load settings', err);
            set({ error: err.message, isLoading: false });
        }
    },

    updateSettings: async (updates) => {
        set({ isLoading: true, error: null });
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;

            const { error } = await supabase
                .from('user_settings')
                .update(updates)
                .eq('user_id', userData.user.id);

            if (error) throw error;

            // Optimistic update
            set((state) => ({
                settings: state.settings ? { ...state.settings, ...updates } : null,
                isLoading: false,
            }));
        } catch (err: any) {
            console.error('Failed to update settings', err);
            set({ error: err.message, isLoading: false });
        }
    },
}));

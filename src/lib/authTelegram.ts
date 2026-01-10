
import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';

export interface TelegramAuthResponse {
    session: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        user: User;
    };
    user: User;
}

export const authenticateWithTelegram = async (): Promise<boolean> => {
    try {
        console.log("Authenticating with Telegram...")
        // 1. Initialise Telegram WebApp
        if (!window.Telegram?.WebApp) {
            console.error('Telegram WebApp not available');
            return false;
        }
        window.Telegram.WebApp.ready();
        const initData = window.Telegram.WebApp.initData;

        if (!initData) {
            console.error('No initData available');
            return false;
        }

        const { data: invokeData, error: invokeError } = await supabase.functions.invoke<TelegramAuthResponse>('auth-telegram', {
            body: { initData },
        });

        if (invokeError || !invokeData) {
            console.error('Auth function failed:', invokeError);
            console.log({ invokeData, invokeError });
            return false;
        }

        // 3. Set Supabase Session
        const { error: sessionError } = await supabase.auth.setSession({
            access_token: invokeData.session.access_token,
            refresh_token: invokeData.session.refresh_token,
        });

        if (sessionError) {
            console.error('Failed to set Supabase session:', sessionError);
            return false;
        }

        return true;

    } catch (error) {
        console.error('Authentication error:', error);
        return false;
    }
};

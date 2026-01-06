
import { supabase } from './supabaseClient';

const FUNCTION_URL = 'https://cqmroflpiyhruljtknrw.supabase.co/functions/v1/auth-telegram';

export interface TelegramAuthResponse {
    session: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        user: any;
    };
    user: any;
}

export const authenticateWithTelegram = async (): Promise<boolean> => {
    try {
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

        // 2. Call Edge Function
        const response = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ initData }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Auth function failed:', response.status, errorText);
            return false;
        }

        const data: TelegramAuthResponse = await response.json();

        if (!data.session || !data.session.access_token) {
            console.error('Invalid session data received', data);
            return false;
        }

        // 3. Set Supabase Session
        const { error } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
        });

        if (error) {
            console.error('Failed to set Supabase session:', error);
            return false;
        }

        return true;

    } catch (error) {
        console.error('Authentication error:', error);
        return false;
    }
};

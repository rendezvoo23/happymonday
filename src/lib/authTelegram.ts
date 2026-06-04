import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

export interface TelegramAuthResponse {
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: User;
  };
  user: User;
}

export const authenticateWithTelegram = async (): Promise<void> => {
  console.log("Authenticating with Telegram...");

  if (!window.Telegram?.WebApp) {
    throw new Error("Telegram WebApp is not available.");
  }

  window.Telegram.WebApp.ready();
  const initData = window.Telegram.WebApp.initData;

  if (!initData) {
    throw new Error("Telegram authentication data is missing.");
  }

  const { data: invokeData, error: invokeError } =
    await supabase.functions.invoke<TelegramAuthResponse>("auth-telegram", {
      body: { initData },
    });

  if (invokeError || !invokeData?.session) {
    throw invokeError ?? new Error("Telegram authentication failed.");
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: invokeData.session.access_token,
    refresh_token: invokeData.session.refresh_token,
  });

  if (sessionError) {
    throw sessionError;
  }
};

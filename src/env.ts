export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  isDev: import.meta.env.VITE_IS_DEV === "true",
  devInitData: import.meta.env.VITE_DEV_INIT_DATA,
};

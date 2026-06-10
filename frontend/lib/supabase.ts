// ─────────────────────────────────────────────────────────────────
// Supabase browser client
// Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
// ─────────────────────────────────────────────────────────────────

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Custom storage: respects "wall_remember_me" flag in localStorage.
// If true  → tokens go to localStorage  (survive tab/browser close)
// If false → tokens go to sessionStorage (cleared when tab closes)
const rememberMeStorage =
  typeof window !== "undefined"
    ? {
        getItem: (key: string): string | null => {
          const remember = localStorage.getItem("wall_remember_me");
          return remember === "true"
            ? localStorage.getItem(key)
            : sessionStorage.getItem(key);
        },
        setItem: (key: string, value: string): void => {
          const remember = localStorage.getItem("wall_remember_me");
          if (remember === "true") {
            localStorage.setItem(key, value);
          } else {
            sessionStorage.setItem(key, value);
          }
        },
        removeItem: (key: string): void => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        },
      }
    : undefined;

let _client: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  // Singleton — avoid re-creating on every render
  if (_client) return _client;

  // During SSR/SSG prerender, env vars may be empty — return a no-op client
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Return a minimal stub so imports don't crash during build
    return createSupabaseClient("https://placeholder.supabase.co", "placeholder", {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }

  _client = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: rememberMeStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}

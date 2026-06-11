"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** True if the user's email has been verified */
  isVerified: boolean;
  /** Was this session kicked out because another device logged in? */
  kickedOut: boolean;
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearKickedOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────
// Session nonce helpers — used for single-session enforcement
// ─────────────────────────────────────────────────────────────────

const SESSION_NONCE_KEY = "wall_session_nonce";

function getStoredNonce(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(SESSION_NONCE_KEY) ||
    sessionStorage.getItem(SESSION_NONCE_KEY)
  );
}
function storeNonce(nonce: string, persist: boolean) {
  if (typeof window === "undefined") return;
  if (persist) {
    localStorage.setItem(SESSION_NONCE_KEY, nonce);
  } else {
    sessionStorage.setItem(SESSION_NONCE_KEY, nonce);
  }
}
function clearNonce() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_NONCE_KEY);
  sessionStorage.removeItem(SESSION_NONCE_KEY);
}
function generateNonce(): string {
  return crypto.randomUUID();
}

const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

async function registerSession(accessToken: string, nonce: string): Promise<boolean> {
  try {
    const res = await fetch(`${API}/auth/register-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ session_token: nonce }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function validateSession(accessToken: string, nonce: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${API}/auth/validate-session?session_token=${encodeURIComponent(nonce)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return res.ok;
  } catch {
    // If backend is unreachable, don't kick the user out
    return true;
  }
}

// ─────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [kickedOut, setKickedOut] = useState(false);
  const validateIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const isVerified = !!user?.email_confirmed_at;

  // ── Periodic session validation (every 20s + on visibility/focus change) ──
  const startValidationLoop = useCallback(
    (sess: Session, nonce: string) => {
      if (validateIntervalRef.current) clearInterval(validateIntervalRef.current);

      const check = async () => {
        const valid = await validateSession(sess.access_token, nonce);
        if (!valid) {
          clearNonce();
          await supabase.auth.signOut();
          setKickedOut(true);
        }
      };

      // Poll every 20 seconds.
      // NOTE: We do NOT call check() immediately here — callers are responsible
      // for ensuring the nonce is registered in the backend before starting
      // this loop, so the first poll at 20s is always safe.
      validateIntervalRef.current = setInterval(check, 20_000);

      // Also check on window focus AND tab visibility change
      // (visibilitychange is more reliable across Chrome profiles than focus)
      const onFocus = () => check();
      const onVisibility = () => {
        if (document.visibilityState === "visible") check();
      };
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onVisibility);

      return () => {
        if (validateIntervalRef.current) clearInterval(validateIntervalRef.current);
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onVisibility);
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Bootstrap — restore session on mount ──────────────────────
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);

      if (sess) {
        let nonce = getStoredNonce();

        if (!nonce) {
          // No nonce stored — this session predates enforcement, or
          // a previous registerSession failed. Register a fresh nonce now
          // so enforcement starts immediately for this session.
          nonce = generateNonce();
          const rememberMe = typeof window !== "undefined"
            ? localStorage.getItem("wall_remember_me") === "true"
            : false;
          const ok = await registerSession(sess.access_token, nonce);
          if (ok) {
            storeNonce(nonce, rememberMe);
          } else {
            // Backend unreachable — store locally anyway so we can at least
            // detect multi-tab within this browser
            storeNonce(nonce, rememberMe);
          }
        } else {
          // Nonce exists — do an immediate validation before starting the loop
          const valid = await validateSession(sess.access_token, nonce);
          if (!valid) {
            clearNonce();
            await supabase.auth.signOut();
            setKickedOut(true);
            return;
          }
        }

        cleanup = startValidationLoop(sess, nonce);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, sess) => {
        setSession(sess);
        setUser(sess?.user ?? null);
        if (!sess) {
          clearNonce();
          if (validateIntervalRef.current) clearInterval(validateIntervalRef.current);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sign In ───────────────────────────────────────────────────
  const signIn = useCallback(
    async (email: string, password: string, rememberMe: boolean) => {
      // Set remember-me flag BEFORE supabase call so custom storage picks it up
      if (typeof window !== "undefined") {
        localStorage.setItem("wall_remember_me", rememberMe ? "true" : "false");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error: error.message };
      if (!data.session) return { error: "No session returned." };

      // Generate a fresh nonce for this login.
      const nonce = generateNonce();
      storeNonce(nonce, rememberMe);

      // MUST await registration before starting the loop — the first
      // visibility/focus-triggered check would otherwise race against the
      // POST and see the stale nonce from a previous session in the DB,
      // triggering a false "signed in from another device" kick.
      try {
        await registerSession(data.session.access_token, nonce);
      } catch {
        // Backend unreachable — stored nonce locally above; grace period
        // (stored=null) will return "valid" until backend comes back.
      }

      startValidationLoop(data.session, nonce);

      return { error: null };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startValidationLoop]
  );


  // ── Sign Up ───────────────────────────────────────────────────
  const signUp = useCallback(async (email: string, password: string) => {
    // Use the current origin so the verification link in the email redirects
    // back to the actual deployed site (not localhost). Falls back to the
    // Vercel deployment URL if window is unavailable (SSR).
    const siteOrigin =
      typeof window !== "undefined"
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_SITE_URL ?? "https://the-wall-fawn.vercel.app");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteOrigin}/login`,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  }, [supabase]);

  // ── Sign In with Google ───────────────────────────────────────
  const signInWithGoogle = useCallback(async () => {
    const siteOrigin =
      typeof window !== "undefined"
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_SITE_URL ?? "https://the-wall-fawn.vercel.app");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteOrigin}/`,
      },
    });
  }, [supabase]);

  // ── Sign Out ──────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    if (validateIntervalRef.current) clearInterval(validateIntervalRef.current);
    clearNonce();
    if (typeof window !== "undefined") {
      localStorage.removeItem("wall_remember_me");
    }
    await supabase.auth.signOut();
  }, [supabase]);

  const clearKickedOut = useCallback(() => setKickedOut(false), []);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, isVerified, kickedOut, signIn, signUp, signInWithGoogle, signOut, clearKickedOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

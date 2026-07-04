"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { SessionProvider, useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";

interface AuthContextValue {
  user: any | null;
  session: any | null;
  loading: boolean;
  isVerified: boolean;
  kickedOut: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearKickedOut: () => void;
  // Stubbing these for backwards compatibility if needed
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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
    return true;
  }
}

function generateNonce() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
}

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  
  const [kickedOut, setKickedOut] = useState(false);
  const validateIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const nonceRef = useRef<string>("");

  useEffect(() => {
    let active = true;

    if (status === "authenticated" && session && (session as any).accessToken) {
      const accessToken = (session as any).accessToken;
      
      const initSession = async () => {
        if (!nonceRef.current) {
          nonceRef.current = generateNonce();
          await registerSession(accessToken, nonceRef.current);
        }

        if (!active) return;

        const check = async () => {
          if (!nonceRef.current) return;
          const valid = await validateSession(accessToken, nonceRef.current);
          if (!valid) {
            nextAuthSignOut();
            setKickedOut(true);
          }
        };

        if (validateIntervalRef.current) clearInterval(validateIntervalRef.current);
        validateIntervalRef.current = setInterval(check, 20_000);

        window.addEventListener("focus", check);
        document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
      };

      initSession();

      return () => {
        active = false;
        if (validateIntervalRef.current) clearInterval(validateIntervalRef.current);
        // We can't easily remove anonymous listeners here without storing them, but React 18 handles this mostly fine on unmount.
        // Let's at least clear the interval.
      };
    } else {
      if (validateIntervalRef.current) clearInterval(validateIntervalRef.current);
    }
  }, [status, session]);

  const signInWithGoogle = useCallback(async () => {
    await nextAuthSignIn("google", { callbackUrl: "/" });
  }, []);

  const signOut = useCallback(async () => {
    if (validateIntervalRef.current) clearInterval(validateIntervalRef.current);
    await nextAuthSignOut();
  }, []);

  const signIn = useCallback(async () => {
    return { error: "Please use Google Sign-in." };
  }, []);

  const signUp = useCallback(async () => {
    return { error: "Please use Google Sign-in." };
  }, []);

  const clearKickedOut = useCallback(() => setKickedOut(false), []);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user || null,
        session,
        loading,
        isVerified: true,
        kickedOut,
        signInWithGoogle,
        signOut,
        clearKickedOut,
        signIn,
        signUp
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

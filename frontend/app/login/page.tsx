"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

type Tab = "signin" | "signup";
type Phase = "form" | "check-inbox" | "error";

export default function LoginPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("signin");
  const [phase, setPhase] = useState<Phase>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    await signInWithGoogle();
    // Page will redirect — no need to setGoogleLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setErrorMsg("");

    if (tab === "signin") {
      const { error } = await signIn(email.trim(), password, rememberMe);
      if (error) {
        setPhase("error");
        setErrorMsg(error.includes("Email not confirmed")
          ? "Your email isn't verified yet — check your inbox."
          : error.includes("Invalid login")
          ? "Wrong email or password. Try again."
          : error);
      } else {
        router.push("/");
      }
    } else {
      const { error } = await signUp(email.trim(), password);
      if (error) {
        setPhase("error");
        setErrorMsg(error.includes("already registered")
          ? "That email already has an account. Sign in instead."
          : error);
      } else {
        setPhase("check-inbox");
      }
    }

    setLoading(false);
  }

  function switchTab(t: Tab) {
    setTab(t);
    setPhase("form");
    setErrorMsg("");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f0e8",
        fontFamily: "'Space Grotesk', sans-serif",
        color: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        style={{
          borderBottom: "2px solid #0a0a0a",
          padding: "20px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <a
          href="/"
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: -1,
            color: "#0a0a0a",
            textDecoration: "none",
          }}
        >
          THE WALL
        </a>
        <span
          style={{
            fontSize: 11,
            fontFamily: "'Space Mono', monospace",
            color: "#8a8070",
          }}
        >
          anonymous. judged. roasted. posted.
        </span>
      </div>

      {/* ── Main ────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* ── Check inbox state ─────────────────────────── */}
          {phase === "check-inbox" ? (
            <div
              style={{
                border: "2px solid #0a0a0a",
                padding: 32,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 32,
                  marginBottom: 16,
                }}
              >
                ✉
              </div>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 14,
                  fontWeight: 700,
                  marginBottom: 10,
                  letterSpacing: "0.04em",
                }}
              >
                CHECK YOUR INBOX
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#8a8070",
                  lineHeight: 1.6,
                  marginBottom: 24,
                }}
              >
                We sent a verification link to{" "}
                <strong style={{ color: "#0a0a0a" }}>{email}</strong>. Click it
                to activate your account — then come back to confess.
              </div>
              <button
                onClick={() => {
                  setPhase("form");
                  setTab("signin");
                }}
                style={{
                  padding: "10px 24px",
                  border: "1.5px solid #0a0a0a",
                  background: "transparent",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 13,
                  cursor: "pointer",
                  color: "#0a0a0a",
                }}
              >
                back to sign in
              </button>
            </div>
          ) : (
            <>
              {/* ── Tab toggle ───────────────────────────── */}
              <div
                style={{
                  display: "flex",
                  borderBottom: "2px solid #0a0a0a",
                  marginBottom: 0,
                }}
              >
                {(["signin", "signup"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => switchTab(t)}
                    style={{
                      flex: 1,
                      padding: "14px 0",
                      border: "none",
                      borderBottom: tab === t ? "3px solid #d63a2a" : "3px solid transparent",
                      background: "transparent",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      cursor: "pointer",
                      color: tab === t ? "#0a0a0a" : "#8a8070",
                      fontWeight: tab === t ? 700 : 400,
                      transition: "all 0.12s",
                    }}
                  >
                    {t === "signin" ? "SIGN IN" : "SIGN UP"}
                  </button>
                ))}
              </div>

              {/* ── Google OAuth ─────────────────────────── */}
              <button
                id="google-signin-btn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                style={{
                  width: "100%",
                  padding: "11px 0",
                  border: "1.5px solid #0a0a0a",
                  background: "transparent",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: googleLoading ? "wait" : "pointer",
                  color: "#0a0a0a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  transition: "all 0.12s",
                  letterSpacing: "0.01em",
                }}
                onMouseEnter={(e) => { if (!googleLoading) { e.currentTarget.style.background = "#0a0a0a"; e.currentTarget.style.color = "#f5f0e8"; }}}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#0a0a0a"; }}
              >
                {/* Google G icon */}
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                {googleLoading ? "redirecting..." : "continue with google"}
              </button>

              {/* Divider */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                margin: "16px 0 0",
              }}>
                <div style={{ flex: 1, height: 1, background: "#d0c9be" }} />
                <span style={{
                  fontSize: 10,
                  fontFamily: "'Space Mono', monospace",
                  color: "#8a8070",
                  letterSpacing: "0.06em",
                  flexShrink: 0,
                }}>OR</span>
                <div style={{ flex: 1, height: 1, background: "#d0c9be" }} />
              </div>

              {/* ── Form card ────────────────────────────── */}
              <div style={{ border: "2px solid #0a0a0a", borderTop: "none", padding: 28 }}>
                {/* Headline */}
                <div style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      letterSpacing: "-0.5px",
                      lineHeight: 1.15,
                      marginBottom: 6,
                    }}
                  >
                    {tab === "signin" ? (
                      <>
                        welcome back.<br />
                        <span style={{ color: "#d63a2a" }}>time to confess.</span>
                      </>
                    ) : (
                      <>
                        ready to be<br />
                        <span style={{ color: "#d63a2a" }}>roasted alive?</span>
                      </>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#8a8070",
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    {tab === "signin"
                      ? "enter credentials. no mercy."
                      : "create account. get verified. confess."}
                  </div>
                </div>

                {/* Error banner */}
                {phase === "error" && errorMsg && (
                  <div
                    style={{
                      background: "#FAECE7",
                      border: "1px solid #d63a2a",
                      padding: "10px 14px",
                      fontSize: 12,
                      fontFamily: "'Space Mono', monospace",
                      color: "#d63a2a",
                      marginBottom: 20,
                      lineHeight: 1.5,
                    }}
                  >
                    ⚠ {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Email */}
                  <div style={{ marginBottom: 14 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 10,
                        fontFamily: "'Space Mono', monospace",
                        letterSpacing: "0.08em",
                        color: "#8a8070",
                        marginBottom: 6,
                      }}
                    >
                      EMAIL
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@somewhere.com"
                      required
                      autoComplete="email"
                      style={{
                        width: "100%",
                        border: "1.5px solid #0a0a0a",
                        background: "transparent",
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 14,
                        padding: "10px 12px",
                        color: "#0a0a0a",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#d63a2a")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#0a0a0a")}
                    />
                  </div>

                  {/* Password */}
                  <div style={{ marginBottom: 20 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 10,
                        fontFamily: "'Space Mono', monospace",
                        letterSpacing: "0.08em",
                        color: "#8a8070",
                        marginBottom: 6,
                      }}
                    >
                      PASSWORD
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        id="login-password"
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="minimum 6 characters"
                        required
                        minLength={6}
                        autoComplete={tab === "signin" ? "current-password" : "new-password"}
                        style={{
                          width: "100%",
                          border: "1.5px solid #0a0a0a",
                          background: "transparent",
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontSize: 14,
                          padding: "10px 44px 10px 12px",
                          color: "#0a0a0a",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#d63a2a")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "#0a0a0a")}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPass((s) => !s)}
                        style={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 10,
                          color: "#8a8070",
                          padding: 0,
                        }}
                      >
                        {showPass ? "hide" : "show"}
                      </button>
                    </div>
                  </div>

                  {/* Remember me — only on sign in */}
                  {tab === "signin" && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 20,
                        cursor: "pointer",
                      }}
                      onClick={() => setRememberMe((r) => !r)}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          border: "1.5px solid #0a0a0a",
                          background: rememberMe ? "#0a0a0a" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transition: "background 0.1s",
                        }}
                      >
                        {rememberMe && (
                          <span style={{ color: "#f5f0e8", fontSize: 10, lineHeight: 1 }}>✓</span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontFamily: "'Space Mono', monospace",
                          userSelect: "none",
                        }}
                      >
                        remember me
                      </span>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    id="login-submit"
                    type="submit"
                    disabled={loading || !email.trim() || !password}
                    style={{
                      width: "100%",
                      padding: "13px 0",
                      background:
                        loading || !email.trim() || !password ? "#d0c9be" : "#0a0a0a",
                      color: "#f5f0e8",
                      border: "none",
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 14,
                      fontWeight: 600,
                      letterSpacing: "0.02em",
                      cursor:
                        loading || !email.trim() || !password ? "not-allowed" : "pointer",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading && email.trim() && password)
                        e.currentTarget.style.background = "#d63a2a";
                    }}
                    onMouseLeave={(e) => {
                      if (!loading && email.trim() && password)
                        e.currentTarget.style.background = "#0a0a0a";
                    }}
                  >
                    {loading
                      ? "..."
                      : tab === "signin"
                      ? "sign in"
                      : "create account"}
                  </button>

                  {/* Switch tab link */}
                  <div
                    style={{
                      marginTop: 18,
                      textAlign: "center",
                      fontSize: 12,
                      fontFamily: "'Space Mono', monospace",
                      color: "#8a8070",
                    }}
                  >
                    {tab === "signin" ? (
                      <>
                        no account?{" "}
                        <button
                          type="button"
                          onClick={() => switchTab("signup")}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#0a0a0a",
                            cursor: "pointer",
                            fontFamily: "'Space Mono', monospace",
                            fontSize: 12,
                            textDecoration: "underline",
                            padding: 0,
                          }}
                        >
                          sign up
                        </button>
                      </>
                    ) : (
                      <>
                        already have one?{" "}
                        <button
                          type="button"
                          onClick={() => switchTab("signin")}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#0a0a0a",
                            cursor: "pointer",
                            fontFamily: "'Space Mono', monospace",
                            fontSize: 12,
                            textDecoration: "underline",
                            padding: 0,
                          }}
                        >
                          sign in
                        </button>
                      </>
                    )}
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div
        style={{
          padding: "14px 20px",
          borderTop: "1.5px solid #0a0a0a",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontFamily: "'Space Mono', monospace",
            color: "#8a8070",
          }}
        >
          the wall © 2025 — no gods, no mercy
        </span>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";

export default function LoginPrompt() {
  return (
    <div
      style={{
        padding: "24px 20px",
        borderBottom: "1.5px solid #0a0a0a",
      }}
    >
      {/* Heading */}
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: "-0.5px",
          lineHeight: 1.15,
          marginBottom: 6,
        }}
      >
        say it.<br />
        <span style={{ color: "#8a8070" }}>if you dare.</span>
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#8a8070",
          fontFamily: "'Space Mono', monospace",
          marginBottom: 20,
        }}
      >
        sign in to confess & get roasted.
      </div>

      {/* Blurred / locked form preview */}
      <div
        style={{
          border: "1.5px solid #d0c9be",
          padding: 14,
          position: "relative",
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        {/* Frosted overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(245,240,232,0.82)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              border: "2px solid #0a0a0a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            🔒
          </div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.06em",
              textAlign: "center",
              color: "#0a0a0a",
            }}
          >
            VERIFIED USERS ONLY
          </div>
        </div>

        {/* Dummy form (blurred behind) */}
        <div
          style={{
            opacity: 0.4,
            pointerEvents: "none",
            userSelect: "none",
            filter: "blur(2px)",
          }}
        >
          <div
            style={{
              height: 80,
              border: "1.5px solid #0a0a0a",
              marginBottom: 10,
              background: "#ede8df",
            }}
          />
          <div
            style={{
              height: 36,
              border: "1.5px solid #0a0a0a",
              marginBottom: 10,
              background: "#ede8df",
            }}
          />
          <div
            style={{
              height: 40,
              background: "#0a0a0a",
            }}
          />
        </div>
      </div>

      {/* CTA */}
      <Link
        href="/login"
        style={{
          display: "block",
          width: "100%",
          padding: "12px 0",
          background: "#0a0a0a",
          color: "#f5f0e8",
          textAlign: "center",
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
          letterSpacing: "0.02em",
          transition: "background 0.1s",
          border: "none",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#d63a2a")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#0a0a0a")}
      >
        sign in to confess
      </Link>

      <div
        style={{
          marginTop: 10,
          textAlign: "center",
          fontSize: 11,
          fontFamily: "'Space Mono', monospace",
          color: "#8a8070",
        }}
      >
        no account?{" "}
        <Link
          href="/login"
          style={{ color: "#0a0a0a", textDecoration: "underline" }}
        >
          sign up free
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";

export default function KickedOutBanner() {
  const { kickedOut, clearKickedOut } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (kickedOut) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        clearKickedOut();
      }, 6000);
      return () => clearTimeout(t);
    }
  }, [kickedOut, clearKickedOut]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#d63a2a",
        color: "#fff",
        padding: "12px 20px",
        fontSize: 12,
        fontFamily: "'Space Mono', monospace",
        letterSpacing: "0.05em",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span>⚠ you were signed in from another device — session terminated.</span>
      <button
        onClick={() => { setVisible(false); clearKickedOut(); }}
        style={{
          background: "none",
          border: "1px solid rgba(255,255,255,0.5)",
          color: "#fff",
          cursor: "pointer",
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          padding: "2px 8px",
        }}
      >
        OK
      </button>
    </div>
  );
}

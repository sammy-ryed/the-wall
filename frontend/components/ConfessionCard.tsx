"use client";

import { useEffect, useState, useRef } from "react";
import type { Confession } from "@/lib/api";
import { formatTimestamp } from "@/lib/api";

interface Props {
  item: Confession;
}

/** Maps a score to the right chip class */
function chipClass(score: number, type: "cringe" | "surv") {
  if (type === "cringe") {
    if (score >= 80) return "chip-high";
    if (score >= 50) return "chip-mid";
    return "chip-low";
  } else {
    // survival — low survival is BAD so inverted
    if (score <= 25) return "chip-high";
    if (score <= 65) return "chip-mid";
    return "chip-low";
  }
}

/** Two-letter avatar from name */
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Deterministic background colour for avatar based on name */
const AVATAR_PALETTES = [
  { bg: "#0a0a0a", fg: "#f5f0e8" },
  { bg: "#EEEDFE", fg: "#3C3489" },
  { bg: "#E1F5EE", fg: "#085041" },
  { bg: "#FAECE7", fg: "#712B13" },
  { bg: "#FEF9E7", fg: "#7D6608" },
  { bg: "#EAF2FB", fg: "#1B4F72" },
];
function avatarColours(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_PALETTES[Math.abs(h) % AVATAR_PALETTES.length];
}

export default function ConfessionCard({ item }: Props) {
  const [barWidth, setBarWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const colours = avatarColours(item.name);

  // Animate cringe bar on mount
  useEffect(() => {
    timerRef.current = setTimeout(() => setBarWidth(item.cringe_score), 80);
    return () => clearTimeout(timerRef.current);
  }, [item.cringe_score]);

  return (
    <div
      className="confession-card"
      style={{
        borderBottom: "1.5px solid #0a0a0a",
        padding: "20px",
        cursor: "pointer",
        transition: "background 0.12s",
        position: "relative",
      }}
    >
      {/* ── Top row ─────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        {/* Avatar + name + time */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32, height: 32,
              border: "1.5px solid #0a0a0a",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700,
              fontFamily: "'Space Mono', monospace",
              flexShrink: 0,
              background: colours.bg,
              color: colours.fg,
            }}
          >
            {initials(item.name)}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</div>
            <div style={{ fontSize: 11, color: "#8a8070", fontFamily: "'Space Mono', monospace" }}>{formatTimestamp(item.timestamp)}</div>
          </div>
        </div>

        {/* Score chips */}
        <div style={{ display: "flex", gap: 6 }}>
          <span
            className={`score-chip ${chipClass(item.cringe_score, "cringe")}`}
            style={{
              fontSize: 10, fontFamily: "'Space Mono', monospace",
              padding: "3px 8px", border: "1px solid",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            cringe {item.cringe_score}
          </span>
          <span
            className={`score-chip ${chipClass(item.survival_probability, "surv")}`}
            style={{
              fontSize: 10, fontFamily: "'Space Mono', monospace",
              padding: "3px 8px", border: "1px solid",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            surv {item.survival_probability}%
          </span>
        </div>
      </div>

      {/* ── Confession text ──────────────────────── */}
      <p style={{ fontSize: 15, lineHeight: 1.55, marginBottom: 14, fontWeight: 400 }}>
        {item.confession}
      </p>

      {/* ── Roast bar ────────────────────────────── */}
      <div style={{ borderLeft: "3px solid #0a0a0a", padding: "8px 12px", background: "#ede8df" }}>
        {item.target_name ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginBottom: 5,
          }}>
            <span style={{
              fontSize: 9, fontFamily: "'Space Mono', monospace",
              background: "#d63a2a", color: "#fff", padding: "2px 6px",
              letterSpacing: "0.06em",
            }}>⚔ ROASTING {item.target_name.toUpperCase()}</span>
          </div>
        ) : (
          <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#8a8070", marginBottom: 3, letterSpacing: "0.06em" }}>ROAST</div>
        )}
        <div style={{ fontSize: 13, lineHeight: 1.45, fontStyle: "italic" }}>{item.roast}</div>
      </div>

      {/* ── Verdict + Era ────────────────────────── */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", padding: "3px 9px", border: "1px solid #0a0a0a" }}>
          {item.verdict}
        </span>
        <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", padding: "3px 9px", background: "#0a0a0a", color: "#f5f0e8" }}>
          {item.era}
        </span>
      </div>

      {/* ── Cringe bar ───────────────────────────── */}
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#8a8070", width: 48, flexShrink: 0 }}>CRINGE</span>
        <div style={{ flex: 1, height: 4, background: "#d0c9be", position: "relative" }}>
          <div className="cringe-fill" style={{ width: `${barWidth}%` }} />
        </div>
        <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", fontWeight: 700, width: 28, textAlign: "right", flexShrink: 0 }}>
          {item.cringe_score}
        </span>
      </div>
    </div>
  );
}

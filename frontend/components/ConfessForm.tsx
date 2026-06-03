"use client";

import { useState } from "react";
import { roastConfession, postConfession, type RoastResponse, type Confession } from "@/lib/api";

interface Props {
  onPosted: (c: Confession) => void;
}

type Phase = "form" | "loading" | "result" | "error";

export default function ConfessForm({ onPosted }: Props) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [roast, setRoast] = useState<RoastResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [posting, setPosting] = useState(false);

  const MAX = 300;

  async function handleSubmit() {
    if (!text.trim()) return;
    setPhase("loading");
    setRoast(null);
    setErrorMsg("");

    try {
      const result = await roastConfession(text.trim());
      setRoast(result);
      setPhase("result");
    } catch (e) {
      console.error(e);
      setErrorMsg("Even Claude refused to engage with this.");
      setPhase("error");
    }
  }

  async function handlePost() {
    if (!roast) return;
    setPosting(true);
    try {
      const posted = await postConfession({
        name: name.trim() || "Anonymous",
        confession: text.trim(),
        cringe_score: roast.cringe_score,
        survival_probability: roast.survival_probability,
        roast: roast.roast,
        verdict: roast.verdict,
        era: roast.era,
      });
      onPosted(posted);
      // Reset
      setText("");
      setName("");
      setRoast(null);
      setPhase("form");
    } catch (e) {
      console.error(e);
    } finally {
      setPosting(false);
    }
  }

  function handleTryAgain() {
    setPhase("form");
    setRoast(null);
    setErrorMsg("");
  }

  const survColour =
    roast && roast.survival_probability < 20
      ? "#d63a2a"
      : roast && roast.survival_probability < 60
      ? "#0a0a0a"
      : "#2a7a4b";

  return (
    <div style={{ padding: 20, borderBottom: "1.5px solid #0a0a0a" }}>
      {/* Heading */}
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.1, marginBottom: 4 }}>
        say it.<br />we rate it.
      </div>
      <div style={{ fontSize: 12, color: "#8a8070", fontFamily: "'Space Mono', monospace", marginBottom: 16 }}>
        anonymous. judged. roasted. posted.
      </div>

      {/* ── Form ──────────────────────────────────── */}
      {(phase === "form" || phase === "error") && (
        <>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX))}
              placeholder="what did you do..."
              maxLength={MAX}
              style={{
                width: "100%", height: 110,
                border: "1.5px solid #0a0a0a", background: "transparent",
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 14,
                padding: 12, resize: "none", color: "#0a0a0a", outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#d63a2a")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#0a0a0a")}
            />
            <span style={{
              position: "absolute", bottom: 10, right: 10,
              fontSize: 10, fontFamily: "'Space Mono', monospace",
              color: text.length >= MAX ? "#d63a2a" : "#8a8070",
            }}>
              {text.length}/{MAX}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="your name (or don't)"
              maxLength={30}
              style={{
                flex: 1, border: "1.5px solid #0a0a0a",
                background: "transparent",
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 13,
                padding: "8px 12px", color: "#0a0a0a", outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#d63a2a")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#0a0a0a")}
            />
          </div>

          {phase === "error" && (
            <div style={{ marginBottom: 10, padding: "8px 12px", border: "1px solid #d63a2a", background: "#FAECE7", fontSize: 12, color: "#d63a2a", fontFamily: "'Space Mono', monospace" }}>
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            style={{
              width: "100%", padding: 13,
              background: text.trim() ? "#0a0a0a" : "#d0c9be",
              color: "#f5f0e8",
              border: "none", fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 14, fontWeight: 600, cursor: text.trim() ? "pointer" : "not-allowed",
              letterSpacing: "0.02em", transition: "background 0.1s",
            }}
            onMouseEnter={(e) => { if (text.trim()) e.currentTarget.style.background = "#d63a2a"; }}
            onMouseLeave={(e) => { if (text.trim()) e.currentTarget.style.background = "#0a0a0a"; }}
          >
            get roasted
          </button>
        </>
      )}

      {/* ── Loading ───────────────────────────────── */}
      {phase === "loading" && (
        <div style={{ textAlign: "center", padding: "28px 0", fontFamily: "'Space Mono', monospace", fontSize: 13, color: "#8a8070" }}>
          <span className="loading-dots">reading your chaos</span>
        </div>
      )}

      {/* ── Result ────────────────────────────────── */}
      {phase === "result" && roast && (
        <div style={{ border: "1.5px solid #0a0a0a", padding: 14 }}>
          {/* Big scores */}
          <div style={{ display: "flex", marginBottom: 12 }}>
            <div style={{ flex: 1, padding: "10px 12px", textAlign: "center", borderRight: "1px solid #0a0a0a" }}>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#d63a2a" }}>
                {roast.cringe_score}
              </div>
              <div style={{ fontSize: 9, fontFamily: "'Space Mono', monospace", color: "#8a8070", marginTop: 3, letterSpacing: "0.06em" }}>CRINGE SCORE</div>
            </div>
            <div style={{ flex: 1, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: survColour }}>
                {roast.survival_probability}%
              </div>
              <div style={{ fontSize: 9, fontFamily: "'Space Mono', monospace", color: "#8a8070", marginTop: 3, letterSpacing: "0.06em" }}>SURVIVAL</div>
            </div>
          </div>

          {/* Roast text */}
          <div style={{ borderTop: "1px solid #0a0a0a", paddingTop: 10 }}>
            <div style={{ fontSize: 9, fontFamily: "'Space Mono', monospace", color: "#8a8070", marginBottom: 4, letterSpacing: "0.06em" }}>ROAST</div>
            <div style={{ fontSize: 13, fontStyle: "italic", lineHeight: 1.5, marginBottom: 8 }}>{roast.roast}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, padding: "2px 8px", border: "1px solid #0a0a0a", fontFamily: "'Space Mono', monospace" }}>{roast.verdict}</span>
              <span style={{ fontSize: 10, padding: "2px 8px", background: "#0a0a0a", color: "#f5f0e8", fontFamily: "'Space Mono', monospace" }}>{roast.era}</span>
            </div>
          </div>

          {/* Post + Try again */}
          <button
            onClick={handlePost}
            disabled={posting}
            style={{
              marginTop: 12, width: "100%", padding: 8,
              border: "1.5px solid #0a0a0a", background: "transparent",
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 12,
              cursor: posting ? "wait" : "pointer", color: "#0a0a0a", transition: "all 0.1s",
            }}
            onMouseEnter={(e) => { if (!posting) { e.currentTarget.style.background = "#0a0a0a"; e.currentTarget.style.color = "#f5f0e8"; }}}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#0a0a0a"; }}
          >
            {posting ? "posting..." : "post to wall"}
          </button>
          <button
            onClick={handleTryAgain}
            style={{
              marginTop: 6, width: "100%", padding: 8,
              border: "1px solid #d0c9be", background: "transparent",
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 12,
              cursor: "pointer", color: "#8a8070",
            }}
          >
            start over
          </button>
        </div>
      )}
    </div>
  );
}

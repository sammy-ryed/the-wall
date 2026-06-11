"use client";

import { useState, useEffect, useRef } from "react";
import type { Reply } from "@/lib/api";
import { getReplies, postReply, formatTimestamp } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

interface Props {
  confessionId: string;
}

// ── Avatar helpers ──────────────────────────────────────────────────
const REPLY_PALETTES = [
  { bg: "#EEEDFE", fg: "#3C3489" },
  { bg: "#E1F5EE", fg: "#085041" },
  { bg: "#FAECE7", fg: "#712B13" },
  { bg: "#FEF9E7", fg: "#7D6608" },
  { bg: "#EAF2FB", fg: "#1B4F72" },
  { bg: "#F9EBEA", fg: "#922B21" },
  { bg: "#FEF5E7", fg: "#9A6C0C" },
];

function avatarColours(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return REPLY_PALETTES[Math.abs(h) % REPLY_PALETTES.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Derive a display name from a Supabase user object */
function getDisplayName(user: { email?: string | null; user_metadata?: Record<string, unknown> | null }): string {
  const meta = user.user_metadata as Record<string, unknown> | null | undefined;
  if (meta?.full_name && typeof meta.full_name === "string") return meta.full_name;
  if (meta?.name && typeof meta.name === "string") return meta.name;
  if (user.email) return user.email.split("@")[0];
  return "user";
}

// ── Single reply bubble ─────────────────────────────────────────────
function ReplyBubble({ reply }: { reply: Reply }) {
  const col = avatarColours(reply.display_name);
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 14px",
        borderBottom: "1px solid #e8e2d6",
        animation: "replyFadeIn 0.2s ease",
      }}
    >
      {/* Mini avatar */}
      <div
        style={{
          width: 26,
          height: 26,
          flexShrink: 0,
          background: col.bg,
          color: col.fg,
          border: "1.5px solid #0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
          fontWeight: 700,
          fontFamily: "'Space Mono', monospace",
          marginTop: 1,
        }}
      >
        {initials(reply.display_name)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'Space Mono', monospace",
              color: "#0a0a0a",
            }}
          >
            {reply.display_name}
          </span>
          <span style={{ fontSize: 10, color: "#8a8070", fontFamily: "'Space Mono', monospace" }}>
            {formatTimestamp(reply.created_at)}
          </span>
        </div>
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            margin: 0,
            color: "#1a1512",
            wordBreak: "break-word",
          }}
        >
          {reply.body}
        </p>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────
export default function ReplySection({ confessionId }: Props) {
  const { user, session, isVerified } = useAuth();

  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyCount, setReplyCount] = useState<number | null>(null);

  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasFetched = useRef(false);

  // Fetch replies when panel opens (once)
  useEffect(() => {
    if (!open) return;
    if (hasFetched.current) return;
    hasFetched.current = true;

    setLoadingReplies(true);
    getReplies(confessionId)
      .then((data) => {
        setReplies(data);
        setReplyCount(data.length);
      })
      .catch(() => setError("couldn't load replies"))
      .finally(() => setLoadingReplies(false));
  }, [open, confessionId]);

  // Derive display name from logged-in user
  const displayName = user ? getDisplayName(user as Parameters<typeof getDisplayName>[0]) : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !session?.access_token) return;

    setSubmitting(true);
    setError(null);
    try {
      const newReply = await postReply(confessionId, body.trim(), displayName, session.access_token);
      setReplies((prev) => [...prev, newReply]);
      setReplyCount((c) => (c ?? 0) + 1);
      setBody("");
      inputRef.current?.focus();
    } catch {
      setError("failed to post reply, try again");
    } finally {
      setSubmitting(false);
    }
  }

  const toggleOpen = () => {
    setOpen((o) => !o);
  };

  const count = replyCount ?? 0;

  return (
    <div
      style={{
        marginTop: 10,
        borderTop: "1px dashed #c8c0b4",
      }}
    >
      {/* ── Toggle button ─────────────────────────────────────── */}
      <button
        onClick={toggleOpen}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 0 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          color: "#8a8070",
          letterSpacing: "0.05em",
          transition: "color 0.12s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#0a0a0a")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#8a8070")}
      >
        <span style={{ fontSize: 11 }}>{open ? "▲" : "▼"}</span>
        {count === 0 && !hasFetched.current
          ? "reply"
          : count === 0
          ? "no replies yet"
          : `${count} ${count === 1 ? "reply" : "replies"}`}
        {!open && count > 0 && (
          <span
            style={{
              background: "#0a0a0a",
              color: "#f5f0e8",
              fontSize: 9,
              padding: "1px 5px",
              fontWeight: 700,
              letterSpacing: 0,
            }}
          >
            {count}
          </span>
        )}
      </button>

      {/* ── Expandable panel ──────────────────────────────────── */}
      {open && (
        <div
          style={{
            marginTop: 8,
            background: "#ede8df",
            border: "1px solid #c8c0b4",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "7px 14px",
              borderBottom: "1px solid #c8c0b4",
              background: "#e4ddd3",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontFamily: "'Space Mono', monospace",
                letterSpacing: "0.1em",
                color: "#8a8070",
              }}
            >
              REPLIES — NOT ANONYMOUS
            </span>
            <span
              style={{
                fontSize: 9,
                fontFamily: "'Space Mono', monospace",
                background: "#0a0a0a",
                color: "#f5f0e8",
                padding: "1px 6px",
              }}
            >
              SIGNED IN ONLY
            </span>
          </div>

          {/* Reply list */}
          {loadingReplies ? (
            <div
              style={{
                padding: "14px",
                fontSize: 11,
                fontFamily: "'Space Mono', monospace",
                color: "#8a8070",
              }}
            >
              loading...
            </div>
          ) : replies.length === 0 ? (
            <div
              style={{
                padding: "14px",
                fontSize: 11,
                fontFamily: "'Space Mono', monospace",
                color: "#8a8070",
                fontStyle: "italic",
              }}
            >
              no replies yet — be the first
            </div>
          ) : (
            <div>
              {replies.map((r) => (
                <ReplyBubble key={r.id} reply={r} />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                padding: "6px 14px",
                fontSize: 10,
                fontFamily: "'Space Mono', monospace",
                color: "#d63a2a",
                borderTop: "1px solid #c8c0b4",
              }}
            >
              ⚠ {error}
            </div>
          )}

          {/* ── Input area ─────────────────────────────────────── */}
          {user && isVerified ? (
            <form
              onSubmit={handleSubmit}
              style={{
                borderTop: "1px solid #c8c0b4",
                padding: "10px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {/* Who's replying */}
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "'Space Mono', monospace",
                  color: "#8a8070",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                replying as{" "}
                <span style={{ color: "#0a0a0a", fontWeight: 700 }}>{displayName}</span>
              </div>

              <textarea
                ref={inputRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="say something..."
                maxLength={280}
                rows={2}
                disabled={submitting}
                style={{
                  width: "100%",
                  resize: "vertical",
                  border: "1.5px solid #0a0a0a",
                  background: "#f5f0e8",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 13,
                  padding: "8px 10px",
                  outline: "none",
                  color: "#0a0a0a",
                  boxSizing: "border-box",
                  transition: "border-color 0.12s",
                  opacity: submitting ? 0.6 : 1,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#666")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#0a0a0a")}
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "'Space Mono', monospace",
                    color: body.length > 240 ? "#d63a2a" : "#8a8070",
                  }}
                >
                  {body.length}/280
                </span>
                <button
                  type="submit"
                  disabled={submitting || !body.trim()}
                  style={{
                    fontSize: 11,
                    fontFamily: "'Space Mono', monospace",
                    padding: "5px 14px",
                    border: "1.5px solid #0a0a0a",
                    background: submitting || !body.trim() ? "#d0c9be" : "#0a0a0a",
                    color: submitting || !body.trim() ? "#8a8070" : "#f5f0e8",
                    cursor: submitting || !body.trim() ? "not-allowed" : "pointer",
                    transition: "background 0.12s, color 0.12s",
                    letterSpacing: "0.05em",
                  }}
                >
                  {submitting ? "posting..." : "post reply"}
                </button>
              </div>
            </form>
          ) : user && !isVerified ? (
            <div
              style={{
                borderTop: "1px solid #c8c0b4",
                padding: "10px 14px",
                fontSize: 11,
                fontFamily: "'Space Mono', monospace",
                color: "#8a8070",
              }}
            >
              verify your email to reply
            </div>
          ) : (
            /* Not signed in */
            <div
              style={{
                borderTop: "1px solid #c8c0b4",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "'Space Mono', monospace",
                  color: "#8a8070",
                }}
              >
                sign in to reply — replies are never anonymous
              </span>
              <Link
                href="/login"
                style={{
                  fontSize: 10,
                  fontFamily: "'Space Mono', monospace",
                  padding: "4px 12px",
                  border: "1.5px solid #0a0a0a",
                  background: "#0a0a0a",
                  color: "#f5f0e8",
                  textDecoration: "none",
                  flexShrink: 0,
                  letterSpacing: "0.05em",
                }}
              >
                sign in →
              </Link>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes replyFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  listConfessions,
  type Confession,
  type ConfessionsResponse,
} from "@/lib/api";
import ConfessionCard from "@/components/ConfessionCard";
import ConfessForm from "@/components/ConfessForm";
import StatsBox from "@/components/StatsBox";
import HallOfShame from "@/components/HallOfShame";
import Ticker from "@/components/Ticker";

type SortMode = "new" | "cringe";

export default function TheWall() {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [meta, setMeta] = useState<Omit<ConfessionsResponse, "confessions"> | null>(null);
  const [sort, setSort] = useState<SortMode>("new");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [shameKey, setShameKey] = useState(0); // triggers HallOfShame re-fetch
  const [apiStatus, setApiStatus] = useState<"ok" | "error" | "checking">("checking");

  const PER_PAGE = 20;

  // ── Health check on mount ─────────────────────────────────────
  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000") + "/health")
      .then((r) => setApiStatus(r.ok ? "ok" : "error"))
      .catch(() => setApiStatus("error"));
  }, []);

  // ── Load confessions ──────────────────────────────────────────
  const fetchConfessions = useCallback(
    async (newSort: SortMode, newPage: number, append: boolean) => {
      if (newPage === 1) setLoading(true); else setLoadingMore(true);
      try {
        const data = await listConfessions(newSort, newPage, PER_PAGE);
        setMeta({ total: data.total, page: data.page, per_page: data.per_page });
        setConfessions((prev) => (append ? [...prev, ...data.confessions] : data.confessions));
      } catch {
        // silently keep existing state on error
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    setPage(1);
    fetchConfessions(sort, 1, false);
  }, [sort, fetchConfessions]);

  // ── Sort change ───────────────────────────────────────────────
  function changeSort(s: SortMode) {
    if (s === sort) return;
    setSort(s);
  }

  // ── Load more ────────────────────────────────────────────────
  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchConfessions(sort, nextPage, true);
  }

  // ── New confession posted ─────────────────────────────────────
  function handlePosted(c: Confession) {
    setSort("new");
    setConfessions((prev) => [c, ...prev]);
    setShameKey((k) => k + 1);
  }

  const hasMore = meta ? confessions.length < meta.total : false;

  // Inline button style helpers
  const sortBtnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 10, fontFamily: "'Space Mono', monospace",
    border: "1px solid #0a0a0a", padding: "3px 10px",
    background: active ? "#0a0a0a" : "transparent",
    color: active ? "#f5f0e8" : "#0a0a0a",
    cursor: "pointer",
    borderRight: "none",
  });

  return (
    <div style={{ background: "#f5f0e8", fontFamily: "'Space Grotesk', sans-serif", color: "#0a0a0a", minHeight: "100vh" }}>

      {/* ── API status banner ───────────────────────────────────── */}
      {apiStatus === "error" && (
        <div style={{
          background: "#d63a2a", color: "#fff",
          padding: "6px 20px", fontSize: 11,
          fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em",
        }}>
          ⚠ backend offline — submissions disabled, feed may be stale
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{
        borderBottom: "2px solid #0a0a0a", padding: "24px 28px 20px",
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        position: "relative",
      }}>
        <div>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 38, fontWeight: 700, letterSpacing: -2, lineHeight: 1,
          }}>
            THE WALL
            <span style={{
              display: "inline-block",
              background: "#0a0a0a", color: "#f5f0e8",
              padding: "2px 8px", marginLeft: 8,
              fontSize: 12, letterSpacing: 0, fontWeight: 400,
              verticalAlign: "middle", position: "relative", top: -4,
            }}>
              BETA
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span className="live-dot" />
            <span style={{ fontSize: 12, fontFamily: "'Space Mono', monospace", color: "#8a8070" }}>
              {apiStatus === "ok" ? "live" : apiStatus === "checking" ? "connecting..." : "offline"}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#8a8070", fontFamily: "'Space Mono', monospace" }}>
            {meta ? `${meta.total} confession${meta.total !== 1 ? "s" : ""} posted` : "loading..."}
          </div>
        </div>
      </div>

      {/* ── Ticker ──────────────────────────────────────────────── */}
      <Ticker />

      {/* ── Main grid ───────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 340px",
        borderBottom: "2px solid #0a0a0a",
      }}>

        {/* ── Feed ────────────────────────────────────────────── */}
        <div style={{ borderRight: "1.5px solid #0a0a0a" }}>
          {/* Feed header */}
          <div style={{
            padding: "14px 20px", borderBottom: "1.5px solid #0a0a0a",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#8a8070", letterSpacing: "0.08em" }}>
              RECENT CONFESSIONS
            </span>
            <div style={{ display: "flex" }}>
              <button
                style={{ ...sortBtnStyle(sort === "new"), borderRight: "none" }}
                onClick={() => changeSort("new")}
                onMouseEnter={(e) => { if (sort !== "new") { e.currentTarget.style.background = "#0a0a0a"; e.currentTarget.style.color = "#f5f0e8"; }}}
                onMouseLeave={(e) => { if (sort !== "new") { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#0a0a0a"; }}}
              >NEW</button>
              <button
                style={{ ...sortBtnStyle(sort === "cringe"), border: "1px solid #0a0a0a" }}
                onClick={() => changeSort("cringe")}
                onMouseEnter={(e) => { if (sort !== "cringe") { e.currentTarget.style.background = "#0a0a0a"; e.currentTarget.style.color = "#f5f0e8"; }}}
                onMouseLeave={(e) => { if (sort !== "cringe") { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#0a0a0a"; }}}
              >CRINGE</button>
            </div>
          </div>

          {/* Cards */}
          {loading ? (
            // Skeleton cards
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: 20, borderBottom: "1.5px solid #0a0a0a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div className="skeleton" style={{ width: 32, height: 32 }} />
                    <div>
                      <div className="skeleton" style={{ width: 80, height: 13, marginBottom: 5 }} />
                      <div className="skeleton" style={{ width: 55, height: 11 }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <div className="skeleton" style={{ width: 70, height: 22 }} />
                    <div className="skeleton" style={{ width: 60, height: 22 }} />
                  </div>
                </div>
                <div className="skeleton" style={{ width: "90%", height: 15, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: "75%", height: 15, marginBottom: 14 }} />
                <div className="skeleton" style={{ width: "100%", height: 50 }} />
              </div>
            ))
          ) : confessions.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8a8070", fontFamily: "'Space Mono', monospace", fontSize: 13 }}>
              No confessions yet. Be the first coward.
            </div>
          ) : (
            confessions.map((c) => <ConfessionCard key={c.id} item={c} />)
          )}

          {/* Load more */}
          {!loading && hasMore && (
            <div style={{ padding: 16, textAlign: "center", borderTop: "1px solid #d0c9be" }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  padding: "8px 24px", border: "1.5px solid #0a0a0a",
                  background: "transparent", fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 12, cursor: loadingMore ? "wait" : "pointer", color: "#0a0a0a",
                }}
                onMouseEnter={(e) => { if (!loadingMore) { e.currentTarget.style.background = "#0a0a0a"; e.currentTarget.style.color = "#f5f0e8"; }}}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#0a0a0a"; }}
              >
                {loadingMore ? "loading..." : `load more (${meta!.total - confessions.length} remaining)`}
              </button>
            </div>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <div>
          <ConfessForm onPosted={handlePosted} />
          <StatsBox />
          <HallOfShame refreshKey={shameKey} />
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div style={{
        padding: "14px 20px", display: "flex",
        justifyContent: "space-between", alignItems: "center",
        borderTop: "1.5px solid #0a0a0a",
      }}>
        <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#8a8070" }}>
          the wall © 2025 — no gods, no mercy
        </span>
        <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#8a8070" }}>
          everything is anonymous. nothing is forgotten.
        </span>
      </div>
    </div>
  );
}

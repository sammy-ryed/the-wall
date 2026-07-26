"use client";

import { useStats } from "@/lib/reactQuery";

export default function StatsBox() {
  const { data: stats, isLoading: loading } = useStats();

  const rows = stats
    ? [
        { label: "total confessions", val: stats.total_confessions.toString() },
        { label: "avg cringe today",  val: stats.avg_cringe.toString() },
        { label: "lowest survival",   val: `${stats.lowest_survival}%` },
        { label: "most common era",   val: stats.most_common_era, small: true },
        { label: "cowards (anon)",    val: `${stats.anon_percent}%` },
      ]
    : [];

  return (
    <div style={{ padding: 20, borderBottom: "1.5px solid #0a0a0a" }}>
      <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#8a8070", letterSpacing: "0.08em", marginBottom: 14 }}>
        WALL STATS
      </div>

      {loading ? (
        // Skeleton rows
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid #d0c9be" }}>
            <div className="skeleton" style={{ width: 120, height: 14 }} />
            <div className="skeleton" style={{ width: 40, height: 18 }} />
          </div>
        ))
      ) : (
        rows.map((r, i) => (
          <div
            key={r.label}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              padding: "8px 0",
              borderBottom: i < rows.length - 1 ? "0.5px solid #d0c9be" : "none",
            }}
          >
            <span style={{ fontSize: 13 }}>{r.label}</span>
            <span style={{
              fontSize: r.small ? 13 : 18,
              fontWeight: 700,
              fontFamily: "'Space Mono', monospace",
            }}>
              {r.val}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { getLeaderboard, type Confession } from "@/lib/api";

interface Props {
  /** refresh key — increment to trigger a re-fetch (after a new post) */
  refreshKey?: number;
}

export default function HallOfShame({ refreshKey = 0 }: Props) {
  const [items, setItems] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getLeaderboard(3)
      .then((data) => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [refreshKey]);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "#8a8070", letterSpacing: "0.08em", marginBottom: 14 }}>
        HALL OF SHAME
      </div>

      {loading
        ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div className="skeleton" style={{ width: 36, height: 36 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: "85%", height: 14, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: "55%", height: 11 }} />
              </div>
            </div>
          ))
        : items.map((item, i) => (
            <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
              <div style={{
                fontSize: 28, fontWeight: 700,
                fontFamily: "'Space Mono', monospace",
                color: "#d0c9be", lineHeight: 1, flexShrink: 0,
              }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div>
                <div style={{ fontSize: 12, lineHeight: 1.45 }}>
                  "{item.confession.length > 70 ? item.confession.slice(0, 70) + "…" : item.confession}"
                </div>
                <div style={{ fontSize: 10, color: "#8a8070", fontFamily: "'Space Mono', monospace", marginTop: 2 }}>
                  {item.name} — cringe {item.cringe_score}, surv {item.survival_probability}%
                </div>
              </div>
            </div>
          ))
      }
    </div>
  );
}

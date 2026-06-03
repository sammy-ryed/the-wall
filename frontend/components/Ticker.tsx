"use client";

import { useEffect, useState } from "react";
import { getTicker } from "@/lib/api";

const FALLBACK =
  "    RAHUL scored 97 cringe    ///    PRIYA: \"still alive, somehow\"    ///    VIKRAM broke prod on a Friday    ///    YOUR CONFESSION IS NEXT    ///    RAHUL scored 97 cringe    ///    PRIYA: \"still alive, somehow\"    ///    VIKRAM broke prod on a Friday    ///    YOUR CONFESSION IS NEXT    ";

export default function Ticker() {
  const [text, setText] = useState(FALLBACK);

  useEffect(() => {
    getTicker()
      .then((r) => setText(r.text))
      .catch(() => {}); // silently use fallback

    // Refresh ticker every 30 seconds so new confessions show up
    const interval = setInterval(() => {
      getTicker()
        .then((r) => setText(r.text))
        .catch(() => {});
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        borderBottom: "1.5px solid #0a0a0a",
        background: "#0a0a0a",
        color: "#f5f0e8",
        padding: "7px 0",
        overflow: "hidden",
        whiteSpace: "nowrap",
      }}
    >
      <span className="ticker-inner">{text}</span>
    </div>
  );
}

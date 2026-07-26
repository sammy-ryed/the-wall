"use client";

import { useTicker } from "@/lib/reactQuery";

const FALLBACK =
  "    RAHUL scored 97 cringe    ///    PRIYA: \"still alive, somehow\"    ///    VIKRAM broke prod on a Friday    ///    YOUR CONFESSION IS NEXT    ///    RAHUL scored 97 cringe    ///    PRIYA: \"still alive, somehow\"    ///    VIKRAM broke prod on a Friday    ///    YOUR CONFESSION IS NEXT    ";

export default function Ticker() {
  const { data } = useTicker();
  const text = data?.text || FALLBACK;

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

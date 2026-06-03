"use client";

import React from "react";
import { motion } from "framer-motion";

interface CringeBarProps {
  value: number;
}

export default function CringeBar({ value }: CringeBarProps) {
  // Determine color based on score: 0-40 green, 41-70 amber, 71-100 red
  const getColorClass = (val: number) => {
    if (val <= 40) return "bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]";
    if (val <= 70) return "bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]";
    return "bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]";
  };

  const getTextColorClass = (val: number) => {
    if (val <= 40) return "text-emerald-400";
    if (val <= 70) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-gray-400">
        <span>Cringe Level</span>
        <span className={`${getTextColorClass(value)} font-mono font-bold text-sm`}>
          {value}%
        </span>
      </div>
      <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${getColorClass(value)}`}
        />
      </div>
    </div>
  );
}

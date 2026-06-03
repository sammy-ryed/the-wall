"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Terminal, ShieldAlert, Flame, Plus } from "lucide-react";
import { roastConfession, RoastResponse } from "../lib/api";
import { Confession } from "../lib/seeds";

interface ConfessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPost: (newConfession: Confession) => void;
}

export default function ConfessModal({ isOpen, onClose, onPost }: ConfessModalProps) {
  const [name, setName] = useState("");
  const [confession, setConfession] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roastResult, setRoastResult] = useState<RoastResponse | null>(null);

  const charLimit = 300;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confession.trim()) return;

    setLoading(true);
    setError(null);
    setRoastResult(null);

    try {
      const result = await roastConfession(confession);
      setRoastResult(result);
    } catch (err) {
      console.error(err);
      setError("Even Claude refused to engage with this.");
    } finally {
      setLoading(false);
    }
  };

  const handlePost = () => {
    if (!roastResult) return;

    const newConfessionItem: Confession = {
      id: `live-${Date.now()}`,
      name: name.trim() || "Anonymous coward",
      confession: confession.trim(),
      cringe_score: roastResult.cringe_score,
      survival_probability: roastResult.survival_probability,
      roast: roastResult.roast,
      verdict: roastResult.verdict,
      era: roastResult.era,
      timestamp: "Just now"
    };

    onPost(newConfessionItem);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName("");
    setConfession("");
    setRoastResult(null);
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end justify-center sm:items-center p-0 sm:p-4"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed bottom-0 sm:bottom-auto left-0 right-0 sm:relative w-full max-w-lg bg-[#121212] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl z-50 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-bold text-white font-mono">CONFESS YOUR CRIME</h3>
              </div>
              <button
                onClick={handleClose}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {!roastResult && !loading && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-mono">
                      Your Handle (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Anonymous coward"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={30}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                        Confession Text
                      </label>
                      <span className={`text-[10px] font-mono ${confession.length >= charLimit ? "text-red-500" : "text-gray-500"}`}>
                        {confession.length}/{charLimit}
                      </span>
                    </div>
                    <textarea
                      placeholder="I pushed code to prod on Friday at 5pm... I committed my AWS keys..."
                      value={confession}
                      onChange={(e) => setConfession(e.target.value)}
                      maxLength={charLimit}
                      required
                      rows={5}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors resize-none font-sans leading-relaxed"
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-xs text-red-400 font-mono flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!confession.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:from-white/5 disabled:to-white/5 disabled:text-gray-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-red-950/30 transition-all font-mono text-sm active:scale-95"
                  >
                    <Send className="w-4 h-4" /> SUBMIT TO THE ROASTER
                  </button>
                </form>
              )}

              {/* Loading State */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="relative">
                    {/* Pulsing circles */}
                    <div className="w-16 h-16 rounded-full border border-red-500/30 animate-ping absolute inset-0" />
                    <div className="w-16 h-16 rounded-full border-2 border-red-500/80 flex items-center justify-center bg-red-950/20 relative">
                      <Terminal className="w-8 h-8 text-red-500 animate-pulse" />
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-red-400 font-mono tracking-widest uppercase animate-pulse">
                    Reading your chaos...
                  </h4>
                  <p className="text-xs text-gray-500 text-center font-mono max-w-xs leading-relaxed">
                    Analyzing code commits and life choices...
                  </p>
                </div>
              )}

              {/* Roast Result Reveal Screen */}
              {roastResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      <Sparkles className="w-3 h-3" /> ROAST ANALYSIS COMPLETE
                    </span>
                    <h4 className="text-lg font-black text-white uppercase font-mono">The Verdict is In</h4>
                  </div>

                  {/* Verdict Card */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                    {/* Cringe & Survival */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">
                          Cringe Score
                        </span>
                        <span className={`text-2xl font-mono font-black block mt-1 ${roastResult.cringe_score > 70 ? "text-red-500" : "text-emerald-400"}`}>
                          {roastResult.cringe_score}%
                        </span>
                      </div>

                      <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">
                          Survival Rate
                        </span>
                        <span className={`text-2xl font-mono font-black block mt-1 ${roastResult.survival_probability < 30 ? "text-red-500" : "text-emerald-400"}`}>
                          {roastResult.survival_probability}%
                        </span>
                      </div>
                    </div>

                    {/* Verdict & Era */}
                    <div className="flex justify-between items-center text-sm py-1 border-t border-b border-white/5 font-mono">
                      <span className="text-xs text-gray-500">Verdict:</span>
                      <span className="font-bold text-white text-xs bg-white/10 px-2.5 py-0.5 rounded border border-white/10">
                        {roastResult.verdict}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm py-1 font-mono">
                      <span className="text-xs text-gray-500">Classification:</span>
                      <span className="font-bold text-indigo-400 text-xs">
                        {roastResult.era}
                      </span>
                    </div>

                    {/* Roast Quote */}
                    <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full blur-lg pointer-events-none" />
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 mb-2 uppercase font-mono">
                        <Flame className="w-3.5 h-3.5" /> Brutal Roast
                      </div>
                      <p className="text-sm font-mono text-red-200/90 leading-relaxed italic">
                        "{roastResult.roast}"
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={resetForm}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 px-4 rounded-xl border border-white/10 font-mono text-sm transition-colors"
                    >
                      ROAST AGAIN
                    </button>
                    <button
                      onClick={handlePost}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-950/30 transition-all font-mono text-sm active:scale-95"
                    >
                      <Plus className="w-4 h-4" /> POST TO WALL
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

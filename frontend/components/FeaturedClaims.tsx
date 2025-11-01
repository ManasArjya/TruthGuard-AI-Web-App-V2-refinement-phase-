"use client";

import Link from "next/link";
import VerdictBadge from "./VerdictBadge";
import { MessageCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import React, { useEffect, useState } from "react";

export default function FeaturedClaims() {
  const [claims, setClaims] = useState<any[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const response = await fetch(`${backendUrl}/claims/browse?sort=newest`);
        const data = await response.json();
        // filter out failed claims and take top 6
        const validClaims = data.filter((c: any) => c.status !== "failed").slice(0, 6);
        setClaims(validClaims);
      } catch (error) {
        console.error("Failed to fetch featured claims:", error);
      }
    };
    fetchClaims();
  }, []);

  // Looping animation between claim sets
  useEffect(() => {
    if (claims.length > 3) {
      const interval = setInterval(() => {
        setIndex((prev) => (prev + 3) % claims.length);
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [claims]);

  const visibleClaims = claims.slice(index, index + 3);

  return (
    <section className="relative py-20 md:py-28 mx-4 md:mx-8 rounded-[2rem] bg-white/60 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-white/40 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 opacity-40 blur-3xl"></div>

      <div className="relative z-10 text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4 bg-gradient-to-r from-purple-600 via-violet-500 to-pink-400 bg-clip-text text-transparent transition-all duration-500 hover:scale-105">
          Recently Analyzed Claims
        </h2>
        <p className="text-slate-700 max-w-2xl mx-auto px-3">
          See what the community is fact-checking and join the discussion on
          important topics.
        </p>
      </div>

      <div className="relative z-10 px-6 md:px-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.7 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
          >
            {visibleClaims.map((claim, idx) => (
              <motion.div
                key={claim.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: idx * 0.15 }}
              >
                <Link
                  href={`/claims/${claim.id}`}
                  className="block group transition-transform duration-500 hover:-translate-y-1"
                >
                  <div className="h-[240px] flex flex-col justify-between p-6 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-md hover:shadow-[0_10px_35px_rgba(59,130,246,0.25)] transition-all duration-500">
                    <div className="flex items-center justify-between mb-4">
                      <VerdictBadge
                        verdict={claim.analysis?.verdict}
                        confidence={claim.analysis?.confidence_score}
                        size="sm"
                      />
                      <div className="flex items-center text-xs text-slate-500">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(claim.created_at).toLocaleDateString("en-GB")}
                      </div>
                    </div>

                    <p className="text-slate-800 mb-4 line-clamp-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:via-purple-600 group-hover:to-pink-600 transition-all duration-500">
                      {claim.content}
                    </p>

                    <div className="flex items-center justify-between text-sm text-slate-600 group-hover:text-slate-800 transition-colors duration-300">
                      <div className="flex items-center">
                        <MessageCircle className="w-4 h-4 mr-1 text-slate-500 group-hover:text-blue-600 transition-colors duration-300" />
                        {claim.comment_count} comments
                      </div>
                      <span className="font-semibold group-hover:text-blue-600 transition-colors duration-300">
                        View Analysis →
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 text-center mt-12">
        <Link
          href="/browse"
          className="inline-block px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-semibold shadow-[0_0_25px_rgba(147,197,253,0.4)] hover:shadow-[0_0_40px_rgba(147,197,253,0.6)] transition-all duration-500"
        >
          Browse All Claims
        </Link>
      </div>
    </section>
  );
}

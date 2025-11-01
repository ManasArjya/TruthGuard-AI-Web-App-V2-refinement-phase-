"use client";

import { useEffect, useState } from "react";

type Stat = {
  label: string;
  target: number;
  isPercent?: boolean;
  decimals?: number;
  change: number;
};

export default function StatsSection() {
  const [animatedValues, setAnimatedValues] = useState<number[]>([]);
  const [triggered, setTriggered] = useState(false);

  const stats: Stat[] = [
    { label: "Claims Analyzed", target: 500, change: 12 },
    { label: "Community Members", target: 100, change: 8 },
    { label: "RTI Requests", target: 15, change: 23 },
    {
      label: "Accuracy Rate",
      target: 84.6,
      isPercent: true,
      decimals: 1,
      change: 2,
    },
  ];

  // Animate numbers from 0 → target once when visible
  useEffect(() => {
    const section = document.getElementById("stats-section");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !triggered) {
          setTriggered(true);
        }
      },
      { threshold: 0.4 }
    );

    if (section) observer.observe(section);
    return () => observer.disconnect();
  }, [triggered]);

  useEffect(() => {
    if (!triggered) return;

    let start = 0;
    const duration = 1500; // animation duration (1.5s)
    const steps = 60;
    const interval = duration / steps;
    const values = Array(stats.length).fill(0);

    const timer = setInterval(() => {
      start += 1;
      const progress = Math.min(1, start / steps);
      const updated = stats.map((s) => s.target * progress);
      setAnimatedValues(updated);
      if (progress === 1) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [triggered]);

  const formatNumber = (v: number, decimals = 0, group = true) => {
    if (group) {
      return Number(v.toFixed(decimals)).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    return v.toFixed(decimals);
  };

  return (
    <section
      id="stats-section"
      className="relative py-20 md:py-28 mx-4 md:mx-8 rounded-[2rem] bg-white/60 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-white/40"
    >
      {/* background glow */}
      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 opacity-50 blur-3xl"></div>

      <div className="relative z-10 text-center mb-10 md:mb-14">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4 bg-gradient-to-r from-blue-500 via-purple-500 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
          Trust Through Transparency
        </h2>
        <p className="text-slate-700 max-w-2xl mx-auto px-3">
          Join thousands of users who rely on{" "}
          <span className="font-semibold text-indigo-600">TruthGuard AI</span>
          for accurate, AI-powered fact-checking and community-driven
          verification.
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 px-6 md:px-12">
        {stats.map((stat, i) => {
          const value = animatedValues[i] ?? 0;
          const decimals = stat.decimals ?? (stat.isPercent ? 1 : 0);
          return (
            <div
  key={stat.label}
  className="group text-center p-6 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-md hover:shadow-[0_10px_35px_rgba(59,130,246,0.25)] hover:-translate-y-1 transition-all duration-500"
>
  <div className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tabular-nums">
    {formatNumber(value, decimals, !stat.isPercent)}
    {stat.isPercent ? "%" : "+"} {/* ✅ Changed here */}
  </div>
  <div className="text-sm md:text-base text-slate-800 font-medium mb-1">
    {stat.label}
  </div>
  <div className="text-xs text-green-600 font-semibold opacity-80">
    ↑ {stat.change}% this month
  </div>
</div>

          );
        })}
      </div>
    </section>
  );
}

"use client";

import SearchBar from "../components/SearchBar";
import FeaturedClaims from "../components/FeaturedClaims";
import StatsSection from "../components/StatsSection";
import { Shield, Users, FileSearch, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="relative overflow-hidden min-h-screen text-slate-800">
      {/* ✨ Animated gradient blobs (background) */}
      <div className="absolute -top-60 -left-60 w-[600px] h-[300px] rounded-full bg-gradient-to-br from-indigo-200 via-blue-200 to-cyan-100 blur-[120px] opacity-60 animate-pulse-slow z-0"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-pink-200 via-purple-200 to-indigo-100 rounded-full blur-[120px] opacity-60 animate-pulse-slow"></div>

      {/* 🌟 Glass-like curved container */}
      <main className="relative z-10 space-y-12 md:space-y-12 mx-2 md:mx-6 my-3 p-4 md:p-4 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.12)] bg-white/60 backdrop-blur-2xl border border-white/40">
        {/* 🛡 Hero Section */}
        <section className="text-center pt-2 pb-10 md:pt-6 md:pb-8">
          <motion.div
            className="max-w-5xl mx-auto px-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mt-[-10px] mb-6">
              <div className="inline-flex items-center justify-center p-5 rounded-2xl bg-white/40 backdrop-blur-lg shadow-[0_0_40px_rgba(147,197,253,0.3)]">
                <Shield className="h-14 w-14 md:h-16 md:w-16 text-blue-600" />
              </div>
            </div>

            {/* ✅ Responsive heading fixed */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-5 leading-tight bg-gradient-to-r from-indigo-700 via-blue-700 to-purple-600 bg-clip-text text-transparent">
              Combat Misinformation with{" "}
              <span className="text-gradient">AI-Powered Truth</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 mb-4 max-w-4xl mx-auto leading-relaxed">
              Submit claims, URLs, or media files for instant AI-powered fact-checking. Get detailed analysis, community insights, and take action with automated verification requests.
            </p>

            <div className="max-w-2xl mx-auto glass p-3 rounded-2xl shadow-lg hover:shadow-2xl transition-all">
              <SearchBar />
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Supports text claims, URLs, images & videos
            </p>
          </motion.div>
        </section>

        {/* ⚙️ Features Section */}
        <section className="relative py-20 md:py-18 rounded-[2.5rem] mx-4 md:mx-8 shadow-[0_10px_50px_rgba(59,130,246,0.15)] bg-white/40 backdrop-blur-2xl border border-white/40">
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-center mt-[-20] mb-10 text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-blue-700 to-purple-600"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            How TruthGuard AI Works
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-6 md:px-12">
            {[
              {
                icon: FileSearch,
                title: "Submit & Analyze",
                desc: "Submit any claim, URL, image, or video. Our AI extracts content using OCR and transcription, then analyzes it against verified sources.",
                gradient: "from-blue-500 via-indigo-500 to-cyan-400",
              },
              {
                icon: Users,
                title: "Community Discussion",
                desc: "Engage with others in fact-checking discussions. Vote on comments, share evidence, and learn from verified experts in the field.",
                gradient: "from-purple-500 via-pink-500 to-rose-400",
              },
              {
                icon: AlertTriangle,
                title: "Take Action",
                desc: "For government-related claims, generate automated RTI requests to seek official verification from relevant authorities.",
                gradient: "from-orange-400 via-amber-500 to-yellow-400",
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                className="group relative text-center p-8 rounded-3xl bg-white/60 hover:bg-white/70 backdrop-blur-xl shadow-[0_5px_25px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_35px_rgba(59,130,246,0.25)] border border-white/50 transition-all duration-500"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: idx * 0.15 }}
              >
                <div
                  className={`mx-auto mb-5 w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.3)] group-hover:scale-110 transition-transform duration-500`}
                >
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-slate-800">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>

                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-30 bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-200 blur-2xl transition-opacity duration-700"></div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 📊 Stats & Featured Claims */}
        <StatsSection />
        <FeaturedClaims />

        {/* 🚀 Call to Action */}
        <motion.section
          className="py-20 md:py-28 text-center relative rounded-[2rem] bg-gradient-to-br from-white via-slate-50 to-white backdrop-blur-xl shadow-lg border border-white/40 mx-4 md:mx-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 bg-clip-text text-transparent">
              Ready to Fight Misinformation?
            </h2>

            <p className="text-lg text-slate-700 mb-8">
              Join thousands of users who trust TruthGuard AI to verify
              information and promote truth in the digital age.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="btn-primary px-8 py-3 text-base md:text-lg shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:shadow-[0_0_30px_rgba(59,130,246,0.35)] transition-all rounded-xl"
              >
                Start Fact-Checking
              </button>
              <button
                onClick={() => (window.location.href = "/about")}
                className="btn-secondary px-8 py-3 text-base md:text-lg rounded-xl hover:shadow-[0_0_25px_rgba(147,51,234,0.25)] transition-all"
              >
                Learn More
              </button>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}

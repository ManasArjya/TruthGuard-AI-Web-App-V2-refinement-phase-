'use client'

import { Shield, CheckCircle, Globe, Users, Cpu, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function AboutPage() {
  const highlights = [
    { icon: Cpu, title: 'AI-Powered Verification', text: 'Advanced models analyze and explain claims using transparent reasoning.' },
    { icon: Users, title: 'Community Wisdom', text: 'Collaborative feedback improves accuracy, context, and fairness.' },
    { icon: Globe, title: 'Open Sources', text: 'All evidence links to verifiable and open sources.' },
    { icon: Shield, title: 'Trust by Design', text: 'Bias control, confidence scoring, and source transparency.' },
  ]

  const timeline = [
    { year: '2025', title: 'Concept & Prototype', text: 'The first version of TruthGuard AI was built to combat misinformation at scale.' },
    { year: '2026', title: 'Full Community Launch', text: 'Introduced open discussions, expert verification, and real-time claim validation.' },
  ]

  const faqs = [
    { q: 'How does TruthGuard AI verify claims?', a: 'We combine AI reasoning with verified data sources and community reviews to ensure accuracy.' },
    { q: 'Are sources peer-reviewed?', a: 'We display the credibility level of every source and provide verification indicators.' },
    { q: 'Is my data private?', a: 'We collect only minimal data and offer full privacy control settings.' },
  ]

  return (
    <div className="space-y-16 animate-fadeIn">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 border border-blue-100 shadow-lg hover:shadow-xl transition-all duration-500">
        <div className="relative z-10 px-6 py-14 md:px-12 md:py-20">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-9 h-9 text-blue-600" />
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight bg-gradient-to-r from-indigo-700 via-blue-700 to-purple-600 bg-clip-text text-transparent">
              About TruthGuard AI
            </h1>
          </div>
          <p className="max-w-3xl text-slate-700 text-lg">
            TruthGuard AI helps people navigate misinformation through transparent AI analysis and collective verification.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/browse" className="btn-primary">Explore Claims <ArrowRight className="w-4 h-4 ml-2" /></Link>
            <a href="#learn-more" className="btn-secondary">Learn More</a>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-200/40 rounded-full blur-3xl" />
      </section>

      {/* Highlights */}
      <section id="how-it-works">
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 bg-clip-text text-transparent">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((h) => (
            <div key={h.title} className="card hover-glow hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <h.icon className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-slate-800">{h.title}</h3>
              </div>
              <p className="text-slate-600 text-sm">{h.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm ">
        <section id="mission" className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 bg-clip-text text-transparent">Our Mission</h2>
            <p className="text-slate-700 mb-3">
              Empower everyone to critically evaluate information with evidence-backed AI reasoning.
            </p>
            <ul className="space-y-2 text-slate-700 text-sm">
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /> Transparent confidence scores</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /> Evidence-based verification</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5" /> Collaborative review by community</li>
            </ul>
          </div>
          <div className="card hover-glow">
            <h3 className="font-semibold mb-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 bg-clip-text text-transparent">What Makes Us Different?</h3>
            <p className="text-slate-600 text-sm">
              Unlike black-box models, TruthGuard exposes its reasoning, sources, and verification logic openly to users.
            </p>
          </div>
        </section>
      </div>

      {/* Timeline */}
      <section>
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 bg-clip-text text-transparent">Journey</h2>
        <div className="relative pl-6">
          <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200" />
          <div className="space-y-6">
            {timeline.map((t) => (
              <div key={t.year} className="relative animate-fadeInUp">
                <div className="absolute -left-1 top-1.5 w-3 h-3 bg-blue-600 rounded-full shadow" />
                <div className="card">
                  <div className="text-sm text-blue-600 font-medium">{t.year}</div>
                  <div className="font-semibold text-slate-900">{t.title}</div>
                  <p className="text-slate-600 text-sm">{t.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq">
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 bg-clip-text text-transparent">FAQ</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {faqs.map((f) => (
            <div key={f.q} className="card hover-glow transition-all duration-300">
              <div className="font-medium mb-1 text-slate-900">{f.q}</div>
              <p className="text-slate-600 text-sm">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Learn More */}
      <section id="learn-more" className="card hover-glow text-center">
        <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 bg-clip-text text-transparent">Learn More</h2>
        <p className="text-slate-600 text-sm mb-3">
          Explore our verification logic, trust policy, and privacy commitment.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/browse" className="btn-secondary">Browse Latest Claims</Link>
          <a href="#trust" className="btn-secondary">Trust & Transparency</a>
          <a href="#privacy" className="btn-secondary">Privacy</a>
          <a href="#terms" className="btn-secondary">Terms</a>
        </div>
      </section>
    </div>
  )
}

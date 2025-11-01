'use client'

import Link from 'next/link'
import {
  Shield,
  Github,
  Youtube, // ✅ Added YouTube icon
  Mail,
  ExternalLink,
  BookOpen,
  HelpCircle,
  Info,
  Lock,
} from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-10 border-t bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/70 shadow-sm">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-10 font-medium">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center space-x-2 mb-3">
              <Shield className="h-6 w-6 text-transparent bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text" />
              <span className="font-extrabold text-transparent bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-500 bg-clip-text text-lg">
                TruthGuard AI
              </span>
            </div>
            <p className="text-sm text-slate-700 mb-4 font-medium">
              AI-powered fact-checking with community verification. Building trust through transparency.
            </p>
            <div className="flex items-center gap-3 text-slate-600">
              {/* 🔗 Paste your actual GitHub link below */}
              <a
                className="transition-all duration-300 hover:scale-110 hover:text-purple-600"
                aria-label="GitHub"
                href="https://github.com/ManasArjya"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-5 h-5 transition-colors duration-300" />
              </a>

              {/* 🎥 YouTube Icon (replaces Twitter) */}
              <a
                className="transition-all duration-300 hover:scale-110 hover:text-purple-600"
                aria-label="YouTube"
                href="https://www.youtube.com/@osankesh4" 
                target="_blank"
                rel="noopener noreferrer"
              >
                <Youtube className="w-5 h-5 transition-colors duration-300" />
              </a>

              {/* 📧 Email */}
              <a
                className="transition-all duration-300 hover:scale-110 hover:text-purple-600"
                aria-label="Email"
                href="manassonu1254@gmail.com"
              >
                <Mail className="w-5 h-5 transition-colors duration-300" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-transparent bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text mb-3 text-base">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm font-medium">
              <li><Link href="/" className="text-slate-700 hover:text-purple-600 transition">Home</Link></li>
              <li><Link href="/browse" className="text-slate-700 hover:text-purple-600 transition">Browse Claims</Link></li>
              <li><Link href="/about" className="text-slate-700 hover:text-purple-600 transition">About</Link></li>
              <li><Link href="/dashboard" className="text-slate-700 hover:text-purple-600 transition">Dashboard</Link></li>
            </ul>
          </div>

          {/* Know More */}
          <div>
            <h4 className="font-semibold text-transparent bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text mb-3 text-base">
              Know More
            </h4>
            <ul className="space-y-2 text-sm font-medium">
              <li className="flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400" />
                <Link href="/about#mission" className="text-slate-700 hover:text-purple-600 transition">Our Mission</Link>
              </li>
              <li className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-400" />
                <Link href="/about#how-it-works" className="text-slate-700 hover:text-purple-600 transition">How It Works</Link>
              </li>
              <li className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <Link href="/about#faq" className="text-slate-700 hover:text-purple-600 transition">FAQ</Link>
              </li>
              <li className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400" />
                <Link href="/about#trust" className="text-slate-700 hover:text-purple-600 transition">Trust & Transparency</Link>
              </li>
            </ul>
            <div className="mt-4">
              <Link
                href="/about#learn-more"
                className="inline-flex items-center text-transparent bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text font-semibold text-sm hover:opacity-80 transition"
              >
                Know More <ExternalLink className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-semibold text-transparent bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text mb-3 text-base">
              Stay Updated
            </h4>
            <p className="text-sm text-slate-700 mb-3 font-medium">
              Get product updates and research highlights.
            </p>
            <div className="flex gap-2">
              <input
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Your email"
              />
              <button className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-500 hover:opacity-90 transition">
                Subscribe
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              We respect your privacy. Unsubscribe anytime.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t text-xs text-slate-600 font-medium flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} TruthGuard AI. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/about#privacy" className="hover:text-purple-600 transition">Privacy</Link>
            <Link href="/about#terms" className="hover:text-purple-600 transition">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

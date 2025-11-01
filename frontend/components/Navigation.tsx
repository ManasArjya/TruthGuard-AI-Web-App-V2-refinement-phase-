"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import {
  Shield,
  Menu,
  X,
  User,
  LogOut,
  Home,
  Search,
  BarChart3,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const navigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Browse Claims", href: "/browse", icon: Search },
    { name: "About", href: "/about", icon: Shield },
    { name: "Dashboard", href: "/dashboard", icon: BarChart3, requiresAuth: true },
  ];

  // 🌗 Theme Toggle Logic
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 backdrop-blur-md shadow-md transition-all duration-500">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between h-14 md:h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Shield className="h-7 w-7 md:h-8 md:w-8 text-blue-600 dark:text-blue-400" />
              <span className="font-extrabold text-base md:text-lg bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                TruthGuard AI
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-8">
            {navigation.map((item) => {
              if (item.requiresAuth && !session) return null;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-1 px-2 lg:px-3 py-2 font-semibold text-sm rounded-md transition-all duration-300 hover:scale-105"
                >
                  <item.icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* User + Theme Menu */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* 🌗 Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-2 rounded-full transition-all duration-500 bg-white/60 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 shadow-sm hover:scale-105 hover:rotate-12"
              title="Toggle Theme"
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5 text-slate-700" />
              ) : (
                <Sun className="w-5 h-5 text-yellow-400" />
              )}
            </button>

            {session ? (
              <div className="relative group">
                <button className="flex items-center space-x-2 px-2 md:px-3 py-2 rounded-full transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-blue-100 dark:hover:shadow-blue-900">
                  {session.user?.user_metadata?.avatar_url ? (
                    <div className="p-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full">
                      <img
                        src={session.user.user_metadata.avatar_url}
                        alt="User Avatar"
                        className="w-9 h-9 rounded-full border-2 border-white object-cover"
                      />
                    </div>
                  ) : (
                    <div className="p-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full">
                      <div className="w-9 h-9 flex items-center justify-center bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 rounded-full text-white">
                        <User className="w-5 h-5" />
                      </div>
                    </div>
                  )}
                </button>

                {/* Dropdown */}
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  {/* Username Section */}
                  <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Signed in as
                    </p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {session.user?.user_metadata?.full_name ||
                        session.user?.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/dashboard"
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Dashboard</span>
                    </Link>
                    <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 md:space-x-4">
                <Link
                  href="/auth/login"
                  className="text-slate-900 dark:text-slate-200 hover:text-blue-700 px-2 md:px-3 py-2 rounded-md text-sm font-semibold transition-colors duration-200"
                >
                  Sign In
                </Link>
                <Link href="/auth/register" className="btn-primary">
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors duration-200"
              aria-label="Toggle navigation menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 backdrop-blur-md shadow-inner animate-slide-up">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              if (item.requiresAuth && !session) return null;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-semibold transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {item.name}
                  </span>
                </Link>
              );
            })}

            {!session && (
              <div className="border-t border-slate-200 dark:border-slate-700 mt-4 pt-4">
                <Link
                  href="/auth/login"
                  className="block px-3 py-2 text-slate-900 dark:text-slate-200 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-md text-base font-semibold transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="block px-3 py-2 text-blue-700 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-md text-base font-semibold transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

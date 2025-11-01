"use client";

import { useState, useEffect } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  Eye,
} from "lucide-react";

interface Claim {
  id: string;
  content: string;
  status: "completed" | "processing" | "failed" | "pending" | string;
  created_at: string;
}

interface DashboardStats {
  total_claims: number;
  pending_claims: number;
  completed_claims: number;
  rti_requests: number;
  recent_claims: Claim[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      router.push("/auth/login");
      return;
    }
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, router]);

  const fetchDashboardData = async () => {
    if (!session?.access_token) return;

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

      // --- fetch dashboard summary
      const statsRes = await fetch(`${base}/api/v1/dashboard/stats`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!statsRes.ok) throw new Error(`HTTP ${statsRes.status}`);
      const statsData = (await statsRes.json()) as DashboardStats;

      // --- fetch all claims (no limit)
      const claimsRes = await fetch(`${base}/claims/browse?sort=desc`);
      const claimsData = (await claimsRes.json()) as Claim[];

      setStats(statsData);
      setClaims(Array.isArray(claimsData) ? claimsData : []);
      setError(null);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (!session) return <div className="text-center py-20">Redirecting...</div>;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-8"></div>
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card">
                <div className="h-4 bg-slate-200 rounded w-2/3 mb-2"></div>
                <div className="h-8 bg-slate-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="card h-40" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-warning-600 mb-4" />
        <h2 className="text-xl font-bold mb-2">Could not load dashboard</h2>
        <p className="text-slate-600 mb-4">{error}</p>
        <button onClick={fetchDashboardData} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden min-h-screen text-slate-800">
      {/* background blobs like Home */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-200 via-blue-200 to-cyan-100 rounded-full blur-[120px] opacity-60 animate-pulse-slow"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-pink-200 via-purple-200 to-indigo-100 rounded-full blur-[120px] opacity-60 animate-pulse-slow"></div>

      <main className="relative z-10 space-y-10 md:space-y-12 mx-auto my-8 p-4 md:p-10 max-w-6xl rounded-[2rem] shadow-[0_8px_32px_rgba(31,38,135,0.15)] bg-white/60 backdrop-blur-2xl border border-white/40">

        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-700 via-blue-700 to-purple-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-slate-600">
                Welcome back! Track your fact-checking activity and submissions.
              </p>
            </div>

            <Link href="/" className="btn-primary flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              New Claim
            </Link>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid md:grid-cols-4 gap-6">
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Total Claims</span>
                  <FileText className="w-5 h-5 text-primary-600" />
                </div>
                <div className="text-3xl font-bold text-slate-900">
                  {stats.total_claims ?? 0}
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Pending Analysis</span>
                  <Clock className="w-5 h-5 text-warning-600" />
                </div>
                <div className="text-3xl font-bold text-warning-600">
                  {stats.pending_claims ?? 0}
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Completed</span>
                  <CheckCircle className="w-5 h-5 text-success-600" />
                </div>
                <div className="text-3xl font-bold text-success-600">
                  {stats.completed_claims ?? 0}
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">RTI Requests</span>
                  <AlertTriangle className="w-5 h-5 text-primary-600" />
                </div>
                <div className="text-3xl font-bold text-primary-600">
                  {stats.rti_requests ?? 0}
                </div>
              </div>
            </div>
          )}

          {/* All Claims */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Your Claims</h2>
            </div>

            {claims.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No claims yet
                </h3>
                <p className="text-slate-600 mb-4">
                  Start fact-checking by submitting your first claim.
                </p>
                <Link href="/" className="btn-primary">
                  Submit First Claim
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {claims.map((claim) => (
                  <div
                    key={claim.id}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 truncate mb-2">{claim.content}</p>
                      <div className="flex items-center space-x-4 text-sm text-slate-500">
                        <span>
                          {new Date(claim.created_at).toLocaleDateString()}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            claim.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : claim.status === "processing"
                              ? "bg-yellow-100 text-yellow-700"
                              : claim.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {claim.status}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/claims/${claim.id}`}
                      className="ml-4 text-primary-600 hover:text-primary-700"
                    >
                      <Eye className="w-5 h-5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

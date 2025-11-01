'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { MessageCircle, ThumbsUp, Clock } from 'lucide-react'

// --- Utility: Time formatting ---
function formatTimeAgo(dateString: string | undefined): string {
  if (!dateString) return 'unknown'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'invalid date'
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    let interval = seconds / 31536000
    if (interval > 1) return `${Math.floor(interval)} year${Math.floor(interval) === 1 ? '' : 's'} ago`
    interval = seconds / 2592000
    if (interval > 1) return `${Math.floor(interval)} month${Math.floor(interval) === 1 ? '' : 's'} ago`
    interval = seconds / 86400
    if (interval > 1) return `${Math.floor(interval)} day${Math.floor(interval) === 1 ? '' : 's'} ago`
    interval = seconds / 3600
    if (interval > 1) return `${Math.floor(interval)} hour${Math.floor(interval) === 1 ? '' : 's'} ago`
    interval = seconds / 60
    if (interval > 1) return `${Math.floor(interval)} minute${Math.floor(interval) === 1 ? '' : 's'} ago`
    return `${Math.max(0, Math.floor(seconds))} seconds ago`
  } catch {
    return 'date error'
  }
}

type SortType = 'newest' | 'popular' | 'relevant'

export default function BrowsePage() {
  const [claims, setClaims] = useState<ClaimOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<SortType>('newest')

  const fetchClaims = useCallback(async () => {
    setLoading(true)
    setError(null)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    const fetchUrl = `${backendUrl}/claims/browse?sort=${sort}`
    try {
      const response = await fetch(fetchUrl)
      if (!response.ok) {
        let detail = `Error ${response.status}`
        try {
          const err = await response.json()
          detail = err.detail || detail
        } catch {}
        throw new Error(detail)
      }

      let data: ClaimOut[] = await response.json()

      // ✅ Include ALL claims (including false)
      data = data.filter((claim) => claim.status !== 'failed')

      // ✅ Local sorting fallback logic
      if (sort === 'newest') {
        data = [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      } else if (sort === 'popular') {
        // Sort by most comments + upvotes = “most discussed”
        data = [...data].sort((a, b) => (b.comment_count + b.upvote_count) - (a.comment_count + a.upvote_count))
      } else if (sort === 'relevant') {
        // “Relevant” = confidence + upvotes + recency
        data = [...data].sort((a, b) => {
          const aScore =
            (a.analysis?.confidence_score || 0) * 100 +
            a.upvote_count * 2 +
            a.comment_count
          const bScore =
            (b.analysis?.confidence_score || 0) * 100 +
            b.upvote_count * 2 +
            b.comment_count
          return bScore - aScore
        })
      }

      setClaims(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch claims')
    } finally {
      setLoading(false)
    }
  }, [sort])

  useEffect(() => {
    fetchClaims()
  }, [fetchClaims])

  const SortButton = ({ type, label }: { type: SortType; label: string }) => (
    <button
      onClick={() => setSort(type)}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 backdrop-blur-md shadow-sm ${
        sort === type
          ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-105'
          : 'bg-white/70 text-slate-700 hover:bg-slate-100 hover:shadow-md'
      }`}
    >
      {label}
    </button>
  )

  const Link = ({
    href,
    children,
    ...props
  }: React.PropsWithChildren<{ href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
    <a href={href} {...props}>
      {children}
    </a>
  )

  return (
    <div className="relative overflow-hidden min-h-screen text-slate-900 rounded-[2rem] animate-fadeIn">
      {/* Background gradient blobs */}
      <div className="absolute -top-40 -left-60 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-indigo-200 via-blue-200 to-cyan-100 rounded-full blur-[80px] opacity-50 animate-pulse-slow"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-pink-200 via-purple-200 to-indigo-100 rounded-full blur-[100px] opacity-80 animate-pulse-slow"></div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 font-sans animate-fadeIn">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-8 tracking-tight text-center bg-gradient-to-r from-indigo-700 via-blue-700 to-purple-600 bg-clip-text text-transparent">
          Browse Claims
        </h1>

        {/* Sort Buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-10 animate-fadeIn">
          <SortButton type="newest" label="Newest" />
          <SortButton type="popular" label="Most Discussed" />
          <SortButton type="relevant" label="Most Relevant" />
        </div>

        {/* Claims Section */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-fadeIn">
          {loading &&
            [...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-52 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_25px_rgba(0,0,0,0.05)] animate-pulse p-5"
              >
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-3"></div>
                <div className="h-5 bg-slate-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-slate-200 rounded w-full mb-3"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </div>
            ))}

          {!loading && error && (
            <div className="col-span-full text-center bg-red-50/80 backdrop-blur-md border border-red-200 text-red-700 rounded-2xl p-6 shadow-md">
              <p className="font-semibold">Error loading claims</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && claims.length === 0 && (
            <div className="col-span-full text-center bg-white/70 backdrop-blur-xl border border-slate-200 text-slate-600 rounded-2xl p-6 shadow-md">
              <p>No claims available at the moment.</p>
            </div>
          )}

          {!loading &&
            !error &&
            claims.map((claim) => (
              <Link
                href={`/claims/${claim.id}`}
                key={claim.id}
                className="group bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-[0_8px_25px_rgba(59,130,246,0.1)] hover:shadow-[0_8px_35px_rgba(59,130,246,0.25)] hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between"
                title={claim.content}
              >
                <div>
                  <div className="mb-3">
                    <VerdictBadge
                      verdict={claim.analysis?.verdict}
                      confidence={claim.analysis?.confidence_score}
                      size="sm"
                    />
                  </div>
                  <p className="text-slate-800 text-sm line-clamp-3 leading-relaxed group-hover:text-slate-900 transition-colors">
                    {claim.content}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mt-3">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-500" /> {formatTimeAgo(claim.created_at)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-blue-500" /> {claim.comment_count}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ThumbsUp className="w-4 h-4 text-purple-500" /> {claim.upvote_count}
                  </span>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  )
}

// --- Verdict Badge ---
const VerdictBadge = ({
  verdict,
  confidence,
  size = 'md',
}: {
  verdict?: 'true' | 'false' | 'misleading' | 'uncertain' | string | null
  confidence?: number | null
  size?: 'sm' | 'md'
}) => {
  const colorMap: Record<string, string> = {
    true: 'from-green-400 via-emerald-500 to-green-600 text-white',
    false: 'from-red-400 via-rose-500 to-red-600 text-white',
    misleading: 'from-yellow-400 via-amber-500 to-orange-500 text-white',
    uncertain: 'from-slate-300 via-slate-400 to-slate-500 text-slate-900',
  }

  const gradient = colorMap[verdict || 'uncertain'] || colorMap.uncertain
  const text = verdict ? verdict.charAt(0).toUpperCase() + verdict.slice(1) : 'Pending'
  const confidenceText = confidence ? ` (${Math.round(confidence * 100)}%)` : ''
  const padding = size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold bg-gradient-to-r ${gradient} ${padding} ${textSize} shadow-[0_0_10px_rgba(0,0,0,0.1)]`}
    >
      {text}
      {confidenceText}
    </span>
  )
}

// --- Types ---
export interface UserPreview {
  id?: string
  full_name?: string
  avatar_url?: string
}

export interface CommentOut {
  id: string
  content: string
  upvotes: number
  downvotes: number
  is_expert_response: boolean
  created_at: string
  updated_at?: string
  user?: UserPreview
}

export interface AnalysisOut {
  id?: string
  verdict?: 'true' | 'false' | 'misleading' | 'uncertain'
  confidence_score?: number
  summary?: string
  evidence: any[]
  sources: any[]
  ai_reasoning?: string
  created_at?: string
}

export interface ClaimOut {
  id: string
  content: string
  status: string
  created_at: string
  comment_count: number
  upvote_count: number
  content_type: 'text' | 'url' | 'image' | 'video'
  comments: CommentOut[]
  analysis?: AnalysisOut
}

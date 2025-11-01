'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  CheckCircle, XCircle, AlertTriangle, HelpCircle,
  Clock, MessageCircle, ExternalLink, FileText,
  ThumbsUp, ThumbsDown, Send, Loader2, ArrowUp
} from 'lucide-react'
import CommentSection from '@/components/CommentSection'
import RTIRequestPanel from '@/components/RTIRequestPanel'
import { useSession } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/navigation'

type Verdict = 'true' | 'false' | 'misleading' | 'uncertain';
type VoteType = 'up' | 'down';

interface EvidenceItem {
  source: string
  excerpt: string
  credibility_score?: number
  url?: string
}

interface SourceItem {
  title: string
  url?: string
  type: string
  verified: boolean
}

interface Claim {
  id: string
  content: string
  content_type: string
  original_url?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  evidence?: EvidenceItem[]
  upvote_count: number
}

interface Analysis {
  id: string
  verdict: Verdict
  confidence_score: number
  summary: string
  evidence: EvidenceItem[]
  sources: SourceItem[]
  ai_reasoning: string
}

interface ClaimDetail {
  claim: Claim
  analysis?: Analysis | null
  comment_count: number
  user_vote: VoteType | null
}

const VerdictBadge = ({ verdict, confidence, processing, size = 'md' }: {
  verdict?: Verdict | string | null;
  confidence?: number | null;
  processing?: boolean;
  size?: 'sm' | 'md';
}) => {
  if (processing) {
    return (
      <span className={`inline-flex items-center rounded-full font-medium px-2.5 py-0.5 text-sm bg-blue-100 text-blue-800`}>
        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
        Processing...
      </span>
    );
  }

  const bgColor =
    verdict === 'true' ? 'bg-green-100 text-green-800' :
    verdict === 'false' ? 'bg-red-100 text-red-800' :
    verdict === 'misleading' ? 'bg-yellow-100 text-yellow-800' :
    verdict === 'uncertain' ? 'bg-sky-100 text-sky-800' :
    verdict === 'Failed' ? 'bg-red-100 text-red-800' :
    'bg-slate-100 text-slate-800';

  const text = verdict === 'Failed' ? 'Failed' : (verdict ? verdict.charAt(0).toUpperCase() + verdict.slice(1) : 'Pending');
  const confidenceText = confidence && verdict !== 'Failed' ? ` (${Math.round(confidence * 100)}%)` : '';

  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-0.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${padding} ${textSize} ${bgColor}`}>
      {text}{confidenceText}
    </span>
  );
};

export default function ClaimDetailPage() {
  const [claimDetail, setClaimDetail] = useState<ClaimDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const claimIdRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchAttemptRef = useRef(0);

  // --- NEW STATE & HOOKS ---
  const session = useSession()
  const router = useRouter()
  const [voteCount, setVoteCount] = useState(0)
  const [userVote, setUserVote] = useState<VoteType | null>(null)
  const [isVoting, setIsVoting] = useState(false)
  // --- END NEW STATE ---

  const parseJsonField = (field: any): any[] => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch {
        return [];
      }
    }
    return [];
  };

  const fetchClaimDetail = async (id: string, isPoll: boolean = false) => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // --- ADD AUTH HEADERS ---
    const headers: HeadersInit = {
        'Cache-Control': 'no-cache',
    }
    if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
    }
    // --- END AUTH HEADERS ---

    try {
      fetchAttemptRef.current += 1;
      console.log(`[Fetch #${fetchAttemptRef.current}] Fetching claim ${id}... (Poll: ${isPoll})`);
      
      const response = await fetch(`${backendUrl}/api/v1/claims/${id}`, {
        cache: 'no-store',
        headers: headers // <-- APPLY HEADERS
      });
      
      if (!response.ok) {
        let errorDetail = `Failed to fetch claim (${response.status})`;
        try {
          const errData = await response.json();
          errorDetail = errData.detail || errorDetail;
        } catch { /* Ignore */ }
        
        if (!isPoll) {
          setError(errorDetail + `. Is the backend running at ${backendUrl}?`);
          setLoading(false);
        } else {
          console.warn("Polling fetch failed:", errorDetail);
        }
        return;
      }

      const data = await response.json() as ClaimDetail;
      console.log(`[Fetch #${fetchAttemptRef.current}] Received claim data:`, {
        status: data?.claim?.status,
        hasAnalysis: !!data?.analysis,
        analysisId: data?.analysis?.id,
        upvotes: data?.claim?.upvote_count,
        userVote: data?.user_vote
      });

      // Parse JSON fields in analysis
      if (data?.analysis) {
        data.analysis.evidence = parseJsonField(data.analysis.evidence);
        data.analysis.sources = parseJsonField(data.analysis.sources);
      }

      const status = data?.claim?.status;
      const analysisAvailable = !!data?.analysis?.id;

      setClaimDetail(data);

      // --- ADD VOTE STATE INIT ---
      setVoteCount(data.claim.upvote_count || 0)
      setUserVote(data.user_vote || null)
      // --- END VOTE STATE INIT ---

      if (status === 'completed' || status === 'failed') {
        console.log(`[Fetch #${fetchAttemptRef.current}] Final status reached (${status}), stopping loading.`);
        setLoading(false);
        
        if (status === 'failed') {
          setError("The analysis process encountered an error. You may need to try submitting again.");
        } else if (status === 'completed' && analysisAvailable) {
          setError(null);
        } else if (status === 'completed' && !analysisAvailable) {
          console.warn(`[Fetch #${fetchAttemptRef.current}] Claim COMPLETED but analysis missing.`);
        }
      } else if (status === 'processing' || status === 'pending') {
        if (!loading && !isPoll) setLoading(true);
        if (error) setError(null);
      }

    } catch (err) {
      console.error(`[Fetch #${fetchAttemptRef.current}] Fetch error:`, err);
      if (!isPoll) {
        setError(err instanceof Error ? `${err.message}. Is the backend running at ${backendUrl}?` : 'Unknown error occurred')
        setLoading(false);
      } else {
        console.warn("Error during polling fetch:", err);
      }
    }
  };

  // --- NEW VOTE HANDLER FUNCTION ---
  const handleVote = async () => {
    if (!session) {
        router.push('/auth/login')
        return
    }
    if (!claimIdRef.current || isVoting || userVote === 'up') {
        // Already voted or currently voting
        return
    }

    setIsVoting(true)
    
    // Optimistic UI update
    const oldVoteCount = voteCount
    const oldUserVote = userVote
    setVoteCount(voteCount + 1)
    setUserVote('up')

    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/claims/${claimIdRef.current}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ vote_type: 'up' })
        })

        if (!response.ok) {
            // Revert optimistic update on failure
            setVoteCount(oldVoteCount)
            setUserVote(oldUserVote)
            throw new Error('Failed to submit vote')
        }
        
        // Data is now saved, state is already updated
        
    } catch (err) {
        console.error("Vote failed:", err)
        // Revert optimistic update
        setVoteCount(oldVoteCount)
        setUserVote(oldUserVote)
    } finally {
        setIsVoting(false)
    }
  }
  // --- END NEW FUNCTION ---

  useEffect(() => {
    const pathSegments = window.location.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];
    if (id && /^[0-9a-fA-F-]{36}$/.test(id)) {
      console.log("[Init] Extracted Claim ID:", id);
      claimIdRef.current = id;
      fetchAttemptRef.current = 0;
      setLoading(true);
      fetchClaimDetail(id, false);
    } else {
      console.error("[Init] Invalid or missing Claim ID in URL:", window.location.pathname);
      setError("Invalid or missing Claim ID in URL.");
      setLoading(false);
    }
  }, [session?.access_token]); // <-- MODIFIED DEPENDENCY ARRAY

  useEffect(() => {
    const startPolling = (id: string) => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      console.log(`[Polling] Starting polling for claim: ${id}`);
      pollingIntervalRef.current = setInterval(() => {
        console.log("[Polling] Polling tick...");
        fetchClaimDetail(id, true);
      }, 3000); // Poll every 3 seconds for faster updates
    };

    const stopPolling = () => {
      if (pollingIntervalRef.current) {
        console.log("[Polling] Stopping polling.");
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    const currentStatus = claimDetail?.claim?.status;
    const currentClaimId = claimIdRef.current;

    if (currentClaimId && (currentStatus === 'processing' || currentStatus === 'pending')) {
      startPolling(currentClaimId);
    } else {
      stopPolling();
      if (currentStatus === 'completed' || currentStatus === 'failed') {
        setLoading(false);
      }
    }

    return () => {
      stopPolling();
    };
  }, [claimDetail?.claim?.status, session?.access_token]); // <-- MODIFIED DEPENDENCY ARRAY

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {claimDetail?.claim?.status === 'processing' ? 'Analysis in Progress...' : 'Loading Claim Details...'}
          </h3>
          <p className="text-slate-600">
            {claimDetail?.claim?.status === 'processing'
              ? "Our AI is analyzing this claim. This typically takes 30-60 seconds. The page will update automatically."
              : "Please wait while we fetch the information."
            }
          </p>
        </div>
      </div>
    )
  }

  if (error && !claimDetail?.claim?.id) {
    return (
      <div className="max-w-4xl mx-auto text-center p-4 md:p-6">
        <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm">
          <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-slate-800">Error Loading Claim</h1>
          <p className="text-slate-600">{error || 'Could not load claim details.'}</p>
        </div>
      </div>
    )
  }

  if (!claimDetail?.claim) {
    return (
      <div className="max-w-4xl mx-auto text-center p-4 md:p-6">
        <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm">
          <AlertTriangle className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-slate-800">Claim Data Incomplete</h1>
          <p className="text-slate-600">Could not retrieve full claim information. Please try refreshing.</p>
        </div>
      </div>
    )
  }

  const { claim, analysis, comment_count } = claimDetail;
  const isProcessing = claim.status === 'processing' || claim.status === 'pending';
  const analysisFailed = claim.status === 'failed';
  const analysisCompleteAndAvailable = claim.status === 'completed' && !!analysis?.id;
  const analysisUnavailable = claim.status === 'completed' && !analysis?.id;

  return (
    <div className="max-w-8xl mx-auto space-y-8 p-4 md:p-6 font-sans">
      <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6">
          <div className="flex-1 mb-4 sm:mb-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">

              <div className="flex items-center justify-start mb-2 bg-white p-2 border border-slate-200 rounded-xl shadow-md transition-all duration-300">
                <span className="flex items-center text-base font-medium text-slate-900 tracking-wide ">
                  <Clock className="w-5 h-5 mr-2 flex-shrink-0 text-indigo-600" />
                  {new Date(claim.created_at).toLocaleDateString('en-GB')}
                </span>
              </div>

              <div className="flex-1 flex justify-center">
                <div className="scale-175 sm:scale-150 transform origin-center p-2">
                  <VerdictBadge
                    processing={isProcessing}
                    verdict={isProcessing ? 'Pending' : (analysisFailed ? 'Failed' : (analysisCompleteAndAvailable ? analysis.verdict : 'Pending'))}
                    confidence={analysisCompleteAndAvailable ? analysis.confidence_score : undefined}
                  />
                </div>
              </div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 bg-clip-text text-transparent">Fact-Check Analysis</h1>
          </div>
          
          {/* --- NEW UPVOTE BUTTON --- */}
          <button
            onClick={handleVote}
            disabled={isVoting || userVote === 'up'}
            className={`flex-shrink-0 px-4 py-2 rounded-lg border transition-all duration-150 flex items-center space-x-2
                ${
                userVote === 'up'
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-50'
                }
            `}
          >
            <ArrowUp className="w-5 h-5" />
            <span className="font-medium">Upvote</span>
            <span className={`font-medium ${userVote === 'up' ? 'text-white' : 'text-slate-900'}`}>{voteCount}</span>
          </button>
          {/* --- END UPVOTE BUTTON --- */}

        </div>

        <div className="bg-slate-50 rounded-lg p-4 sm:p-6 mb-6 border border-slate-200">
          <div className="flex items-center">
            <FileText className="w-6 h-6 mr-1 flex-shrink-0 text-slate-700 dark:text-slate-800" />
            <h2 className="text-lg font-semibold mt-2 mb-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 bg-clip-text text-transparent ">
              Original Claim
            </h2>
          </div>
          <p className="text-slate-900 leading-relaxed break-words">{claim.content}</p>
          {claim.original_url && (
            <div className="mt-4">
              <a href={claim.original_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm hover:underline">
                <ExternalLink className="w-4 h-4 mr-1" />
                View Original Source
              </a>
            </div>
          )}
        </div>

        {analysisCompleteAndAvailable ? (
          <div className="space-y-6 ">
            <div className='bg-slate-100 p-4 border border-slate-200 rounded-lg shadow-sm'>
              <h3 className="text-lg font-semibold mb-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 bg-clip-text text-transparent ">Analysis Summary</h3>
              <p className="text-slate-900 leading-relaxed">{analysis.summary}</p>
            </div>

            {analysis.evidence?.length > 0 && (
              <div className='bg-slate-100 p-4 border border-slate-200 rounded-lg shadow-sm'>
                <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 bg-clip-text text-transparent">Supporting Evidence</h3>
                <div className="space-y-4">
                  {analysis.evidence.map((evidence, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 py-2 bg-slate-50 rounded-r-md">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 mr-5">
                        <h4 className="font-medium text-slate-900 mb-1 sm:mb-0">{evidence.source || 'Source'}</h4>
                        {evidence.credibility_score && (
                          <span className="text-sm text-slate-800 flex-shrink-0">
                            Credibility: {Math.round(evidence.credibility_score * 100)}%
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-sm italic mb-2">"{evidence.excerpt}"</p>
                      {evidence.url && (
                        <a href={evidence.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-sm hover:underline inline-block">
                          Read full source →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.ai_reasoning && (
              <div className='bg-slate-100 p-4 border border-slate-200 rounded-lg shadow-sm'>
                <h3 className="text-lg font-semibold mb-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 bg-clip-text text-transparent">AI Analysis Reasoning</h3>
                <div className="bg-slate-100 rounded-lg p-4 border border-slate-200">
                  <p className="text-slate-900 leading-relaxed whitespace-pre-wrap">{analysis.ai_reasoning}</p>
                </div>
              </div>
            )}
  
            {/* This block was broken in the original file as EvidenceList is not defined.
              The evidence is already correctly displayed above from 'analysis.evidence'.
            */}
            {/* {claim.evidence?.length ? (
                       <EvidenceList evidence={claim.evidence} />
                              ) : (
                                <p className="text-gray-400 italic">No supporting sources yet — analysis based on internal data.</p>
             )}
            */}

            {analysis.sources?.length > 0 && (
              <div className='bg-slate-100 p-4 border border-slate-200 rounded-lg shadow-sm'>
                <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 bg-clip-text text-transparent">Referenced Sources</h3>
                <div className="grid gap-3">
                  {analysis.sources.map((source, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="mb-2 sm:mb-0">
                        <h4 className="font-medium text-slate-900 break-all">{source.title || 'Source'}</h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
                          <span>Type: {source.type || 'N/A'}</span>
                          {source.verified && (
                            <span className="inline-flex items-center text-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Verified
                            </span>
                          )}
                        </div>
                      </div>
                      {source.url && (
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 flex-shrink-0 ml-0 sm:ml-4" title="Visit source">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (isProcessing) ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-medium bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 bg-clip-text text-transparent">Analysis in Progress</h3>
            <p className="text-slate-900">Our AI is analyzing this claim. This typically takes 30-60 seconds. The page will update automatically.</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {analysisFailed ? "Analysis Failed" : "Analysis Data Unavailable"}
            </h3>
            <p className="text-slate-600">
              {analysisFailed
                ? "We encountered an issue during the analysis process. You might need to resubmit the claim."
                : "The analysis for this claim was processed, but the data couldn't be loaded. Please try refreshing the page."
              }
            </p>
            {error && !analysisFailed && <p className="text-red-600 text-sm mt-2">Details: {error}</p>}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div id="comments">
            {claimIdRef.current && <CommentSection claimId={claimIdRef.current} />}
          </div>
        </div>

        <div className="space-y-6">
          {claimIdRef.current && claim?.content && <RTIRequestPanel claimId={claimIdRef.current} claimContent={claim.content} />}

          <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
            <h3 className="font-semibold mb-4 text-slate-800">Share This Analysis</h3>
            <div className="flex space-x-2">
              <button className="px-4 py-2 border border-slate-300 text-slate-700 bg-white rounded-md hover:bg-slate-50 flex-1" onClick={() => navigator.clipboard.writeText(window.location.href)}>
                Copy Link
              </button>
              <button className="px-3 py-2 border border-slate-300 text-slate-700 bg-white rounded-md hover:bg-slate-50 disabled:opacity-50" disabled>
                Share
              </button>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
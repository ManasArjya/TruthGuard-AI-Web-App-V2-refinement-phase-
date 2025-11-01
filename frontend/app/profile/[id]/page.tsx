'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from '@supabase/auth-helpers-react'
import { User, Calendar, MessageCircle, Clock, FileText } from 'lucide-react'

export default function ProfilePage() {
  const params = useParams()
  const session = useSession()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const userId = params.id as string

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/${userId}/profile`)
        if (!res.ok) throw new Error('Failed to fetch profile')
        const data = await res.json()
        setProfile(data.profile)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [userId])

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading profile...</div>
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <User className="mx-auto h-12 w-12 text-slate-400 mb-3" />
        <p className="text-lg text-slate-600">Profile not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      {/* Header */}
      <div className="rounded-2xl p-8 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="flex items-center space-x-6">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="User Avatar"
              className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center border-4 border-white shadow-md">
              <User className="w-10 h-10 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">{profile.full_name || 'Anonymous User'}</h1>
            <p className="text-white/80">{profile.email}</p>
            <div className="flex items-center text-sm text-white/80 mt-2">
              <Calendar className="w-4 h-4 mr-1" />
              <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Total Claims', value: profile.total_claims || 0 },
          { label: 'Comments', value: profile.total_comments || 0 },
          { label: 'Verified Claims', value: profile.verified_claims || 0 },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-6 shadow-md border border-slate-200 text-center hover:shadow-lg transition-all duration-300"
          >
            <div className="text-2xl font-bold text-indigo-600">{stat.value}</div>
            <div className="text-sm text-slate-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity Placeholder */}
      <div className="space-y-6">
        <div className="card bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <h2 className="text-xl font-semibold mb-3 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-indigo-600" />
            Recent Claims
          </h2>
          <p className="text-slate-600">This section will show user’s recent claims and analysis activity.</p>
        </div>

        <div className="card bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <h2 className="text-xl font-semibold mb-3 flex items-center">
            <MessageCircle className="w-5 h-5 mr-2 text-indigo-600" />
            Recent Comments
          </h2>
          <p className="text-slate-600">This section will display user’s recent comments and discussions.</p>
        </div>
      </div>
    </div>
  )
}

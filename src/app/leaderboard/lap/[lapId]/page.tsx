"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";
import TrackMap from "@/components/TrackMap";

export default function PublicLapPage() {
  const params = useParams();
  const lapId = (params as Record<string, string>)?.lapId ?? "";

  const { data, isLoading, error } = api.leaderboard.getLapPublic.useQuery({ lapId }, { enabled: !!lapId });

  if (!lapId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Invalid lap URL</h1>
          <Link href="/leaderboard" className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors">Back to Leaderboard</Link>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl">Loading lap...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Error loading lap</h1>
          <p className="text-red-400 mb-4">{error.message}</p>
          <Link href="/leaderboard" className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors">Back to Leaderboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <div className="px-6 py-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/leaderboard" className="inline-flex items-center gap-2 text-white hover:text-red-400 transition-colors group">
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Leaderboard</span>
          </Link>
          <div className="text-sm text-gray-400">by {data.ownerUsername}</div>
        </div>

        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2">{data.track}</h1>
          <div className="text-gray-300">{data.car} • {data.conditions} • {data.lapTime}</div>
        </div>

        {/* Map */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <TrackMap telemetryData={data.telemetryPoints ?? []} />
        </div>
      </div>
    </div>
  );
} 
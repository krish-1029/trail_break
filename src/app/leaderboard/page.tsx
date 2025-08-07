"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import ProfileIcon from "@/components/ProfileIcon";

export default function LeaderboardPage() {
  const [selectedTrack, setSelectedTrack] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "list">("list");

  // Fetch featured laps from all users (public, no auth required)
  const { data: featuredLaps = [], isLoading, error } = api.leaderboard.getFeaturedLaps.useQuery();

  // Get unique tracks for filtering
  const uniqueTracks = [...new Set(featuredLaps.map(lap => lap.track))];

  // Filter laps by selected track
  const filteredLaps = selectedTrack === "all" 
    ? featuredLaps 
    : featuredLaps.filter(lap => lap.track === selectedTrack);

  const formatDate = (d: Date) => new Date(d).toISOString().split("T")[0];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Error loading leaderboard</h1>
          <p className="text-red-400 mb-4">{error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Back to landing button */}
      <div className="absolute top-6 left-6 z-10">
        <Link
          href="/landing"
          className="inline-flex items-center gap-2 px-4 py-2 text-white hover:text-red-400 transition-colors group"
        >
          <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">Back to Home</span>
        </Link>
      </div>

      <div className="px-6 py-12 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Trail Break <span className="text-red-500">Leaderboard</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Public laps featured by the community. Click any lap to view its full analysis.
          </p>
        </div>

        {/* Filters and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <label htmlFor="track-filter" className="block text-sm font-medium text-gray-300 mb-2">
              Filter by Track
            </label>
            <div className="relative">
              <select
                id="track-filter"
                value={selectedTrack}
                onChange={(e) => setSelectedTrack(e.target.value)}
                className="w-full px-4 py-3 pr-10 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none"
              >
                <option value="all">All Tracks ({featuredLaps.length} laps)</option>
                {uniqueTracks.map((track) => {
                  const trackLapCount = featuredLaps.filter(lap => lap.track === track).length;
                  return (
                    <option key={track} value={track}>
                      {track} ({trackLapCount} {trackLapCount === 1 ? 'lap' : 'laps'})
                    </option>
                  );
                })}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-300 mb-2">View Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-red-600 text-white"
                    : "bg-white/5 text-gray-300 hover:bg-white/10"
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  viewMode === "cards"
                    ? "bg-red-600 text-white"
                    : "bg-white/5 text-gray-300 hover:bg-white/10"
                }`}
              >
                Cards
              </button>
            </div>
          </div>
        </div>

        {/* Leaderboard Content */}
        {filteredLaps.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-2xl font-bold text-white mb-4">No Featured Laps Yet</h3>
            <p className="text-gray-400 mb-6">
              Users haven&apos;t featured any laps for public viewing yet. Check back soon!
            </p>
          </div>
        ) : viewMode === "list" ? (
          /* List View - match Data page */
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">LAP TIME</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">DATE</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">DRIVER</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">CAR</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">TRACK</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">AVG SPEED</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">MAX SPEED</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredLaps.map((lap) => (
                    <tr key={lap.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-white font-mono font-bold">
                        <Link href={`/data/${lap.id}?from=leaderboard`} className="hover:text-red-400 transition-colors">
                          {lap.lapTime}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{formatDate(lap.createdAt as unknown as Date)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <ProfileIcon name={lap.userName} size="sm" />
                          <span className="text-white font-medium">{lap.userDisplayName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{lap.car}</td>
                      <td className="px-6 py-4 text-slate-300">{lap.track}</td>
                      <td className="px-6 py-4 text-slate-300">{lap.avgSpeed.toFixed(1)} km/h</td>
                      <td className="px-6 py-4 text-slate-300">{lap.maxSpeed.toFixed(1)} km/h</td>
                      <td className="px-6 py-4">
                                                  <Link
                            href={`/data/${lap.id}?from=leaderboard`}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Card View - match Data page */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLaps.map((lap) => (
              <div key={lap.id} className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white">{lap.lapTime}</h3>
                      <p className="text-slate-400 text-sm">{formatDate(lap.createdAt as unknown as Date)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <ProfileIcon name={lap.userName} size="sm" />
                      <span className="text-white font-medium">{lap.userDisplayName}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400">Car</div>
                      <div className="text-white">{lap.car}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Track</div>
                      <div className="text-white">{lap.track}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Avg Speed</div>
                      <div className="text-white">{lap.avgSpeed.toFixed(1)} km/h</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Max Speed</div>
                      <div className="text-white">{lap.maxSpeed.toFixed(1)} km/h</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-slate-400">Conditions</div>
                      <div className="text-white">{lap.conditions}</div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Link href={`/data/${lap.id}?from=leaderboard`} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                      View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-16 py-8 border-t border-white/10">
          <p className="text-gray-400 mb-4">
            Want to share your best laps? Join Trail Break and feature your racing achievements.
          </p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Join the Community
          </Link>
        </div>
      </div>
    </div>
  );
} 
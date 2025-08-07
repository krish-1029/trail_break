"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";

export default function DataDashboard() {
  const { data: session } = useSession();
  const [selectedTrack, setSelectedTrack] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "list">("list");
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; lapId: string; lapName: string }>({
    isOpen: false,
    lapId: "",
    lapName: ""
  });
  
  // Fetch all lap data using tRPC
  const { data: allLaps = [], isLoading, error, refetch } = api.lap.getAll.useQuery(undefined, {
    enabled: !!session,
  });

  // Delete mutation
  const deleteLap = api.lap.delete.useMutation({
    onSuccess: () => {
      void refetch(); // Refresh the lap list
      setDeleteConfirm({ isOpen: false, lapId: "", lapName: "" }); // Close the dialog
    },
    onError: (error) => {
      console.error("Failed to delete lap:", error);
      alert("Failed to delete lap. Please try again.");
    }
  });

  const handleDeleteLap = (lapId: string, lapName: string) => {
    setDeleteConfirm({ isOpen: true, lapId, lapName });
  };

  const confirmDelete = () => {
    if (deleteConfirm.lapId) {
      deleteLap.mutate({ lapId: deleteConfirm.lapId });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ isOpen: false, lapId: "", lapName: "" });
  };

  // Filter laps by selected track
  const laps = selectedTrack === "all" 
    ? allLaps 
    : allLaps.filter(lap => lap.track === selectedTrack);

  // Get unique tracks for the filter dropdown
  const uniqueTracks = Array.from(new Set(allLaps.map(lap => lap.track)));

  // Calculate best lap time for filtered laps
  const bestLap = laps.length > 0 
    ? laps.reduce((best, current) => {
        const parseTime = (timeStr: string) => {
          const [minutes, seconds] = timeStr.split(":");
          return parseFloat(minutes ?? "0") * 60 + parseFloat(seconds ?? "0");
        };
        const currentTime = parseTime(current.lapTime);
        const bestTime = parseTime(best.lapTime);
        return currentTime < bestTime ? current : best;
      })
    : null;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl text-white">Loading your lap data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4 text-white">Error loading data</h1>
            <p className="text-red-400 mb-4">{error.message}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Delete Confirmation Dialog */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Delete Lap</h3>
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete this lap from <strong>{deleteConfirm.lapName}</strong>? 
              This action cannot be undone and will permanently remove all telemetry data.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-slate-300 hover:text-white border border-white/20 hover:border-white/40 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteLap.isPending}
                className={`px-4 py-2 rounded-lg text-white transition-colors ${
                  deleteLap.isPending
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {deleteLap.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-white">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Data Dashboard</h1>
          <p className="text-gray-400">Analyze your lap times and telemetry data</p>
        </div>

        {/* Track Filter and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <label htmlFor="track-filter" className="block text-sm font-medium text-slate-300 mb-2">
              Filter by Track
            </label>
            <div className="relative">
              <select
                id="track-filter"
                value={selectedTrack}
                onChange={(e) => setSelectedTrack(e.target.value)}
                className="w-full px-4 py-3 pr-10 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none"
              >
              <option value="all">All Tracks ({allLaps.length} laps)</option>
              {uniqueTracks.map((track) => {
                const trackLapCount = allLaps.filter(lap => lap.track === track).length;
                return (
                  <option key={track} value={track}>
                    {track} ({trackLapCount} {trackLapCount === 1 ? 'lap' : 'laps'})
                  </option>
                );
              })}
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-slate-300 mb-2">View Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-red-600 text-white"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  viewMode === "cards"
                    ? "bg-red-600 text-white"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                Cards
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-3xl font-bold text-green-400 mb-2">{bestLap ? bestLap.lapTime : "N/A"}</div>
            <div className="text-slate-300 font-medium">Best Lap Time</div>
            {bestLap && (
              <div className="text-sm text-slate-400 mt-2">{bestLap.track}</div>
            )}
          </div>
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-3xl font-bold text-blue-400 mb-2">{laps.length}</div>
            <div className="text-slate-300 font-medium">Total Laps</div>
            {selectedTrack === "all" && (
              <div className="text-sm text-slate-400 mt-2">{uniqueTracks.length} tracks</div>
            )}
          </div>
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {laps.length > 0 ? Math.max(...laps.map(l => l.maxSpeed)).toFixed(1) : "N/A"}
            </div>
            <div className="text-slate-300 font-medium">Top Speed (km/h)</div>
            {laps.length > 0 && (
              <div className="text-sm text-slate-400 mt-2">
                {laps.find(lap => lap.maxSpeed === Math.max(...laps.map(l => l.maxSpeed)))?.car}
              </div>
            )}
          </div>
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {bestLap ? bestLap.avgSpeed.toFixed(1) : "N/A"}
            </div>
            <div className="text-slate-300 font-medium">Best Avg Speed (km/h)</div>
            {bestLap && (
              <div className="text-sm text-slate-400 mt-2">{bestLap.car}</div>
            )}
          </div>
        </div>

        {laps && laps.length > 0 ? (
          <>
            {viewMode === "cards" ? (
              /* Card View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {laps.map((lap) => (
                  <div
                    key={lap.id}
                    className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-xl font-bold mb-2">{lap.track}</h2>
                        <p className="text-slate-400 mb-4">{lap.car}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteLap(lap.id, lap.track)}
                        className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete lap"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <Link href={`/data/${lap.id}`}>
                      <p className="text-3xl font-mono text-green-400 mb-2">{lap.lapTime}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-slate-400">Avg Speed:</span>
                          <span className="text-white ml-1">{lap.avgSpeed.toFixed(1)} km/h</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Max Speed:</span>
                          <span className="text-white ml-1">{lap.maxSpeed.toFixed(1)} km/h</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Date:</span>
                          <span className="text-white ml-1">{lap.date}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Conditions:</span>
                          <span className="text-white ml-1">{lap.conditions || 'Dry'}</span>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl overflow-hidden">
                <div className="px-6 py-6 border-b border-white/10">
                  <h2 className="text-2xl font-semibold text-blue-400">Recorded Laps</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Click on any lap to view detailed telemetry analysis
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5 border-b border-white/10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                          Lap Time
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                          Car
                        </th>
                        {selectedTrack === "all" && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Track
                          </th>
                        )}
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                          Avg Speed
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                          Max Speed
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                          Conditions
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {laps.map((lap) => (
                        <tr key={lap.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-lg font-semibold text-white">{lap.lapTime}</div>
                            {bestLap && lap.id === bestLap.id && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500 text-white mt-1">
                                Best
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-slate-300">
                            {lap.date}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-slate-300 font-medium">
                            {lap.car}
                          </td>
                          {selectedTrack === "all" && (
                            <td className="px-6 py-5 whitespace-nowrap text-slate-300">
                              <div className="font-medium">{lap.track}</div>
                            </td>
                          )}
                          <td className="px-6 py-5 whitespace-nowrap text-slate-300">
                            {lap.avgSpeed.toFixed(1)} km/h
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-slate-300">
                            {lap.maxSpeed.toFixed(1)} km/h
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm">
                              <div className="text-slate-300 font-medium">
                                {lap.conditions || 'Dry'}
                              </div>
                              <div className="text-xs text-slate-400">
                                Standard
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex gap-2">
                              <Link
                                href={`/data/${lap.id}`}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-600 to-red-400 hover:from-red-700 hover:to-red-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                              >
                                Analyze
                              </Link>
                              <button
                                onClick={() => handleDeleteLap(lap.id, lap.track)}
                                className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
                                title="Delete lap"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-slate-400 py-12">
            <h2 className="text-2xl font-semibold mb-2">No laps found</h2>
            <p>It looks like you haven&apos;t recorded any laps yet.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 
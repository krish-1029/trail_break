"use client";

import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";

export default function FeaturedPage() {
  const { data: session } = useSession();
  const [selectedLaps, setSelectedLaps] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Fetch all lap data
  const { data: allLaps = [], isLoading } = api.lap.getAll.useQuery(undefined, {
    enabled: !!session,
  });

  // Fetch user profile to get existing featured lap ids
  const { data: profile } = api.user.getProfile.useQuery(undefined, { enabled: !!session });

  // Initialize selection from saved featured laps
  useEffect(() => {
    if (profile?.featuredLapIds) {
      setSelectedLaps(profile.featuredLapIds);
    }
  }, [profile?.featuredLapIds]);

  // Calculate user statistics
  const totalLaps = allLaps.length;
  const uniqueTracks = [...new Set(allLaps.map(lap => lap.track))].length;
  
  const bestLap = allLaps.length > 0
    ? allLaps.reduce((best, current) => {
        const parseTime = (timeStr: string) => {
          const [minutes, seconds] = timeStr.split(":");
          return parseFloat(minutes ?? "0") * 60 + parseFloat(seconds ?? "0");
        };
        const currentTime = parseTime(current.lapTime);
        const bestTime = parseTime(best.lapTime);
        return currentTime < bestTime ? current : best;
      })
    : null;

  const topSpeed = allLaps.length > 0
    ? Math.max(...allLaps.map(lap => lap.maxSpeed))
    : 0;

  const handleLapSelection = (lapId: string) => {
    setSelectedLaps(prev => 
      prev.includes(lapId) 
        ? prev.filter(id => id !== lapId)
        : [...prev, lapId]
    );
    setSaveStatus("idle");
  };

  const updateFeatured = api.user.updateFeaturedLaps.useMutation({
    onSuccess: () => setSaveStatus("saved"),
    onError: () => setSaveStatus("error"),
  });

  const handleSaveFeatured = () => {
    setSaveStatus("saving");
    updateFeatured.mutate({ lapIds: selectedLaps });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl text-white">Loading featured laps...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="text-white">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Featured Laps</h1>
          <p className="text-gray-400">Showcase your best racing achievements to the world</p>
        </div>

        {/* User Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-3xl font-bold text-green-400 mb-1">{bestLap?.lapTime || "N/A"}</div>
            <div className="text-gray-300 font-medium">Best Lap Time</div>
            <div className="text-sm text-gray-500">{bestLap?.track || ""}</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-3xl font-bold text-blue-400 mb-1">{totalLaps}</div>
            <div className="text-gray-300 font-medium">Total Laps</div>
            <div className="text-sm text-gray-500">{uniqueTracks} tracks</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-3xl font-bold text-purple-400 mb-1">{topSpeed.toFixed(1)}</div>
            <div className="text-gray-300 font-medium">Top Speed (km/h)</div>
            <div className="text-sm text-gray-500">Personal best</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-3xl font-bold text-yellow-400 mb-1">{selectedLaps.length}</div>
            <div className="text-gray-300 font-medium">Featured Laps</div>
            <div className="text-sm text-gray-500">Public showcase</div>
          </div>
        </div>

        {/* Featured Laps Section */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-2xl font-bold mb-4">Featured Laps</h2>
          <p className="text-gray-400 mb-6">
            Choose your best laps to showcase publicly. Featured laps will be displayed on leaderboards and in your racing profile for others to see.
          </p>

          {allLaps.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">No laps recorded yet</h3>
              <p className="text-gray-400 mb-4">Start racing to create your featured collection!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allLaps.map((lap) => {
                const isSelected = selectedLaps.includes(lap.id);
                return (
                  <div
                    key={lap.id}
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-red-900/30 border-red-600"
                        : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                    }`}
                    onClick={() => handleLapSelection(lap.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? "bg-red-600 border-red-600" : "border-gray-400"
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{lap.lapTime}</div>
                        <div className="text-sm text-gray-400">{lap.track} • {lap.car}</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {lap.maxSpeed.toFixed(1)} km/h max
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="p-4 bg-gray-700 rounded-lg w-full sm:w-auto">
              <p className="text-sm text-gray-300">
                <strong>{selectedLaps.length}</strong> lap{selectedLaps.length !== 1 ? 's' : ''} selected for public display
              </p>
            </div>
            <div className="flex items-center gap-3">
              {saveStatus === "saved" && (
                <span className="text-green-400 text-sm">Saved!</span>
              )}
              {saveStatus === "error" && (
                <span className="text-red-400 text-sm">Failed to save. Try again.</span>
              )}
              <button
                onClick={handleSaveFeatured}
                disabled={saveStatus === "saving"}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {saveStatus === "saving" ? "Saving..." : "Save Featured Laps"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 
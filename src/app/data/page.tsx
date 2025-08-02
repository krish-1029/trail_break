"use client";

import Link from "next/link";
import { api } from "@/trpc/react";
import { useState } from "react";

export default function DataPage() {
  const [selectedTrack, setSelectedTrack] = useState<string>("all");
  
  // Fetch all lap data using tRPC
  const { data: allLaps = [], isLoading, error } = api.lap.getAll.useQuery();

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
          return parseFloat(minutes || "0") * 60 + parseFloat(seconds || "0");
        };
        const currentTime = parseTime(current.lapTime);
        const bestTime = parseTime(best.lapTime);
        return currentTime < bestTime ? current : best;
      })
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white flex items-center justify-center">
        <div className="text-xl">Loading telemetry data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white flex items-center justify-center">
        <div className="text-xl text-red-400">Error loading data: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-[1800px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="text-3xl font-bold transition-colors group">
                <span className="inline-block transition-colors duration-500 ease-in-out text-white group-hover:text-red-500">Trail</span>{" "}
                <span className="inline-block transition-colors duration-500 ease-in-out text-red-500 group-hover:text-white">Break</span>
              </Link>
              <div className="text-slate-400 text-sm mt-1">Sim-Racing Telemetry Analysis</div>
            </div>
            <div className="text-slate-300">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Filter by Track:</label>
                <select 
                  value={selectedTrack}
                  onChange={(e) => setSelectedTrack(e.target.value)}
                  className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none backdrop-blur-sm"
                >
                  <option value="all">All Tracks</option>
                  {uniqueTracks.map(track => (
                    <option key={track} value={track}>{track}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-red-400 to-red-200 bg-clip-text text-transparent">
            Telemetry Data
          </h1>
          <p className="text-slate-300 text-xl mb-6">
            {selectedTrack === "all" 
              ? `Your recorded laps from ${uniqueTracks.length} track${uniqueTracks.length !== 1 ? 's' : ''}. Click on any lap to view detailed telemetry analysis.`
              : `Your recorded laps from ${selectedTrack}. Click on any lap to view detailed telemetry analysis.`
            }
          </p>
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-blue-400 font-semibold text-lg mb-3">Enhanced Comprehensive Telemetry</h3>
            <p className="text-slate-300 text-sm mb-4">
              Latest telemetry system captures 60Hz data with comprehensive tire temperatures, weather conditions, 
              car setup parameters, and advanced physics data from Assetto Corsa's shared memory.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>Tire Temperature</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                <span>Weather Data</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                <span>3-Axis G-Forces</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                <span>Car State & Setup</span>
              </div>
            </div>
          </div>
          
          {/* Track Summary */}
          {selectedTrack !== "all" && laps.length > 0 && (
            <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4 text-purple-400">Track Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-slate-400 text-sm uppercase tracking-wide mb-1">Cars Used</div>
                  <div className="text-white font-medium">
                    {Array.from(new Set(laps.map(lap => lap.car))).join(", ")}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-sm uppercase tracking-wide mb-1">Total Laps</div>
                  <div className="text-white font-medium">{laps.length}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-sm uppercase tracking-wide mb-1">Conditions</div>
                  <div className="text-white font-medium">
                    {Array.from(new Set(laps.map(lap => lap.conditions))).join(", ")}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {bestLap?.lapTime || "N/A"}
            </div>
            <div className="text-slate-300 font-medium">Best Lap Time</div>
            {bestLap && (
              <div className="text-sm text-slate-400 mt-2">{bestLap.car}</div>
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

        {/* Laps Table */}
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
                    Data Quality
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
                      <div className="text-sm">
                        <div className="text-slate-300 font-medium">
                          {lap.totalDataPoints ? `${lap.totalDataPoints.toLocaleString()} pts` : 'Legacy'}
                        </div>
                        <div className="text-xs text-slate-400">
                          {lap.totalDataPoints && lap.totalDataPoints > 1000 
                            ? `${Math.round(lap.totalDataPoints / (parseFloat(lap.lapTime.split(':')[0] || '0') * 60 + parseFloat(lap.lapTime.split(':')[1] || '0')))}Hz`
                            : lap.totalDataPoints 
                              ? 'Low-res' 
                              : 'Unknown'
                          }
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <Link
                        href={`/data/${lap.id}`}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-600 to-red-400 hover:from-red-700 hover:to-red-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        Analyze
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 
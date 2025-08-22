"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import TrackMapPro from "@/components/TrackMapPro";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import type { TelemetryPoint } from "@/types/telemetry";

// Visualization modes for different data displays
type VisualizationMode = 'pedals' | 'tires' | 'gforce' | 'performance' | 'grip';



// Helper functions for data analysis used by the sidebar
const getMaxTireTemp = (point: TelemetryPoint): number => {
  return point.tyreTemperature ? Math.max(...point.tyreTemperature) : 0;
};

const getAverageTireTemp = (point: TelemetryPoint): number => {
  return point.tyreTemperature && point.tyreTemperature.length > 0 
    ? point.tyreTemperature.reduce((a, b) => a + b, 0) / point.tyreTemperature.length 
    : 0;
};

const getTotalGForce = (point: TelemetryPoint): number => {
  const x = point.gForceX || 0;
  const y = point.gForceY || 0;
  const z = point.gForceZ || 0;
  return Math.sqrt(x * x + y * y + z * z);
};

export default function LapAnalysisPage() {
  const params = useParams();
  const lapId = params?.lapId as string;
  const [hoveredPoint, setHoveredPoint] = useState<TelemetryPoint | null>(null);

  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('pedals');
  const [arrowMode, setArrowMode] = useState<'orientation' | 'trajectory' | 'both'>('orientation');
  const [isFrozen, setIsFrozen] = useState(false);

  const [telemetryDropdownOpen, setTelemetryDropdownOpen] = useState(true);

  const { data: session } = useSession();

  // Private fetch (requires auth)
  const { data: privateLap, isLoading: loadingPrivate, error: errorPrivate } = api.lap.getById.useQuery(
    { lapId },
    { enabled: !!session && !!lapId }
  );

  // Public fallback for featured laps
  const { data: publicLap, isLoading: loadingPublic, error: errorPublic } = api.leaderboard.getLapPublic.useQuery(
    { lapId },
    { enabled: !session && !!lapId }
  );

  const lapData = privateLap ?? publicLap;
  const isLoading = loadingPrivate || loadingPublic;
  const error = (errorPrivate as any) ?? (errorPublic as any);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading comprehensive lap analysis...</div>
      </div>
    );
  }

  if (error || !lapData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-red-400 text-xl">Error loading lap data</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
        <div className="max-w-[1800px] mx-auto px-6 py-8">
      {/* Header */}
        <div className="mb-8">
          <Link href={typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('from') === 'leaderboard' ? '/landing' : '/data'} className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-6">
            ← {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('from') === 'leaderboard' ? 'Back to Home' : 'Back to Laps'}
              </Link>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-400 to-red-200 bg-clip-text text-transparent">
            Lap Analysis
          </h1>
          <div className="text-xl text-slate-300 mb-4">
            <span className="font-semibold">{lapData.track}</span> • 
            <span className="font-semibold">{lapData.car}</span> • 
            <span className="font-mono text-green-400">{lapData.lapTime}</span>
            </div>
          {/* Enhanced lap info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-white/5 border border-white/10 backdrop-blur-sm p-4 rounded-xl">
              <div className="text-slate-400 text-xs uppercase tracking-wide">Driver</div>
              <div className="font-semibold text-lg mt-1">Trail Break Racer</div>
            </div>
            <div className="bg-white/5 border border-white/10 backdrop-blur-sm p-4 rounded-xl">
              <div className="text-slate-400 text-xs uppercase tracking-wide">Data Points</div>
              <div className="font-semibold text-lg mt-1">{lapData.totalDataPoints?.toLocaleString() || 'Legacy'}</div>
            </div>
            <div className="bg-white/5 border border-white/10 backdrop-blur-sm p-4 rounded-xl">
              <div className="text-slate-400 text-xs uppercase tracking-wide">Weather</div>
              <div className="font-semibold text-lg mt-1">
                {lapData.telemetryPoints[0]?.airTemp ? 
                  `${Math.round(lapData.telemetryPoints[0].airTemp)}°C` : 
                  'Unknown'
                }
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 backdrop-blur-sm p-4 rounded-xl">
              <div className="text-slate-400 text-xs uppercase tracking-wide">Tire Compound</div>
              <div className="font-semibold text-lg mt-1">
                {lapData.telemetryPoints[0]?.tyreCompound || 'Unknown'}
              </div>
          </div>
        </div>
      </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Visualization */}
          <div className="xl:col-span-2">
            <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-8">
              <div className="relative">
                                 <TrackMapPro
                   telemetryPoints={lapData.telemetryPoints}
                   showControls={true}
                   onActivePointChange={setHoveredPoint}
                   onStateChange={({ isFrozen, arrowMode, visualizationMode }) => {
                     setIsFrozen(isFrozen);
                     setArrowMode(arrowMode);
                     setVisualizationMode(visualizationMode);
                   }}
                 />
              </div>
                
              {/* Always Visible Collapsible Telemetry Data Panel */}
              <div className="mt-6 bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl overflow-hidden">
                {/* Always visible header */}
                <div 
                  className="flex justify-between items-center p-6 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setTelemetryDropdownOpen(!telemetryDropdownOpen)}
                >
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-semibold text-blue-400">Telemetry Data</h4>
                    <div className="text-xs text-slate-400">
                      {hoveredPoint ? (
                        <>
                          {isFrozen ? 'Frozen Position' : 'Live Position'} • 
                          {arrowMode === 'orientation' && ' Orientation'}
                          {arrowMode === 'trajectory' && ' Trajectory'}
                          {arrowMode === 'both' && ' Both Arrows'}
                        </>
                      ) : (
                        'No active position'
                      )}
                    </div>
                  </div>
                  <div className={`transition-transform duration-200 ${telemetryDropdownOpen ? 'rotate-180' : ''}`}>
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                
                {/* Collapsible content */}
                {telemetryDropdownOpen && (
                  <div className="px-6 pb-6 border-t border-white/10">
                    {hoveredPoint ? (
                      (() => {
                        const activePoint = hoveredPoint;
                        if (!activePoint) return null;

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                            {/* Basic Data */}
                            <div className="space-y-3">
                              <div className="text-blue-400 font-semibold text-sm">Basic Data</div>
                              <div className="space-y-2 text-sm">
                             <div>Time: <span className="text-slate-300">{activePoint.time.toFixed(2)}s</span></div>
                             <div>Speed: <span className="text-blue-400">{activePoint.speed.toFixed(1)} km/h</span></div>
                             <div>Throttle: <span className="text-green-400">{(activePoint.throttle * 100).toFixed(0)}%</span></div>
                             <div>Brake: <span className="text-red-400">{(activePoint.brake * 100).toFixed(0)}%</span></div>
                             <div>Gear: <span className="text-white">{activePoint.gear}</span></div>
                             <div>RPM: <span className="text-white">{activePoint.rpm}</span></div>
                           </div>
                         </div>

                            {/* G-Forces */}
                            <div className="space-y-3">
                              <div className="text-yellow-400 font-semibold text-sm">G-Forces</div>
                              <div className="space-y-2 text-sm">
                             <div>Lateral: <span className="text-yellow-300">{activePoint.gForceX.toFixed(1)}g</span></div>
                             <div>Longitudinal: <span className="text-yellow-300">{activePoint.gForceZ.toFixed(1)}g</span></div>
                             {activePoint.gForceY !== undefined && (
                               <div>Vertical: <span className="text-yellow-300">{activePoint.gForceY.toFixed(1)}g</span></div>
                             )}
                             <div>Total: <span className="text-yellow-400">{getTotalGForce(activePoint).toFixed(1)}g</span></div>
                             <div>Sector: <span className="text-white">{(activePoint.currentSector || 0) + 1}</span></div>
                             {activePoint.fuel !== undefined && (
                               <div>Fuel: <span className="text-blue-300">{activePoint.fuel.toFixed(1)}L</span></div>
                             )}
                           </div>
              </div>
              
                            {/* Tire Data */}
                            {activePoint.tyreTemperature && activePoint.tyreTemperature.length >= 4 ? (
                              <div className="space-y-3">
                                <div className="text-orange-400 font-semibold text-sm">Tire Data</div>
                                <div className="space-y-2 text-sm">
                               <div className="grid grid-cols-2 gap-1">
                                 <div>FL: <span className="text-orange-300">{activePoint.tyreTemperature[0]?.toFixed(0) || '0'}°C</span></div>
                                 <div>FR: <span className="text-orange-300">{activePoint.tyreTemperature[1]?.toFixed(0) || '0'}°C</span></div>
                                 <div>RL: <span className="text-orange-300">{activePoint.tyreTemperature[2]?.toFixed(0) || '0'}°C</span></div>
                                 <div>RR: <span className="text-orange-300">{activePoint.tyreTemperature[3]?.toFixed(0) || '0'}°C</span></div>
                               </div>
                               <div>Avg: <span className="text-orange-400">{getAverageTireTemp(activePoint).toFixed(0)}°C</span></div>
                               <div>Max: <span className="text-red-400">{getMaxTireTemp(activePoint).toFixed(0)}°C</span></div>
                               {activePoint.tyreCompound && (
                                 <div>Compound: <span className="text-green-300">{activePoint.tyreCompound}</span></div>
                               )}
                             </div>
                           </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="text-green-400 font-semibold text-sm">Environment</div>
                                <div className="space-y-2 text-sm">
                               {activePoint.airTemp !== undefined && (
                                 <div>Air: <span className="text-green-300">{activePoint.airTemp.toFixed(0)}°C</span></div>
                               )}
                               {activePoint.roadTemp !== undefined && (
                                 <div>Road: <span className="text-green-300">{activePoint.roadTemp.toFixed(0)}°C</span></div>
                               )}
                               {activePoint.surfaceGrip !== undefined && (
                                 <div>Grip: <span className="text-green-300">{(activePoint.surfaceGrip * 100).toFixed(0)}%</span></div>
                               )}
                               {(activePoint.absActive || activePoint.tcActive || activePoint.isInPit) && (
                                 <div className="mt-1">
                                   {activePoint.absActive && <span className="text-yellow-400">ABS </span>}
                                   {activePoint.tcActive && <span className="text-blue-400">TC </span>}
                                   {activePoint.isInPit && <span className="text-green-400">PIT </span>}
                                 </div>
                               )}
                             </div>
                           </div>
                         )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center text-slate-400 py-12">
                        <div className="space-y-2">
                          <p className="text-lg">No Data Selected</p>
                          <p className="text-sm">Hover over the track or freeze a position to see telemetry data</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Enhanced Legend */}
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Legend - {visualizationMode.charAt(0).toUpperCase() + visualizationMode.slice(1)}</h4>
                <div className="flex flex-wrap gap-4 text-sm">
                  {visualizationMode === 'pedals' && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-2 rounded" style={{
                          background: 'linear-gradient(to right, rgb(200,200,200) 0%, rgb(255,0,0) 100%)'
                        }}></div>
                        <span>Braking (fades to red)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-2 rounded" style={{
                          background: 'linear-gradient(to right, rgb(200,200,200) 0%, rgb(0,255,0) 100%)'
                        }}></div>
                        <span>Throttle (fades to green)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-2 bg-gray-300 rounded"></div>
                        <span>Coasting</span>
                      </div>
                    </>
                  )}
                  {visualizationMode === 'tires' && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-2 bg-blue-500 rounded"></div>
                        <span>Cold (&lt;60°C)</span>
                      </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-2 bg-green-500 rounded"></div>
                        <span>Cool (60-80°C)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-2 bg-yellow-500 rounded"></div>
                        <span>Optimal (80-100°C)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-2 bg-orange-500 rounded"></div>
                        <span>Hot (100-120°C)</span>
                </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-2 bg-red-500 rounded"></div>
                        <span>Overheated (&gt;120°C)</span>
                      </div>
                    </>
                  )}
                  {visualizationMode === 'gforce' && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-2 bg-green-500 rounded"></div>
                        <span>Low G (&lt;1g)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-2 bg-yellow-500 rounded"></div>
                        <span>Medium G (1-2g)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-2 bg-red-500 rounded"></div>
                        <span>High G (&gt;2g)</span>
                      </div>
                    </>
                  )}
                  {visualizationMode === 'performance' && (
                    <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-2 bg-red-500 rounded"></div>
                  <span>Braking</span>
                </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-2 bg-green-500 rounded"></div>
                        <span>Fast</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-2 bg-purple-500 rounded"></div>
                        <span>Slipping</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-2 bg-green-300 rounded"></div>
                        <span>Accelerating</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-2 bg-gray-300 rounded"></div>
                  <span>Coasting</span>
                </div>
                    </>
                  )}
                  {visualizationMode === 'grip' && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-2 bg-red-500 rounded"></div>
                        <span>Low Grip (&lt;80%)</span>
              </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-2 bg-orange-500 rounded"></div>
                        <span>Medium (80-90%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-2 bg-yellow-500 rounded"></div>
                        <span>Good (90-95%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-2 bg-green-500 rounded"></div>
                        <span>High Grip (&gt;95%)</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Telemetry Summary Sidebar */}
          <div className="space-y-6">
            {/* Lap Summary */}
            <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Lap Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-300">Max Speed</span>
                  <span className="text-blue-400 font-semibold">{lapData.maxSpeed.toFixed(1)} km/h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Avg Speed</span>
                  <span className="text-blue-400 font-semibold">{lapData.avgSpeed.toFixed(1)} km/h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Max G-Force</span>
                  <span className="text-yellow-400 font-semibold">
                    {(() => {
                      const maxGForce = Math.max(...lapData.telemetryPoints.map(p => getTotalGForce(p)));
                      return isNaN(maxGForce) ? 'N/A' : `${maxGForce.toFixed(1)}g`;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Max Brake</span>
                  <span className="text-red-400 font-semibold">
                    {(() => {
                      const maxBrake = Math.max(...lapData.telemetryPoints.map(p => p.brake || 0));
                      return isNaN(maxBrake) ? 'N/A' : `${(maxBrake * 100).toFixed(0)}%`;
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* Tire Analysis */}
            {lapData.telemetryPoints.some(p => p.tyreTemperature && p.tyreTemperature.length >= 4) && (
              <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Tire Analysis</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Max Tire Temp</span>
                    <span className="text-orange-400 font-semibold">
                      {(() => {
                        const maxTemp = Math.max(...lapData.telemetryPoints.map(p => getMaxTireTemp(p)));
                        return isNaN(maxTemp) || maxTemp === 0 ? 'N/A' : `${maxTemp.toFixed(0)}°C`;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Avg Tire Temp</span>
                    <span className="text-orange-400 font-semibold">
                      {(() => {
                        const validPoints = lapData.telemetryPoints.filter(p => getAverageTireTemp(p) > 0);
                        if (validPoints.length === 0) return 'N/A';
                        const avgTemp = lapData.telemetryPoints.reduce((sum, p) => sum + getAverageTireTemp(p), 0) / validPoints.length;
                        return isNaN(avgTemp) ? 'N/A' : `${avgTemp.toFixed(0)}°C`;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Tire Compound</span>
                    <span className="text-slate-100 font-semibold">
                      {lapData.telemetryPoints[0]?.tyreCompound || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Environmental Conditions */}
            <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Conditions</h3>
              <div className="space-y-3">
                {lapData.telemetryPoints[0]?.airTemp !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">Air Temperature</span>
                    <span className="text-green-400 font-semibold">
                      {isNaN(lapData.telemetryPoints[0].airTemp) ? 'N/A' : `${lapData.telemetryPoints[0].airTemp.toFixed(0)}°C`}
                    </span>
                  </div>
                )}
                {lapData.telemetryPoints[0]?.roadTemp !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">Road Temperature</span>
                    <span className="text-green-400 font-semibold">
                      {isNaN(lapData.telemetryPoints[0].roadTemp) ? 'N/A' : `${lapData.telemetryPoints[0].roadTemp.toFixed(0)}°C`}
                    </span>
                  </div>
                )}
                {lapData.telemetryPoints[0]?.surfaceGrip !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">Track Grip</span>
                    <span className="text-green-400 font-semibold">
                      {isNaN(lapData.telemetryPoints[0].surfaceGrip) ? 'N/A' : `${(lapData.telemetryPoints[0].surfaceGrip * 100).toFixed(0)}%`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Sector Times */}
            <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Sector Times</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-300">Sector 1</span>
                  <span className="text-white font-semibold">
                    {isNaN(lapData.sectorTimes.sector1) ? 'N/A' : `${lapData.sectorTimes.sector1.toFixed(3)}s`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Sector 2</span>
                  <span className="text-white font-semibold">
                    {isNaN(lapData.sectorTimes.sector2) ? 'N/A' : `${lapData.sectorTimes.sector2.toFixed(3)}s`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Sector 3</span>
                  <span className="text-white font-semibold">
                    {isNaN(lapData.sectorTimes.sector3) ? 'N/A' : `${lapData.sectorTimes.sector3.toFixed(3)}s`}
                  </span>
                </div>
              </div>
            </div>

            {/* Car Setup Info */}
            {lapData.telemetryPoints.some(p => p.fuel !== undefined || p.turboBoost !== undefined) && (
              <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Car Setup</h3>
              <div className="space-y-3">
                  {lapData.telemetryPoints.some(p => p.fuel !== undefined) && (
                    <div className="flex justify-between">
                      <span className="text-slate-300">Starting Fuel</span>
                      <span className="text-blue-400 font-semibold">
                        {(() => {
                          const fuel = lapData.telemetryPoints.find(p => p.fuel !== undefined)?.fuel;
                          return fuel !== undefined && !isNaN(fuel) ? `${fuel.toFixed(1)}L` : 'N/A';
                        })()}
                      </span>
              </div>
                  )}
                  {lapData.telemetryPoints.some(p => p.turboBoost !== undefined && p.turboBoost > 0) && (
                    <div className="flex justify-between">
                      <span className="text-slate-300">Max Turbo Boost</span>
                      <span className="text-purple-400 font-semibold">
                        {(() => {
                          const maxTurbo = Math.max(...lapData.telemetryPoints.map(p => p.turboBoost || 0));
                          return isNaN(maxTurbo) ? 'N/A' : `${maxTurbo.toFixed(2)} bar`;
                        })()}
                      </span>
            </div>
                  )}
          </div>
        </div>
            )}
      </div>
        </div>
        </div>
    </div>
  );
} 
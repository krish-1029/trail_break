"use client";

import type { TelemetryPoint } from "@/types/telemetry";

interface TelemetryDisplayProps {
  hoveredPoint: TelemetryPoint | null;
  className?: string;
}

export default function TelemetryDisplay({ hoveredPoint, className = "" }: TelemetryDisplayProps) {
  if (!hoveredPoint) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center text-white/70">
          <div className="text-lg font-medium mb-2">Hover over track map to view telemetry data</div>
          <div className="text-sm">Move your cursor over the racing line to see detailed telemetry</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 text-white ${className}`}>
      <h4 className="text-lg font-semibold mb-3 text-white">Live Telemetry Data</h4>
      
      <div className="flex gap-4">
        {/* Left side - Data values in compact grid */}
        <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-300">Speed:</span>
            <span className="font-mono text-blue-400 font-bold">
              {hoveredPoint.speed.toFixed(1)} km/h
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-300">RPM:</span>
            <span className="font-mono text-purple-400 font-bold">
              {hoveredPoint.rpm.toLocaleString()}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-300">Throttle:</span>
            <span className="font-mono text-green-400 font-bold">
              {(hoveredPoint.throttle * 100).toFixed(0)}%
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-300">G-Force X:</span>
            <span className="font-mono text-orange-400 font-bold">
              {hoveredPoint.gForceX.toFixed(2)}g
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-300">Brake:</span>
            <span className="font-mono text-red-400 font-bold">
              {(hoveredPoint.brake * 100).toFixed(0)}%
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-300">G-Force Z:</span>
            <span className="font-mono text-orange-400 font-bold">
              {hoveredPoint.gForceZ.toFixed(2)}g
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-300">Gear:</span>
            <span className="font-mono text-yellow-400 font-bold">
              {hoveredPoint.gear}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-300">Time:</span>
            <span className="font-mono text-cyan-400 font-bold">
              {hoveredPoint.time.toFixed(2)}s
            </span>
          </div>
        </div>

        {/* Right side - Vertical pedal bars */}
        <div className="flex gap-3 items-end h-32">
          {/* Throttle Bar */}
          <div className="flex flex-col items-center h-full">
            <div className="text-xs text-slate-400 mb-1">Throttle</div>
            <div className="flex-1 w-6 bg-gray-700 rounded-full flex flex-col-reverse">
              <div 
                className="bg-green-400 rounded-full transition-all duration-200 min-h-1"
                style={{ height: `${hoveredPoint.throttle * 100}%` }}
              />
            </div>
            <div className="text-xs text-green-400 font-mono mt-1">
              {(hoveredPoint.throttle * 100).toFixed(0)}%
            </div>
          </div>
          
          {/* Brake Bar */}
          <div className="flex flex-col items-center h-full">
            <div className="text-xs text-slate-400 mb-1">Brake</div>
            <div className="flex-1 w-6 bg-gray-700 rounded-full flex flex-col-reverse">
              <div 
                className="bg-red-400 rounded-full transition-all duration-200 min-h-1"
                style={{ height: `${hoveredPoint.brake * 100}%` }}
              />
            </div>
            <div className="text-xs text-red-400 font-mono mt-1">
              {(hoveredPoint.brake * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

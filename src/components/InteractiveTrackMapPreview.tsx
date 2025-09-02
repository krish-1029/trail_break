"use client";

import { useRef, useEffect, useState } from "react";
import { api } from "@/trpc/react";
import type { TelemetryPoint } from "@/types/telemetry";

interface InteractiveTrackMapPreviewProps {
  onHover?: (point: TelemetryPoint | null) => void;
  className?: string;
}

export default function InteractiveTrackMapPreview({ onHover, className = "" }: InteractiveTrackMapPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<TelemetryPoint | null>(null);
  
  // Fetch the shortest lap from leaderboard
  const { data: featuredLaps, isLoading } = api.leaderboard.getFeaturedLaps.useQuery();
  const shortestLap = featuredLaps?.[0]; // First lap is the shortest (sorted by lap time)
  
  // Fetch full telemetry data for the shortest lap
  const { data: lapData } = api.leaderboard.getLapPublic.useQuery(
    { lapId: shortestLap?.id || "" },
    { enabled: !!shortestLap?.id }
  );

  const telemetryData = lapData?.telemetryPoints || [];

  // Draw the track map and racing line
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !telemetryData.length) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // High DPI
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Calculate bounds
    const xCoords = telemetryData.map(p => p.x);
    const zCoords = telemetryData.map(p => p.z);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minZ = Math.min(...zCoords);
    const maxZ = Math.max(...zCoords);
    
    const padding = 20;
    const xRange = Math.max(1, maxX - minX);
    const zRange = Math.max(1, maxZ - minZ);
    const scaleX = (rect.width - 2 * padding) / xRange;
    const scaleZ = (rect.height - 2 * padding) / zRange;
    const scale = Math.min(scaleX, scaleZ);
    
    const offsetX = padding + (rect.width - 2 * padding - xRange * scale) / 2;
    const offsetY = padding + (rect.height - 2 * padding - zRange * scale) / 2;

    // Draw racing line with throttle/brake color coding
    if (telemetryData.length > 1) {
      for (let i = 0; i < telemetryData.length - 1; i++) {
        const point = telemetryData[i];
        const nextPoint = telemetryData[i + 1];

        if (!point || !nextPoint) continue;

        // Scale coordinates to fit canvas
        const x1 = (point.x - minX) * scale + offsetX;
        const y1 = (point.z - minZ) * scale + offsetY;
        const x2 = (nextPoint.x - minX) * scale + offsetX;
        const y2 = (nextPoint.z - minZ) * scale + offsetY;

        // Determine color based on pedal inputs (throttle/brake view)
        let color;
        if (point.brake > 0.1) {
          // Red for braking
          const intensity = Math.min(point.brake, 1);
          color = `rgb(${255}, ${Math.floor(100 * (1 - intensity))}, ${Math.floor(100 * (1 - intensity))})`;
        } else if (point.throttle > 0.1) {
          // Green for throttle
          const intensity = Math.min(point.throttle, 1);
          color = `rgb(${Math.floor(100 * (1 - intensity))}, ${255}, ${Math.floor(100 * (1 - intensity))})`;
        } else {
          // White for coasting
          color = "rgb(200, 200, 200)";
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // Highlight hovered point
    if (hoveredPoint) {
      const x = (hoveredPoint.x - minX) * scale + offsetX;
      const y = (hoveredPoint.z - minZ) * scale + offsetY;
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
  }, [telemetryData, hoveredPoint]);

  // Handle mouse move over canvas
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!telemetryData.length) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Calculate transform (same as in draw function)
    const xCoords = telemetryData.map(p => p.x);
    const zCoords = telemetryData.map(p => p.z);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minZ = Math.min(...zCoords);
    const maxZ = Math.max(...zCoords);
    
    const padding = 20;
    const xRange = Math.max(1, maxX - minX);
    const zRange = Math.max(1, maxZ - minZ);
    const scaleX = (rect.width - 2 * padding) / xRange;
    const scaleZ = (rect.height - 2 * padding) / zRange;
    const scale = Math.min(scaleX, scaleZ);
    
    const offsetX = padding + (rect.width - 2 * padding - xRange * scale) / 2;
    const offsetY = padding + (rect.height - 2 * padding - zRange * scale) / 2;

    // Find closest telemetry point to mouse position
    let closestPoint: TelemetryPoint | null = null;
    let closestDistance = Infinity;

    telemetryData.forEach((point) => {
      const x = (point.x - minX) * scale + offsetX;
      const y = (point.z - minZ) * scale + offsetY;
      const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);

      if (distance < 20 && distance < closestDistance) {
        closestDistance = distance;
        closestPoint = point;
      }
    });

    setHoveredPoint(closestPoint);
    if (onHover) {
      onHover(closestPoint);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    if (onHover) {
      onHover(null);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-white/70">Loading track data...</div>
      </div>
    );
  }

  if (!shortestLap || !telemetryData.length) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-white/70">No lap data available</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-white mb-2">
          Fastest Lap: {shortestLap.lapTime}
        </h4>
        <div className="text-sm text-slate-300">
          {shortestLap.car} • {shortestLap.track} • {shortestLap.userDisplayName}
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        className="w-full h-64 border border-slate-600 rounded-lg cursor-crosshair bg-slate-800"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      
      {/* Legend */}
      <div className="mt-4 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 bg-green-500 rounded"></div>
          <span className="text-white/80">Throttle</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 bg-red-500 rounded"></div>
          <span className="text-white/80">Braking</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 bg-gray-300 rounded"></div>
          <span className="text-white/80">Coasting</span>
        </div>
      </div>
    </div>
  );
}


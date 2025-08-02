"use client";

import { useRef, useEffect, useState } from "react";
import type { TelemetryPoint } from "@/types/telemetry";

interface TrackMapProps {
  telemetryData: TelemetryPoint[];
  onHover?: (point: TelemetryPoint | null) => void;
  className?: string;
}

export default function TrackMap({ telemetryData, onHover, className = "" }: TrackMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw the track map and racing line
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Draw background (simplified track outline)
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw racing line with color coding (green for throttle, red for brake)
    if (telemetryData.length > 1) {
      for (let i = 0; i < telemetryData.length - 1; i++) {
        const point = telemetryData[i];
        const nextPoint = telemetryData[i + 1];

        if (!point || !nextPoint) continue;

        // Scale coordinates to fit canvas
        const x1 = (point.x / 800) * canvas.width;
        const y1 = (point.z / 600) * canvas.height;
        const x2 = (nextPoint.x / 800) * canvas.width;
        const y2 = (nextPoint.z / 600) * canvas.height;

        // Determine color based on pedal inputs
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
  }, [telemetryData]);

  // Handle mouse move over canvas
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onHover) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Find closest telemetry point to mouse position
    let closestPoint: TelemetryPoint | null = null;
    let closestDistance = Infinity;

    telemetryData.forEach((point) => {
      const x = (point.x / 800) * canvas.width;
      const y = (point.z / 600) * canvas.height;
      const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);

      if (distance < 20 && distance < closestDistance) {
        closestDistance = distance;
        closestPoint = point;
      }
    });

    onHover(closestPoint);
  };

  const handleMouseLeave = () => {
    if (onHover) {
      onHover(null);
    }
  };

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        className="w-full h-96 border border-slate-600 rounded-lg cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      
      {/* Legend */}
      <div className="mt-4 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 bg-green-500 rounded"></div>
          <span>Throttle</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 bg-red-500 rounded"></div>
          <span>Braking</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 bg-gray-300 rounded"></div>
          <span>Coasting</span>
        </div>
      </div>
    </div>
  );
} 
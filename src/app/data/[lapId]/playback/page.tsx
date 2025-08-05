'use client';

import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from "@/trpc/react";
import type { TelemetryPoint } from "@/types/telemetry";

type VisualizationMode = 'pedals' | 'tires' | 'gforce' | 'performance' | 'grip';
type ArrowMode = 'orientation' | 'trajectory' | 'both';

interface LapPlaybackPageProps {
  params: Promise<{ lapId: string }>;
}

export default function LapPlaybackPage({ params }: LapPlaybackPageProps) {
  const resolvedParams = React.use(params);
  const { data: lapData, isLoading, error } = api.lap.getById.useQuery({ lapId: resolvedParams.lapId });
  
  // Canvas and interaction state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Visualization state
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('pedals');
  const [arrowMode, setArrowMode] = useState<ArrowMode>('both');
  const [telemetryDropdownOpen, setTelemetryDropdownOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showTrail, setShowTrail] = useState(true);
  const animationRef = useRef<number | undefined>();
  const lastTimeRef = useRef<number | undefined>();
  
  // Current telemetry point for display
  const currentPoint = lapData?.telemetryPoints[currentIndex ?? 0] || null;

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !lapData?.telemetryPoints.length) return;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = timestamp - lastTimeRef.current;
      const targetFrameTime = 16.67 / playbackSpeed; // ~60fps adjusted for speed

      if (deltaTime >= targetFrameTime) {
        setCurrentIndex(prev => {
          const next = prev + 1;
          if (next >= lapData.telemetryPoints.length) {
            setIsPlaying(false);
            return 0; // Reset to start
          }
          return next;
        });
        lastTimeRef.current = timestamp;
      }

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, lapData?.telemetryPoints.length]);

  // Reset animation frame ref when stopping
  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = 0;
    }
  }, [isPlaying]);

  // Mouse/touch handlers for pan and zoom
  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setLastMousePos({ x: event.clientX, y: event.clientY });
  };

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMousePos({ x: event.clientX - rect.left, y: event.clientY - rect.top });

    if (isDragging) {
      const deltaX = event.clientX - lastMousePos.x;
      const deltaY = event.clientY - lastMousePos.y;
      setPanX(prev => prev + deltaX);
      setPanY(prev => prev + deltaY);
      setLastMousePos({ x: event.clientX, y: event.clientY });
    }
  }, [isDragging, lastMousePos]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas || !lapData) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const zoomFactor = event.deltaY < 0 ? 1.05 : 0.95;
    const newZoom = Math.max(0.1, Math.min(10, zoom * zoomFactor));
    
    if (newZoom !== zoom) {
      // Calculate world coordinates
      const xCoords = lapData.telemetryPoints.map(p => p.x);
      const zCoords = lapData.telemetryPoints.map(p => p.z);
      const minX = Math.min(...xCoords);
      const maxX = Math.max(...xCoords);
      const minZ = Math.min(...zCoords);
      const maxZ = Math.max(...zCoords);
      
      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;
      const rangeX = maxX - minX;
      const rangeZ = maxZ - minZ;
      const maxRange = Math.max(rangeX, rangeZ);
      const scale = Math.min(rect.width, rect.height) / (maxRange * 1.1);
      
      const baseOffsetX = rect.width / 2 - centerX * scale;
      const baseOffsetY = rect.height / 2 - centerZ * scale;
      
      const currentOffsetX = baseOffsetX * zoom + panX;
      const currentOffsetY = baseOffsetY * zoom + panY;
      const currentScale = scale * zoom;
      
      const worldX = (mouseX - currentOffsetX) / currentScale;
      const worldY = (mouseY - currentOffsetY) / currentScale;
      
      const newOffsetX = baseOffsetX * newZoom + panX;
      const newOffsetY = baseOffsetY * newZoom + panY;
      const newScale = scale * newZoom;
      
      const newMouseX = worldX * newScale + newOffsetX;
      const newMouseY = worldY * newScale + newOffsetY;
      
      setPanX(prev => prev + (mouseX - newMouseX));
      setPanY(prev => prev + (mouseY - newMouseY));
    }
    
    setZoom(newZoom);
  };

  const resetView = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  // Playback controls
  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const skipToStart = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const skipToEnd = () => {
    setCurrentIndex((lapData?.telemetryPoints.length || 1) - 1);
    setIsPlaying(false);
  };

  const handleScrub = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    setCurrentIndex(value);
    setIsPlaying(false);
  };

  // Handle fullscreen canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      
      if (isFullscreen) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Set CSS size
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        
        // Set actual drawing buffer size with device pixel ratio
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      } else {
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        // Set CSS size
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        
        // Set actual drawing buffer size with device pixel ratio
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      
      // Scale the context to match device pixel ratio
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      
      setZoom(1);
      setPanX(0);
      setPanY(0);
    };

    const timeoutId = setTimeout(resizeCanvas, 10);
    
    if (isFullscreen) {
      window.addEventListener('resize', resizeCanvas);
    }
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isFullscreen]);

  // Handle escape key for fullscreen exit
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
      if (event.key === ' ') {
        event.preventDefault();
        togglePlayback();
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    } else {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isFullscreen, isPlaying]);

  // Helper functions for visualization colors
  const getPedalColor = (point: TelemetryPoint): string => {
    const throttle = point.throttle || 0;
    const brake = point.brake || 0;
    
    if (brake > 0.1) {
      const intensity = Math.min(brake * 1.5, 1);
      const red = Math.floor(255 * intensity);
      const other = Math.floor(255 * (1 - intensity) * 0.9);
      return `rgb(${red}, ${other}, ${other})`;
    } else if (throttle > 0.1) {
      const intensity = Math.min(throttle * 1.5, 1);
      const green = Math.floor(255 * intensity);
      const other = Math.floor(255 * (1 - intensity) * 0.9);
      return `rgb(${other}, ${green}, ${other})`;
    } else {
      return '#f8fafc';
    }
  };

  const getTireTemperatureColor = (point: TelemetryPoint): string => {
    const maxTemp = point.tyreTemperature ? Math.max(...point.tyreTemperature) : 0;
    if (maxTemp < 60) return '#3b82f6';
    if (maxTemp < 80) return '#10b981';
    if (maxTemp < 100) return '#f59e0b';
    if (maxTemp < 120) return '#ef4444';
    return '#dc2626';
  };

  const getGForceColor = (point: TelemetryPoint): string => {
    const totalG = Math.sqrt((point.gForceX || 0) ** 2 + (point.gForceY || 0) ** 2 + (point.gForceZ || 0) ** 2);
    if (totalG < 0.5) return '#64748b';
    if (totalG < 1.0) return '#3b82f6';
    if (totalG < 1.5) return '#10b981';
    if (totalG < 2.0) return '#f59e0b';
    if (totalG < 2.5) return '#ef4444';
    return '#dc2626';
  };

  const getPerformanceColor = (point: TelemetryPoint): string => {
    const speed = point.speed || 0;
    if (speed < 50) return '#64748b';
    if (speed < 100) return '#3b82f6';
    if (speed < 150) return '#10b981';
    if (speed < 200) return '#f59e0b';
    if (speed < 250) return '#ef4444';
    return '#dc2626';
  };

  const getGripLevelColor = (point: TelemetryPoint): string => {
    const throttle = point.throttle || 0;
    const brake = point.brake || 0;
    const combinedInput = throttle + brake;
    
    if (combinedInput < 0.2) return '#64748b';
    if (combinedInput < 0.4) return '#3b82f6';
    if (combinedInput < 0.6) return '#10b981';
    if (combinedInput < 0.8) return '#f59e0b';
    return '#ef4444';
  };

  // Enhanced track map drawing with playback
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !lapData) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get CSS dimensions for calculations (not the scaled buffer size)
    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width;
    const cssHeight = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const xCoords = lapData.telemetryPoints.map(p => p.x);
    const zCoords = lapData.telemetryPoints.map(p => p.z);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minZ = Math.min(...zCoords);
    const maxZ = Math.max(...zCoords);

    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const rangeX = maxX - minX;
    const rangeZ = maxZ - minZ;
    const maxRange = Math.max(rangeX, rangeZ);
    const scale = Math.min(cssWidth, cssHeight) / (maxRange * 1.1);

    const baseOffsetX = cssWidth / 2 - centerX * scale;
    const baseOffsetY = cssHeight / 2 - centerZ * scale;
    const offsetX = baseOffsetX * zoom + panX;
    const offsetY = baseOffsetY * zoom + panY;

    // Draw racing line with color coding
    ctx.lineWidth = Math.max(2, 4 * zoom);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const maxIndex = showTrail ? currentIndex : lapData.telemetryPoints.length - 1;

    for (let i = 0; i < maxIndex; i++) {
      const point = lapData.telemetryPoints[i];
      const nextPoint = lapData.telemetryPoints[i + 1];
      if (!point || !nextPoint) continue;

      let color: string;
      switch (visualizationMode) {
        case 'pedals':
          color = getPedalColor(point);
          break;
        case 'tires':
          color = getTireTemperatureColor(point);
          break;
        case 'gforce':
          color = getGForceColor(point);
          break;
        case 'performance':
          color = getPerformanceColor(point);
          break;
        case 'grip':
          color = getGripLevelColor(point);
          break;
        default:
          color = '#3b82f6';
      }

      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(
        point.x * scale * zoom + offsetX,
        point.z * scale * zoom + offsetY
      );
      ctx.lineTo(
        nextPoint.x * scale * zoom + offsetX,
        nextPoint.z * scale * zoom + offsetY
      );
      ctx.stroke();
    }

    // Draw sector boundaries
    const totalPoints = lapData.telemetryPoints.length;
    const sector1End = Math.floor(totalPoints / 3);
    const sector2End = Math.floor((2 * totalPoints) / 3);

    const drawSectorLine = (index: number, label: string) => {
      const point = lapData.telemetryPoints[index];
      if (!point) return;

      const x = point.x * scale * zoom + offsetX;
      const y = point.z * scale * zoom + offsetY;

      ctx.setLineDash([10, 5]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 20, y - 20);
      ctx.lineTo(x + 20, y + 20);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + 25, y - 25);
    };

    drawSectorLine(sector1End, 'S1→S2');
    drawSectorLine(sector2End, 'S2→S3');

    // Draw start/finish line
    const startPoint = lapData.telemetryPoints[0];
    if (startPoint) {
      const x = startPoint.x * scale * zoom + offsetX;
      const y = startPoint.z * scale * zoom + offsetY;

      // Checkered pattern line
      ctx.lineWidth = 4;
      const segments = 8;
      const segmentLength = 40 / segments;
      
      for (let i = 0; i < segments; i++) {
        ctx.strokeStyle = i % 2 === 0 ? 'white' : 'black';
        ctx.beginPath();
        ctx.moveTo(x - 20 + i * segmentLength, y - 20);
        ctx.lineTo(x - 20 + (i + 1) * segmentLength, y + 20);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('START/FINISH', x, y - 30);
    }

    // Draw current car position
    if (currentPoint) {
      const carX = currentPoint.x * scale * zoom + offsetX;
      const carY = currentPoint.z * scale * zoom + offsetY;

      // Draw car dot
      ctx.fillStyle = "rgba(255, 255, 255, 1.0)";
      ctx.beginPath();
      ctx.arc(carX, carY, Math.max(6, 8 * zoom), 0, 2 * Math.PI);
      ctx.fill();

      // Draw direction arrows
      const arrowLength = Math.max(20, 30 * zoom);
      const arrowHeadLength = Math.max(8, 12 * zoom);

      // Yellow arrow for orientation (heading)
      if ((arrowMode === 'orientation' || arrowMode === 'both') && currentPoint.heading !== undefined && currentPoint.heading !== null && !isNaN(currentPoint.heading)) {
        const angle = (currentPoint.heading || 0) + Math.PI / 2;
        const endX = carX + Math.cos(angle) * arrowLength;
        const endY = carY + Math.sin(angle) * arrowLength;

        ctx.strokeStyle = "rgba(255, 255, 0, 1.0)";
        ctx.lineWidth = Math.max(3, 4 * zoom);
        ctx.beginPath();
        ctx.moveTo(carX, carY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        const headAngle1 = angle - Math.PI + 0.4;
        const headAngle2 = angle - Math.PI - 0.4;
        const head1X = endX + Math.cos(headAngle1) * arrowHeadLength;
        const head1Y = endY + Math.sin(headAngle1) * arrowHeadLength;
        const head2X = endX + Math.cos(headAngle2) * arrowHeadLength;
        const head2Y = endY + Math.sin(headAngle2) * arrowHeadLength;

        ctx.fillStyle = "rgba(255, 255, 0, 1.0)";
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(head1X, head1Y);
        ctx.lineTo(head2X, head2Y);
        ctx.closePath();
        ctx.fill();
      }

      // Orange arrow for movement direction (trajectory)
      if ((arrowMode === 'trajectory' || arrowMode === 'both') && currentIndex > 0) {
        const prevPoint = lapData.telemetryPoints[currentIndex - 1];
        if (prevPoint) {
          const deltaX = currentPoint.x - prevPoint.x;
          const deltaZ = currentPoint.z - prevPoint.z;
          
          if (Math.abs(deltaX) > 0.001 || Math.abs(deltaZ) > 0.001) {
            const movementAngle = Math.atan2(deltaZ, deltaX);
            const endX = carX + Math.cos(movementAngle) * arrowLength;
            const endY = carY + Math.sin(movementAngle) * arrowLength;

            ctx.strokeStyle = "rgba(255, 150, 0, 1.0)";
            ctx.lineWidth = Math.max(3, 4 * zoom);
            ctx.beginPath();
            ctx.moveTo(carX, carY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            const headAngle1 = movementAngle - Math.PI + 0.4;
            const headAngle2 = movementAngle - Math.PI - 0.4;
            const head1X = endX + Math.cos(headAngle1) * arrowHeadLength;
            const head1Y = endY + Math.sin(headAngle1) * arrowHeadLength;
            const head2X = endX + Math.cos(headAngle2) * arrowHeadLength;
            const head2Y = endY + Math.sin(headAngle2) * arrowHeadLength;

            ctx.fillStyle = "rgba(255, 150, 0, 1.0)";
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(head1X, head1Y);
            ctx.lineTo(head2X, head2Y);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      // Speed display
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${(currentPoint.speed || 0).toFixed(0)} km/h`, carX, carY - 20);
    }
  }, [lapData, zoom, panX, panY, visualizationMode, arrowMode, currentIndex, showTrail]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading lap playback...</div>
      </div>
    );
  }

  if (error || !lapData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-red-400 text-xl">Error loading lap data</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {isFullscreen ? (
        /* Fullscreen Mode */
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
          {/* Fullscreen Controls */}
          <div className="absolute top-4 left-4 z-60 flex gap-2">
            <button
              onClick={() => setIsFullscreen(false)}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-colors"
            >
              Exit Fullscreen
            </button>
            <button
              onClick={togglePlayback}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                isPlaying 
                  ? 'bg-red-600 hover:bg-red-500 text-white' 
                  : 'bg-green-600 hover:bg-green-500 text-white'
              }`}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              onClick={resetView}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
            >
              Reset View
            </button>
          </div>

          {/* Fullscreen Canvas */}
          <div className="w-full h-full relative">
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            />
          </div>

          {/* Floating Telemetry Data */}
          {currentPoint && (
            <div
              className="fixed bg-black/80 backdrop-blur-md rounded-xl p-4 text-white border border-white/20 pointer-events-none z-70 max-w-md"
              style={{
                left: `${Math.min(mousePos.x + 20, window.innerWidth - 400)}px`,
                top: `${Math.max(mousePos.y - 10, 10)}px`,
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Basic Data */}
                <div className="space-y-2">
                  <div className="text-blue-400 font-semibold text-sm">Basic Data</div>
                  <div className="space-y-1 text-xs">
                    <div>Time: <span className="text-slate-300">{(currentPoint.time || 0).toFixed(2)}s</span></div>
                    <div>Speed: <span className="text-blue-400">{(currentPoint.speed || 0).toFixed(1)} km/h</span></div>
                    <div>Throttle: <span className="text-green-400">{((currentPoint.throttle || 0) * 100).toFixed(0)}%</span></div>
                    <div>Brake: <span className="text-red-400">{((currentPoint.brake || 0) * 100).toFixed(0)}%</span></div>
                    <div>Gear: <span className="text-slate-300">{currentPoint.gear ?? 'N/A'}</span></div>
                    <div>RPM: <span className="text-yellow-400">{(currentPoint.rpm || 0).toFixed(0)}</span></div>
                  </div>
                </div>

                {/* G-Forces */}
                <div className="space-y-2">
                  <div className="text-purple-400 font-semibold text-sm">G-Forces</div>
                  <div className="space-y-1 text-xs">
                    <div>Lateral: <span className="text-slate-300">{(currentPoint.gForceX || 0).toFixed(2)}g</span></div>
                    <div>Longitudinal: <span className="text-slate-300">{(currentPoint.gForceY || 0).toFixed(2)}g</span></div>
                    <div>Vertical: <span className="text-slate-300">{(currentPoint.gForceZ || 0).toFixed(2)}g</span></div>
                    <div>Total: <span className="text-orange-400">{Math.sqrt((currentPoint.gForceX || 0) ** 2 + (currentPoint.gForceY || 0) ** 2 + (currentPoint.gForceZ || 0) ** 2).toFixed(2)}g</span></div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="space-y-2">
                  <div className="text-teal-400 font-semibold text-sm">Additional</div>
                  <div className="space-y-1 text-xs">
                    <div>Position: <span className="text-slate-300">({(currentPoint.x || 0).toFixed(1)}, {(currentPoint.z || 0).toFixed(1)})</span></div>
                    <div>Sector: <span className="text-slate-300">{(currentPoint.currentSector ?? 0) + 1}</span></div>
                    {currentPoint.tyreTemperature && (
                      <div>Max Tire Temp: <span className="text-orange-400">{Math.max(...currentPoint.tyreTemperature).toFixed(0)}°C</span></div>
                    )}
                    {currentPoint.fuel !== undefined && (
                      <div>Fuel: <span className="text-blue-400">{(currentPoint.fuel * 100).toFixed(1)}%</span></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fullscreen Playback Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-60 bg-black/60 backdrop-blur-md rounded-xl p-4 flex items-center gap-4">
            <button onClick={skipToStart} className="text-white hover:text-blue-400">⏮</button>
            <button 
              onClick={togglePlayback}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                isPlaying ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'
              } text-white`}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={skipToEnd} className="text-white hover:text-blue-400">⏭</button>
            
            <div className="mx-4 flex items-center gap-2">
              <span className="text-xs text-slate-400">Speed:</span>
              <select 
                value={playbackSpeed} 
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="bg-slate-800 text-white text-xs rounded px-2 py-1"
              >
                <option value={0.25}>0.25x</option>
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs">
              <input 
                type="checkbox" 
                checked={showTrail}
                onChange={(e) => setShowTrail(e.target.checked)}
                className="rounded"
              />
              Trail
            </label>
            
            <input
              type="range"
              min={0}
              max={(lapData?.telemetryPoints.length || 1) - 1}
              value={currentIndex}
              onChange={handleScrub}
              className="w-64"
            />
            
            <span className="text-xs text-slate-400">
              {currentIndex + 1} / {lapData?.telemetryPoints.length || 0}
            </span>
          </div>
        </div>
      ) : (
        /* Normal Mode */
        <div className="max-w-[1800px] mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <a 
                  href="/data" 
                  className="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-block transition-colors"
                >
                  ← Back to Data Dashboard
                </a>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-red-400 to-red-200 bg-clip-text text-transparent">
                  Lap Playback - {lapData.track}
                </h1>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{lapData.lapTime}s</div>
                <div className="text-slate-400">{lapData.car}</div>
              </div>
            </div>

            {/* Visualization Mode Selector */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-blue-400">Visualization Mode</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { mode: 'pedals' as VisualizationMode, label: 'Pedals', bgColor: 'bg-green-600', borderColor: 'border-green-500' },
                  { mode: 'tires' as VisualizationMode, label: 'Tires', bgColor: 'bg-orange-600', borderColor: 'border-orange-500' },
                  { mode: 'gforce' as VisualizationMode, label: 'G-Force', bgColor: 'bg-purple-600', borderColor: 'border-purple-500' },
                  { mode: 'performance' as VisualizationMode, label: 'Performance', bgColor: 'bg-blue-600', borderColor: 'border-blue-500' },
                  { mode: 'grip' as VisualizationMode, label: 'Grip', bgColor: 'bg-teal-600', borderColor: 'border-teal-500' }
                ].map(({ mode, label, bgColor, borderColor }) => (
                  <button
                    key={mode}
                    onClick={() => setVisualizationMode(mode)}
                    className={`px-3 py-1 rounded text-sm transition-colors border ${
                      visualizationMode === mode 
                        ? `${bgColor} ${borderColor} text-white` 
                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Arrow Mode Selector */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-blue-400">Arrow Display</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setArrowMode('orientation')}
                  className={`px-3 py-1 rounded text-sm transition-colors border ${
                    arrowMode === 'orientation' 
                      ? 'text-white border-yellow-500' 
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                  }`}
                  style={arrowMode === 'orientation' ? { backgroundColor: 'rgb(255, 255, 0)' } : {}}
                >
                  Orientation
                </button>
                <button
                  onClick={() => setArrowMode('trajectory')}
                  className={`px-3 py-1 rounded text-sm transition-colors border ${
                    arrowMode === 'trajectory' 
                      ? 'text-white border-orange-500' 
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                  }`}
                  style={arrowMode === 'trajectory' ? { backgroundColor: 'rgb(255, 150, 0)' } : {}}
                >
                  Trajectory
                </button>
                <button
                  onClick={() => setArrowMode('both')}
                  className={`px-3 py-1 rounded text-sm transition-colors border ${
                    arrowMode === 'both' 
                      ? 'bg-purple-600 border-purple-500 text-white' 
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Both
                </button>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-blue-400">Playback Controls</h3>
              <div className="flex flex-wrap items-center gap-4 p-4 bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl">
                <button 
                  onClick={skipToStart}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
                >
                  ⏮ Start
                </button>
                
                <button 
                  onClick={togglePlayback}
                  className={`px-4 py-2 rounded text-sm transition-colors ${
                    isPlaying 
                      ? 'bg-red-600 hover:bg-red-500 text-white' 
                      : 'bg-green-600 hover:bg-green-500 text-white'
                  }`}
                >
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                
                <button 
                  onClick={skipToEnd}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
                >
                  ⏭ End
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Speed:</span>
                  <select 
                    value={playbackSpeed} 
                    onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                    className="bg-slate-800 text-white text-sm rounded px-2 py-1"
                  >
                    <option value={0.25}>0.25x</option>
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={4}>4x</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input 
                    type="checkbox" 
                    checked={showTrail}
                    onChange={(e) => setShowTrail(e.target.checked)}
                    className="rounded"
                  />
                  Show Trail
                </label>

                <div className="flex items-center gap-2 flex-1 min-w-64">
                  <span className="text-sm text-slate-400">Position:</span>
                  <input
                    type="range"
                    min={0}
                    max={(lapData?.telemetryPoints.length || 1) - 1}
                    value={currentIndex}
                    onChange={handleScrub}
                    className="flex-1"
                  />
                  <span className="text-sm text-slate-400">
                    {currentIndex + 1} / {lapData?.telemetryPoints.length || 0}
                  </span>
                </div>

                <button
                  onClick={resetView}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
                >
                  Reset View
                </button>
                
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm transition-colors"
                >
                  Fullscreen
                </button>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full h-96 border border-slate-600 rounded-lg"
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            />
            
            <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
              Scroll: Zoom • Drag: Pan • Space: Play/Pause
            </div>
          </div>
          
          {/* Static Telemetry Data Panel */}
          <div className="mt-6 bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl overflow-hidden">
            <div 
              className="flex justify-between items-center p-6 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => setTelemetryDropdownOpen(!telemetryDropdownOpen)}
            >
              <div className="flex items-center gap-3">
                <h4 className="text-lg font-semibold text-blue-400">Live Telemetry Data</h4>
                <div className="text-xs text-slate-400">
                  {currentPoint ? (
                    <>
                      Playback Position • 
                      {arrowMode === 'orientation' && ' Orientation'}
                      {arrowMode === 'trajectory' && ' Trajectory'}
                      {arrowMode === 'both' && ' Both Arrows'}
                    </>
                  ) : (
                    'No data'
                  )}
                </div>
              </div>
              <div className={`transition-transform duration-200 ${telemetryDropdownOpen ? 'rotate-180' : ''}`}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            {telemetryDropdownOpen && (
              <div className="px-6 pb-6 border-t border-white/10">
                {currentPoint ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    {/* Basic Data */}
                    <div className="space-y-3">
                      <div className="text-blue-400 font-semibold text-sm">Basic Data</div>
                      <div className="space-y-2 text-sm">
                        <div>Time: <span className="text-slate-300">{(currentPoint.time || 0).toFixed(2)}s</span></div>
                        <div>Speed: <span className="text-blue-400">{(currentPoint.speed || 0).toFixed(1)} km/h</span></div>
                        <div>Throttle: <span className="text-green-400">{((currentPoint.throttle || 0) * 100).toFixed(0)}%</span></div>
                        <div>Brake: <span className="text-red-400">{((currentPoint.brake || 0) * 100).toFixed(0)}%</span></div>
                        <div>Gear: <span className="text-slate-300">{currentPoint.gear ?? 'N/A'}</span></div>
                        <div>RPM: <span className="text-yellow-400">{(currentPoint.rpm || 0).toFixed(0)}</span></div>
                      </div>
                    </div>

                    {/* G-Forces */}
                    <div className="space-y-3">
                      <div className="text-purple-400 font-semibold text-sm">G-Forces</div>
                      <div className="space-y-2 text-sm">
                        <div>Lateral: <span className="text-slate-300">{(currentPoint.gForceX || 0).toFixed(2)}g</span></div>
                        <div>Longitudinal: <span className="text-slate-300">{(currentPoint.gForceY || 0).toFixed(2)}g</span></div>
                        <div>Vertical: <span className="text-slate-300">{(currentPoint.gForceZ || 0).toFixed(2)}g</span></div>
                        <div>Total: <span className="text-orange-400">{Math.sqrt((currentPoint.gForceX || 0) ** 2 + (currentPoint.gForceY || 0) ** 2 + (currentPoint.gForceZ || 0) ** 2).toFixed(2)}g</span></div>
                      </div>
                    </div>

                    {/* Tire & Environment */}
                    <div className="space-y-3">
                      <div className="text-orange-400 font-semibold text-sm">Tire & Environment</div>
                      <div className="space-y-2 text-sm">
                        <div>Position: <span className="text-slate-300">({(currentPoint.x || 0).toFixed(1)}, {(currentPoint.z || 0).toFixed(1)})</span></div>
                        <div>Sector: <span className="text-slate-300">{(currentPoint.currentSector ?? 0) + 1}</span></div>
                        {currentPoint.tyreTemperature && (
                          <>
                            <div>FL Tire: <span className="text-orange-400">{(currentPoint.tyreTemperature[0] || 0).toFixed(0)}°C</span></div>
                            <div>FR Tire: <span className="text-orange-400">{(currentPoint.tyreTemperature[1] || 0).toFixed(0)}°C</span></div>
                            <div>RL Tire: <span className="text-orange-400">{(currentPoint.tyreTemperature[2] || 0).toFixed(0)}°C</span></div>
                            <div>RR Tire: <span className="text-orange-400">{(currentPoint.tyreTemperature[3] || 0).toFixed(0)}°C</span></div>
                          </>
                        )}
                        {currentPoint.fuel !== undefined && (
                          <div>Fuel Level: <span className="text-blue-400">{(currentPoint.fuel * 100).toFixed(1)}%</span></div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    No telemetry data available
                    <div className="text-xs mt-2">Use playback controls to view data</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 
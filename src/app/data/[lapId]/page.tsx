"use client";

import React from 'react';
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { api } from "@/trpc/react";
import type { TelemetryPoint } from "@/types/telemetry";

// Visualization modes for different data displays
type VisualizationMode = 'pedals' | 'tires' | 'gforce' | 'performance' | 'grip';

// Helper function to get tire temperature color
const getTireTemperatureColor = (temp: number): string => {
  if (temp < 60) return 'rgb(0, 100, 255)';     // Cold - Blue
  if (temp < 80) return 'rgb(0, 255, 100)';     // Cool - Green  
  if (temp < 100) return 'rgb(255, 255, 0)';    // Optimal - Yellow
  if (temp < 120) return 'rgb(255, 150, 0)';    // Hot - Orange
  return 'rgb(255, 0, 0)';                      // Overheated - Red
};

// Helper function to get grip level color
const getGripLevelColor = (grip: number): string => {
  if (grip < 0.8) return 'rgb(255, 100, 100)';  // Low grip - Red
  if (grip < 0.9) return 'rgb(255, 200, 100)';  // Medium grip - Orange
  if (grip < 0.95) return 'rgb(255, 255, 100)'; // Good grip - Yellow
  return 'rgb(100, 255, 100)';                  // High grip - Green
};

// Helper function to get G-force color intensity
const getGForceColor = (gForceX: number, gForceY: number, gForceZ: number): string => {
  const totalG = Math.sqrt(gForceX * gForceX + gForceY * gForceY + gForceZ * gForceZ);
  const intensity = Math.min(totalG / 3.0, 1.0); // Normalize to 3G max
  const red = Math.floor(255 * intensity);
  const green = Math.floor(255 * (1 - intensity));
  return `rgb(${red}, ${green}, 0)`;
};

// Helper function to get performance zone color
const getPerformanceColor = (point: TelemetryPoint): string => {
  const maxThrottle = point.throttle > 0.8;
  const hardBraking = point.brake > 0.6;
  const highSpeed = point.speed > 200;
  const tireSlip = point.wheelSlip && Math.max(...point.wheelSlip) > 0.1;
  
  if (hardBraking) return 'rgb(255, 0, 0)';      // Braking - Red
  if (maxThrottle && highSpeed) return 'rgb(0, 255, 0)'; // Fast - Green
  if (tireSlip) return 'rgb(255, 100, 255)';     // Slipping - Magenta
  if (maxThrottle) return 'rgb(100, 255, 100)';  // Accelerating - Light Green
  return 'rgb(200, 200, 200)';                   // Coasting - Gray
};

export default function LapAnalysisPage() {
  const params = useParams();
  const lapId = params.lapId as string;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<TelemetryPoint | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('pedals');
  const [arrowMode, setArrowMode] = useState<'orientation' | 'trajectory' | 'both'>('orientation');
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenPoint, setFrozenPoint] = useState<TelemetryPoint | null>(null);
  const [isDraggingDot, setIsDraggingDot] = useState(false);
  const [telemetryDropdownOpen, setTelemetryDropdownOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Fetch lap data using tRPC
  const { data: lapData, isLoading, error } = api.lap.getById.useQuery({
    lapId: lapId
  });

  // Add global mouse up listener to handle drag outside canvas
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging]);

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
        // Let the canvas return to its normal CSS size
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
      
      // Automatically reset view when switching modes
      setZoom(1);
      setPanX(0);
      setPanY(0);
    };

    // Small delay to ensure DOM has updated
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
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isFullscreen]);

  // Enhanced track map and racing line drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !lapData) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get CSS dimensions for calculations (not the scaled buffer size)
    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width;
    const cssHeight = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate coordinate bounds for auto-scaling
    const xCoords = lapData.telemetryPoints.map(p => p.x);
    const zCoords = lapData.telemetryPoints.map(p => p.z);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minZ = Math.min(...zCoords);
    const maxZ = Math.max(...zCoords);
    
    // Add padding around the track
    const padding = 50;
    const xRange = maxX - minX;
    const zRange = maxZ - minZ;
    
    // Calculate scale to fit track with aspect ratio preservation
    const scaleX = (cssWidth - 2 * padding) / xRange;
    const scaleZ = (cssHeight - 2 * padding) / zRange;
    const scale = Math.min(scaleX, scaleZ);
    
    // Calculate offsets to center the track with zoom and pan
    const baseOffsetX = padding + (cssWidth - 2 * padding - xRange * scale) / 2;
    const baseOffsetY = padding + (cssHeight - 2 * padding - zRange * scale) / 2;
    
    // Apply zoom and pan transformations
    const zoomedScale = scale * zoom;
    const offsetX = baseOffsetX * zoom + panX;
    const offsetY = baseOffsetY * zoom + panY;

    // Draw enhanced racing line with selected visualization mode
    if (lapData.telemetryPoints.length > 1) {
      for (let i = 0; i < lapData.telemetryPoints.length - 1; i++) {
        const point = lapData.telemetryPoints[i];
        const nextPoint = lapData.telemetryPoints[i + 1];

        if (!point || !nextPoint) continue;

        // Scale coordinates to fit canvas with zoom and pan
        const x1 = (point.x - minX) * zoomedScale + offsetX;
        const y1 = (point.z - minZ) * zoomedScale + offsetY;
        const x2 = (nextPoint.x - minX) * zoomedScale + offsetX;
        const y2 = (nextPoint.z - minZ) * zoomedScale + offsetY;

        // Determine color based on visualization mode
        let color: string;
        
        switch (visualizationMode) {
          case 'pedals':
            // Smooth pedal input visualization with fading
            const brakeIntensity = Math.max(0, Math.min(point.brake, 1));
            const throttleIntensity = Math.max(0, Math.min(point.throttle, 1));
            
            if (brakeIntensity > throttleIntensity) {
              // Braking: fade from white (coasting) to red (full brake)
              const red = 200 + Math.floor(55 * brakeIntensity);    // 200 -> 255
              const green = Math.floor(200 * (1 - brakeIntensity)); // 200 -> 0  
              const blue = Math.floor(200 * (1 - brakeIntensity));  // 200 -> 0
              color = `rgb(${red}, ${green}, ${blue})`;
            } else if (throttleIntensity > 0) {
              // Throttle: fade from white (coasting) to green (full throttle)
              const red = Math.floor(200 * (1 - throttleIntensity));   // 200 -> 0
              const green = 200 + Math.floor(55 * throttleIntensity);  // 200 -> 255
              const blue = Math.floor(200 * (1 - throttleIntensity));  // 200 -> 0
              color = `rgb(${red}, ${green}, ${blue})`;
        } else {
              // Pure coasting - light gray
              color = "rgb(200, 200, 200)";
            }
            break;
            
          case 'tires':
            // Tire temperature visualization
            if (point.tyreTemperature && point.tyreTemperature.length >= 4) {
              const avgTemp = point.tyreTemperature.reduce((a, b) => a + b, 0) / 4;
              color = getTireTemperatureColor(avgTemp);
            } else {
              color = "rgb(100, 100, 100)";
            }
            break;
            
          case 'gforce':
            // G-force visualization
            color = getGForceColor(point.gForceX, point.gForceY || 0, point.gForceZ);
            break;
            
          case 'performance':
            // Performance zone visualization
            color = getPerformanceColor(point);
            break;
            
          case 'grip':
            // Surface grip visualization
            color = getGripLevelColor(point.surfaceGrip || 1.0);
            break;
            
          default:
          color = "rgb(200, 200, 200)";
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, 4 * zoom); // Scale line width with zoom
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
    
    // Draw sector boundaries as lines cutting across the track
    if (lapData.telemetryPoints.length > 0) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      
      let lastSector = -1;
      lapData.telemetryPoints.forEach((point, index) => {
        if (point.currentSector !== lastSector && lastSector !== -1) {
          const x = (point.x - minX) * zoomedScale + offsetX;
          const y = (point.z - minZ) * zoomedScale + offsetY;
          
          // Calculate track direction at this point for perpendicular line
          let trackAngle = 0;
          if (index > 0 && index < lapData.telemetryPoints.length - 1) {
            const prevPoint = lapData.telemetryPoints[index - 1];
            const nextPoint = lapData.telemetryPoints[index + 1];
            if (prevPoint && nextPoint) {
              const deltaX = nextPoint.x - prevPoint.x;
              const deltaZ = nextPoint.z - prevPoint.z;
              trackAngle = Math.atan2(deltaZ, deltaX);
            }
          }
          
          // Draw perpendicular line across track (90° to track direction)
          const lineAngle = trackAngle + Math.PI / 2;
          const lineLength = 30 * zoom; // Scale with zoom
          const halfLength = lineLength / 2;
          
          const x1 = x - Math.cos(lineAngle) * halfLength;
          const y1 = y - Math.sin(lineAngle) * halfLength;
          const x2 = x + Math.cos(lineAngle) * halfLength;
          const y2 = y + Math.sin(lineAngle) * halfLength;
          
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
          
          // Add sector transition label
          const currentSector = point.currentSector || 0;
          const label = `S${lastSector + 1}→S${currentSector + 1}`;
          
          // Position label slightly offset from the line
          const labelOffset = 20 * zoom;
          const labelX = x + Math.cos(lineAngle) * labelOffset;
          const labelY = y + Math.sin(lineAngle) * labelOffset;
          
          // Draw label background
          const textMetrics = ctx.measureText(label);
          const padding = 4;
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(
            labelX - textMetrics.width / 2 - padding,
            labelY - 6 - padding,
            textMetrics.width + padding * 2,
            12 + padding * 2
          );
          
          // Draw label text
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, labelX, labelY);
        }
        lastSector = point.currentSector || 0;
      });
      
      ctx.setLineDash([]);
    }
    
    // Draw start/finish line
    if (lapData.telemetryPoints.length > 1) {
      const startPoint = lapData.telemetryPoints[0];
      const secondPoint = lapData.telemetryPoints[1];
      
      if (startPoint && secondPoint) {
        const startX = (startPoint.x - minX) * zoomedScale + offsetX;
        const startY = (startPoint.z - minZ) * zoomedScale + offsetY;
        
        // Calculate track direction at start for perpendicular line
        const deltaX = secondPoint.x - startPoint.x;
        const deltaZ = secondPoint.z - startPoint.z;
      const trackAngle = Math.atan2(deltaZ, deltaX);
      const lineAngle = trackAngle + Math.PI / 2;
      
      const lineLength = 40 * zoom;
      const halfLength = lineLength / 2;
      
      const x1 = startX - Math.cos(lineAngle) * halfLength;
      const y1 = startY - Math.sin(lineAngle) * halfLength;
      const x2 = startX + Math.cos(lineAngle) * halfLength;
      const y2 = startY + Math.sin(lineAngle) * halfLength;
      
      // Draw checkered pattern
      const numSegments = 8;
      const segmentLength = lineLength / numSegments;
      
      for (let i = 0; i < numSegments; i++) {
        const t1 = i / numSegments;
        const t2 = (i + 1) / numSegments;
        
        const segX1 = x1 + (x2 - x1) * t1;
        const segY1 = y1 + (y2 - y1) * t1;
        const segX2 = x1 + (x2 - x1) * t2;
        const segY2 = y1 + (y2 - y1) * t2;
        
        // Alternate black and white segments
        ctx.strokeStyle = i % 2 === 0 ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)";
        ctx.lineWidth = 6;
        ctx.setLineDash([]);
        
        ctx.beginPath();
        ctx.moveTo(segX1, segY1);
        ctx.lineTo(segX2, segY2);
        ctx.stroke();
      }
      
      // Add start/finish label
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Position label offset from the line
      const labelOffset = 25 * zoom;
      const labelX = startX + Math.cos(lineAngle) * labelOffset;
      const labelY = startY + Math.sin(lineAngle) * labelOffset;
      
      // Draw label background
      const labelText = "START/FINISH";
      const textMetrics = ctx.measureText(labelText);
      const padding = 4;
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(
        labelX - textMetrics.width / 2 - padding,
        labelY - 6 - padding,
        textMetrics.width + padding * 2,
        12 + padding * 2
      );
      
      // Draw label text
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillText(labelText, labelX, labelY);
      }
    }
    
    // Draw car position indicator when hovering or frozen
    const activePoint = isFrozen ? frozenPoint : hoveredPoint;
    if (activePoint) {
      const carX = (activePoint.x - minX) * zoomedScale + offsetX;
      const carY = (activePoint.z - minZ) * zoomedScale + offsetY;
      
      // Draw car dot
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(carX, carY, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      
      // Draw directional arrow based on selected mode
      const hasHeading = activePoint.heading !== undefined && activePoint.heading !== null && !isNaN(activePoint.heading);
      
      // Draw orientation arrow (yellow) if mode is 'orientation' or 'both' and heading data is available
      if ((arrowMode === 'orientation' || arrowMode === 'both') && hasHeading) {
        const arrowLength = 25;
        const arrowHeadLength = 10;
        
        // Calculate arrow direction (heading is in radians)
        // Convert AC heading to canvas coordinates - AC heading seems to be flipped
        const angle = (activePoint.heading || 0) + Math.PI / 2;
        
        // Arrow line
        const endX = carX + Math.cos(angle) * arrowLength;
        const endY = carY + Math.sin(angle) * arrowLength;
        
        ctx.strokeStyle = "rgba(255, 255, 0, 1.0)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(carX, carY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Arrow head
        const headAngle1 = angle - Math.PI + 0.4;
        const headAngle2 = angle - Math.PI - 0.4;
        
        const head1X = endX + Math.cos(headAngle1) * arrowHeadLength;
        const head1Y = endY + Math.sin(headAngle1) * arrowHeadLength;
        const head2X = endX + Math.cos(headAngle2) * arrowHeadLength;
        const head2Y = endY + Math.sin(headAngle2) * arrowHeadLength;
        
        ctx.fillStyle = "rgba(255, 255, 0, 1.0)";
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(head1X, head1Y);
        ctx.lineTo(head2X, head2Y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Add car speed indicator as text
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${activePoint.speed.toFixed(0)} km/h`, carX, carY - 20);
      }
      
      // Draw trajectory arrow (orange) if mode is 'trajectory' or 'both'
      if (arrowMode === 'trajectory' || arrowMode === 'both') {
        const pointIndex = lapData.telemetryPoints.indexOf(activePoint);
        if (pointIndex > 0 && pointIndex < lapData.telemetryPoints.length - 1) {
          const prevPoint = lapData.telemetryPoints[pointIndex - 1];
          const nextPoint = lapData.telemetryPoints[pointIndex + 1];
          
          if (prevPoint && nextPoint) {
            // Calculate movement direction
            const deltaX = nextPoint.x - prevPoint.x;
            const deltaZ = nextPoint.z - prevPoint.z;
            const movementAngle = Math.atan2(deltaZ, deltaX);
            
            const arrowLength = 25;
            const arrowHeadLength = 10;
            
            // Arrow line
            const endX = carX + Math.cos(movementAngle) * arrowLength;
            const endY = carY + Math.sin(movementAngle) * arrowLength;
            
            ctx.strokeStyle = "rgba(255, 150, 0, 1.0)"; // Orange for movement direction
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(carX, carY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Arrow head
            const headAngle1 = movementAngle - Math.PI + 0.4;
            const headAngle2 = movementAngle - Math.PI - 0.4;
            
            const head1X = endX + Math.cos(headAngle1) * arrowHeadLength;
            const head1Y = endY + Math.sin(headAngle1) * arrowHeadLength;
            const head2X = endX + Math.cos(headAngle2) * arrowHeadLength;
            const head2Y = endY + Math.sin(headAngle2) * arrowHeadLength;
            
            ctx.fillStyle = "rgba(255, 150, 0, 1.0)";
            ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(head1X, head1Y);
            ctx.lineTo(head2X, head2Y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        }
      }
      
      // Add car speed indicator as text
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${activePoint.speed.toFixed(0)} km/h`, carX, carY - 20);
    }
  }, [lapData, zoom, panX, panY, visualizationMode, hoveredPoint, arrowMode, isFrozen, frozenPoint, isFullscreen]);

  // Enhanced mouse move handling with freeze and drag support
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !lapData) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    setMousePos({ x: event.clientX, y: event.clientY });

    // Calculate same coordinate transformation as in drawing
    const xCoords = lapData.telemetryPoints.map(p => p.x);
    const zCoords = lapData.telemetryPoints.map(p => p.z);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minZ = Math.min(...zCoords);
    const maxZ = Math.max(...zCoords);
    
    const padding = 50;
    const xRange = maxX - minX;
    const zRange = maxZ - minZ;
    const scaleX = (canvas.width - 2 * padding) / xRange;
    const scaleZ = (canvas.height - 2 * padding) / zRange;
    const scale = Math.min(scaleX, scaleZ);
    
    const baseOffsetX = padding + (canvas.width - 2 * padding - xRange * scale) / 2;
    const baseOffsetY = padding + (canvas.height - 2 * padding - zRange * scale) / 2;
    
    const zoomedScale = scale * zoom;
    const offsetX = baseOffsetX * zoom + panX;
    const offsetY = baseOffsetY * zoom + panY;

    // Find closest telemetry point to mouse position
    let closestPoint: TelemetryPoint | null = null;
    let closestDistance = Infinity;

    lapData.telemetryPoints.forEach((point) => {
      const x = (point.x - minX) * zoomedScale + offsetX;
      const y = (point.z - minZ) * zoomedScale + offsetY;
      const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);

      if (distance < 30 && distance < closestDistance) {
        closestDistance = distance;
        closestPoint = point;
      }
    });

    // Handle freeze mode vs normal hover
    if (isFrozen) {
      // In freeze mode, only update frozen point if actively dragging
      if (isDraggingDot) {
        setFrozenPoint(closestPoint);
      }
    } else {
      // Normal hover behavior
    setHoveredPoint(closestPoint);
    }
  };

  // Enhanced drag handling
  const handleMouseDrag = (event: React.MouseEvent<HTMLCanvasElement>) => {
    handleMouseMove(event);
    
    if (isDragging && !isDraggingDot) {
      const deltaX = event.clientX - lastMousePos.x;
      const deltaY = event.clientY - lastMousePos.y;
      
      setPanX(prev => prev + deltaX);
      setPanY(prev => prev + deltaY);
      
      setLastMousePos({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isFrozen && frozenPoint) {
      // Check if clicking on the frozen dot
      const canvas = canvasRef.current;
      if (!canvas || !lapData) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Calculate dot position
      const xCoords = lapData.telemetryPoints.map(p => p.x);
      const zCoords = lapData.telemetryPoints.map(p => p.z);
      const minX = Math.min(...xCoords);
      const maxX = Math.max(...xCoords);
      const minZ = Math.min(...zCoords);
      const maxZ = Math.max(...zCoords);
      
      const padding = 50;
      const xRange = maxX - minX;
      const zRange = maxZ - minZ;
      const scaleX = (canvas.width - 2 * padding) / xRange;
      const scaleZ = (canvas.height - 2 * padding) / zRange;
      const scale = Math.min(scaleX, scaleZ);
      
      const baseOffsetX = padding + (canvas.width - 2 * padding - xRange * scale) / 2;
      const baseOffsetY = padding + (canvas.height - 2 * padding - zRange * scale) / 2;
      
      const zoomedScale = scale * zoom;
      const offsetX = baseOffsetX * zoom + panX;
      const offsetY = baseOffsetY * zoom + panY;

      const dotX = (frozenPoint.x - minX) * zoomedScale + offsetX;
      const dotY = (frozenPoint.z - minZ) * zoomedScale + offsetY;
      const distance = Math.sqrt((mouseX - dotX) ** 2 + (mouseY - dotY) ** 2);

      if (distance < 15) { // Within 15px of dot
        setIsDraggingDot(true);
        return;
      }
    }

    // Normal pan behavior
    setIsDragging(true);
    setLastMousePos({ x: event.clientX, y: event.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDraggingDot(false);
  };

  const handleMouseLeave = () => {
    if (!isFrozen) {
    setHoveredPoint(null);
    }
    setIsDragging(false);
    setIsDraggingDot(false);
  };

  // Enhanced zoom handling
  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      
    const zoomFactor = event.deltaY > 0 ? 0.95 : 1.05;
    const newZoom = Math.max(0.5, Math.min(zoom * zoomFactor, 10));
    
    // Calculate world coordinates and adjust pan to zoom towards mouse
    if (lapData) {
      const xCoords = lapData.telemetryPoints.map(p => p.x);
      const zCoords = lapData.telemetryPoints.map(p => p.z);
      const minX = Math.min(...xCoords);
      const maxX = Math.max(...xCoords);
      const minZ = Math.min(...zCoords);
      const maxZ = Math.max(...zCoords);
      
      const padding = 50;
      const xRange = maxX - minX;
      const zRange = maxZ - minZ;
      const scaleX = (canvas.width - 2 * padding) / xRange;
      const scaleZ = (canvas.height - 2 * padding) / zRange;
      const scale = Math.min(scaleX, scaleZ);
      
      const baseOffsetX = padding + (canvas.width - 2 * padding - xRange * scale) / 2;
      const baseOffsetY = padding + (canvas.height - 2 * padding - zRange * scale) / 2;
      
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

  // Helper functions for data analysis
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
              onClick={() => {
                setIsFrozen(!isFrozen);
                if (!isFrozen) {
                  setFrozenPoint(hoveredPoint || (lapData?.telemetryPoints[0] || null));
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                isFrozen 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {isFrozen ? 'Frozen' : 'Freeze Dot'}
            </button>
            <button
              onClick={resetView}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
            >
              Reset View
            </button>
            <a
              href={`/data/${lapData.id}/playback`}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-400 hover:from-green-700 hover:to-green-500 text-white rounded-lg text-sm transition-colors inline-block"
            >
              ▶ Playback
            </a>
          </div>

          {/* Fullscreen Canvas */}
          <div className="w-full h-full relative">
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              onMouseMove={handleMouseDrag}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            />
          </div>

          {/* Floating Telemetry Data */}
          {(hoveredPoint || frozenPoint) && (
            <div 
              className="fixed bg-black/80 backdrop-blur-md rounded-xl p-4 text-white border border-white/20 pointer-events-none z-70 max-w-md"
              style={{
                left: `${Math.min(mousePos.x + 20, window.innerWidth - 400)}px`,
                top: `${Math.max(mousePos.y - 10, 10)}px`,
              }}
            >
              {(() => {
                const activePoint = isFrozen ? frozenPoint : hoveredPoint;
                if (!activePoint) return null;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {/* Basic Data */}
                    <div className="space-y-2">
                      <div className="text-blue-400 font-semibold text-sm">Basic Data</div>
                      <div className="space-y-1 text-xs">
                        <div>Time: <span className="text-slate-300">{activePoint.time.toFixed(2)}s</span></div>
                        <div>Speed: <span className="text-blue-400">{activePoint.speed.toFixed(1)} km/h</span></div>
                        <div>Throttle: <span className="text-green-400">{(activePoint.throttle * 100).toFixed(0)}%</span></div>
                        <div>Brake: <span className="text-red-400">{(activePoint.brake * 100).toFixed(0)}%</span></div>
                        <div>Gear: <span className="text-white">{activePoint.gear}</span></div>
                        <div>RPM: <span className="text-white">{activePoint.rpm}</span></div>
                      </div>
                    </div>

                    {/* G-Forces */}
                    <div className="space-y-2">
                      <div className="text-yellow-400 font-semibold text-sm">G-Forces</div>
                      <div className="space-y-1 text-xs">
                        <div>Lateral: <span className="text-yellow-300">{activePoint.gForceX.toFixed(1)}g</span></div>
                        <div>Longitudinal: <span className="text-yellow-300">{activePoint.gForceZ.toFixed(1)}g</span></div>
                        {activePoint.gForceY !== undefined && (
                          <div>Vertical: <span className="text-yellow-300">{activePoint.gForceY.toFixed(1)}g</span></div>
                        )}
                        <div>Total: <span className="text-yellow-400">{getTotalGForce(activePoint).toFixed(1)}g</span></div>
                      </div>
                    </div>

                    {/* Additional Data */}
                    <div className="space-y-2">
                      <div className="text-purple-400 font-semibold text-sm">Additional</div>
                      <div className="space-y-1 text-xs">
                        <div>Sector: <span className="text-white">{(activePoint.currentSector || 0) + 1}</span></div>
                        {activePoint.fuel !== undefined && (
                          <div>Fuel: <span className="text-blue-300">{activePoint.fuel.toFixed(1)}L</span></div>
                        )}
                        {activePoint.tyreTemperature && activePoint.tyreTemperature.length >= 4 && (
                          <div>Tire Avg: <span className="text-orange-400">{getAverageTireTemp(activePoint).toFixed(0)}°C</span></div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      ) : (
        /* Normal Mode */
        <div className="max-w-[1800px] mx-auto px-6 py-8">
      {/* Header */}
        <div className="mb-8">
          <Link href="/data" className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-6">
            ← Back to Laps
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
              {/* Visualization Mode Selector */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Visualization Mode</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { mode: 'pedals' as VisualizationMode, label: 'Pedals', desc: 'Throttle/Brake', color: 'green' },
                    { mode: 'tires' as VisualizationMode, label: 'Tires', desc: 'Temperature', color: 'orange' },
                    { mode: 'gforce' as VisualizationMode, label: 'G-Force', desc: 'Acceleration', color: 'purple' },
                    { mode: 'performance' as VisualizationMode, label: 'Performance', desc: 'Zones', color: 'blue' },
                    { mode: 'grip' as VisualizationMode, label: 'Grip', desc: 'Surface', color: 'teal' }
                  ].map(({ mode, label, desc, color }) => (
                    <button
                      key={mode}
                      onClick={() => setVisualizationMode(mode)}
                      className={`px-4 py-2 rounded-lg transition-all ${
                        visualizationMode === mode
                          ? (() => {
                              switch(color) {
                                case 'green': return 'bg-green-600 text-white border-green-500';
                                case 'orange': return 'bg-orange-600 text-white border-orange-500';
                                case 'purple': return 'bg-purple-600 text-white border-purple-500';
                                case 'blue': return 'bg-blue-600 text-white border-blue-500';
                                case 'teal': return 'bg-teal-600 text-white border-teal-500';
                                default: return 'bg-blue-600 text-white';
                              }
                            })()
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-transparent'
                      }`}
                    >
                      <div className="font-semibold">{label}</div>
                      <div className="text-xs">{desc}</div>
                    </button>
                  ))}
          </div>
        </div>

              {/* Arrow Mode Selector */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Car Direction Arrow</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { mode: 'orientation' as const, label: 'Orientation', desc: 'Where car points', color: 'yellow' },
                    { mode: 'trajectory' as const, label: 'Trajectory', desc: 'Where car moves', color: 'orange' },
                    { mode: 'both' as const, label: 'Both', desc: 'Show both arrows', color: 'purple' }
                  ].map(({ mode, label, desc, color }) => (
                  <button
                      key={mode}
                      onClick={() => setArrowMode(mode)}
                      className={`px-4 py-2 rounded-lg transition-all border-2 ${
                        arrowMode === mode
                          ? (() => {
                              switch(color) {
                                case 'yellow': return 'text-black';
                                case 'orange': return 'text-white';
                                case 'purple': return 'bg-purple-600 text-white border-purple-500';
                                default: return 'bg-blue-600 text-white border-blue-500';
                              }
                            })()
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border-transparent'
                      }`}
                      style={arrowMode === mode ? (() => {
                        switch(color) {
                          case 'yellow': return { backgroundColor: 'rgb(255, 255, 0)', borderColor: 'rgb(255, 255, 0)' };
                          case 'orange': return { backgroundColor: 'rgb(255, 150, 0)', borderColor: 'rgb(255, 150, 0)' };
                          default: return {};
                        }
                      })() : {}}
                    >
                      <div className="font-semibold">{label}</div>
                      <div className="text-xs">{desc}</div>
                      <div className="text-xs text-slate-400">
                        {color === 'yellow' && 'Yellow arrow'}{color === 'orange' && 'Orange arrow'}{color === 'purple' && 'Both arrows'}
                      </div>
                  </button>
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Track Map</h3>
                  <div className="flex gap-2">
                  <button
                      onClick={() => {
                        setIsFrozen(!isFrozen);
                        if (!isFrozen) {
                          // Set frozen point to hovered point or start line if no hover
                          setFrozenPoint(hoveredPoint || (lapData?.telemetryPoints[0] || null));
                        }
                      }}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        isFrozen 
                          ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                    >
                      {isFrozen ? 'Frozen' : 'Freeze Dot'}
                  </button>
                  <button
                      onClick={resetView}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
                  >
                      Reset View
                  </button>
                  <button
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        isFullscreen 
                          ? 'bg-purple-600 hover:bg-purple-500 text-white' 
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                  >
                      {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  </button>
                  <a
                      href={`/data/${lapData.id}/playback`}
                      className="px-3 py-1 bg-gradient-to-r from-green-600 to-green-400 hover:from-green-700 hover:to-green-500 text-white rounded text-sm transition-colors inline-block"
                  >
                      ▶ Playback
                  </a>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="w-full h-96 border border-slate-600 rounded-lg"
                  onMouseMove={handleMouseDrag}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  onWheel={handleWheel}
                  style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                />
                
                {/* Instructions */}
                <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                  Scroll: Zoom • Drag: Pan • {isFrozen ? 'Click & Drag Dot' : 'Hover: Car Position'}
                </div>
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
                      {(hoveredPoint || frozenPoint) ? (
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
                    {(hoveredPoint || frozenPoint) ? (
                      (() => {
                        const activePoint = isFrozen ? frozenPoint : hoveredPoint;
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
      )}
    </div>
  );
} 
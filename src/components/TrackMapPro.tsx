"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TelemetryPoint } from "@/types/telemetry";

export type VisualizationMode = 'pedals' | 'tires' | 'gforce' | 'performance' | 'grip';
export type ArrowMode = 'orientation' | 'trajectory' | 'both';

interface TrackMapProProps {
  telemetryPoints: TelemetryPoint[];
  className?: string;
  showControls?: boolean;
  defaultVisualizationMode?: VisualizationMode;
  defaultArrowMode?: ArrowMode;
  onActivePointChange?: (point: TelemetryPoint | null) => void;
  onStateChange?: (state: { isFrozen: boolean; arrowMode: ArrowMode; visualizationMode: VisualizationMode }) => void;
}

const getTireTemperatureColor = (temp: number): string => {
  if (temp < 60) return 'rgb(0, 100, 255)';
  if (temp < 80) return 'rgb(0, 255, 100)';
  if (temp < 100) return 'rgb(255, 255, 0)';
  if (temp < 120) return 'rgb(255, 150, 0)';
  return 'rgb(255, 0, 0)';
};

const getGripLevelColor = (grip: number): string => {
  if (grip < 0.8) return 'rgb(255, 100, 100)';
  if (grip < 0.9) return 'rgb(255, 200, 100)';
  if (grip < 0.95) return 'rgb(255, 255, 100)';
  return 'rgb(100, 255, 100)';
};

const getGForceColor = (gForceX: number, gForceY: number, gForceZ: number): string => {
  const totalG = Math.sqrt(gForceX * gForceX + gForceY * gForceY + gForceZ * gForceZ);
  const intensity = Math.min(totalG / 3.0, 1.0);
  const red = Math.floor(255 * intensity);
  const green = Math.floor(255 * (1 - intensity));
  return `rgb(${red}, ${green}, 0)`;
};

export default function TrackMapPro({
  telemetryPoints,
  className = "",
  showControls = true,
  defaultVisualizationMode = 'pedals',
  defaultArrowMode = 'orientation',
  onActivePointChange,
  onStateChange,
}: TrackMapProProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Map state
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>(defaultVisualizationMode);
  const [arrowMode, setArrowMode] = useState<ArrowMode>(defaultArrowMode);
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenPoint, setFrozenPoint] = useState<TelemetryPoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<TelemetryPoint | null>(null);
  const [isDraggingDot, setIsDraggingDot] = useState(false);

  // Pan/zoom
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Derived active point
  const activePoint = useMemo(() => (isFrozen ? frozenPoint : hoveredPoint), [isFrozen, frozenPoint, hoveredPoint]);

  // Notify parent when active point changes
  useEffect(() => {
    if (onActivePointChange) onActivePointChange(activePoint ?? null);
  }, [activePoint, onActivePointChange]);

  // Avoid effect re-run loops from inline callback identity changes
  const onStateChangeRef = useRef<TrackMapProProps["onStateChange"]>(undefined);
  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);
  useEffect(() => {
    onStateChangeRef.current?.({ isFrozen, arrowMode, visualizationMode });
  }, [isFrozen, arrowMode, visualizationMode]);

  // Resize observer to re-render on container size change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      render();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and size
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    // Background
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!telemetryPoints || telemetryPoints.length === 0) return;

    // Bounds
    const xCoords = telemetryPoints.map(p => p.x);
    const zCoords = telemetryPoints.map(p => p.z);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minZ = Math.min(...zCoords);
    const maxZ = Math.max(...zCoords);
    const padding = 50;
    const xRange = Math.max(1, maxX - minX);
    const zRange = Math.max(1, maxZ - minZ);
    const scaleX = (canvas.width - 2 * padding) / xRange;
    const scaleZ = (canvas.height - 2 * padding) / zRange;
    const scale = Math.min(scaleX, scaleZ);

    // Centering with zoom/pan
    const baseOffsetX = padding + (canvas.width - 2 * padding - xRange * scale) / 2;
    const baseOffsetY = padding + (canvas.height - 2 * padding - zRange * scale) / 2;
    const zoomedScale = scale * zoom;
    const offsetX = baseOffsetX * zoom + panX;
    const offsetY = baseOffsetY * zoom + panY;

    // Draw polyline with mode coloring
    if (telemetryPoints.length > 1) {
      for (let i = 0; i < telemetryPoints.length - 1; i++) {
        const point = telemetryPoints[i];
        const nextPoint = telemetryPoints[i + 1];
        if (!point || !nextPoint) continue;

        const x1 = (point.x - minX) * zoomedScale + offsetX;
        const y1 = (point.z - minZ) * zoomedScale + offsetY;
        const x2 = (nextPoint.x - minX) * zoomedScale + offsetX;
        const y2 = (nextPoint.z - minZ) * zoomedScale + offsetY;

        let color = "rgb(200, 200, 200)";
        switch (visualizationMode) {
          case 'pedals': {
            const brakeIntensity = Math.max(0, Math.min(point.brake, 1));
            const throttleIntensity = Math.max(0, Math.min(point.throttle, 1));
            if (brakeIntensity > throttleIntensity) {
              const red = 200 + Math.floor(55 * brakeIntensity);
              const green = Math.floor(200 * (1 - brakeIntensity));
              const blue = Math.floor(200 * (1 - brakeIntensity));
              color = `rgb(${red}, ${green}, ${blue})`;
            } else if (throttleIntensity > 0) {
              const red = Math.floor(200 * (1 - throttleIntensity));
              const green = 200 + Math.floor(55 * throttleIntensity);
              const blue = Math.floor(200 * (1 - throttleIntensity));
              color = `rgb(${red}, ${green}, ${blue})`;
            } else {
              color = "rgb(200, 200, 200)";
            }
            break;
          }
          case 'tires': {
            if (point.tyreTemperature && point.tyreTemperature.length >= 4) {
              const avgTemp = point.tyreTemperature.reduce((a: number, b: number) => a + b, 0) / 4;
              color = getTireTemperatureColor(avgTemp);
            } else {
              color = "rgb(100, 100, 100)";
            }
            break;
          }
          case 'gforce': {
            color = getGForceColor(point.gForceX, point.gForceY || 0, point.gForceZ);
            break;
          }
          case 'performance': {
            const maxThrottle = point.throttle > 0.8;
            const hardBraking = point.brake > 0.6;
            const highSpeed = point.speed > 200;
            const tireSlip = point.wheelSlip && Math.max(...point.wheelSlip) > 0.1;
            if (hardBraking) color = 'rgb(255, 0, 0)';
            else if (maxThrottle && highSpeed) color = 'rgb(0, 255, 0)';
            else if (tireSlip) color = 'rgb(255, 100, 255)';
            else if (maxThrottle) color = 'rgb(100, 255, 100)';
            else color = 'rgb(200, 200, 200)';
            break;
          }
          case 'grip': {
            color = getGripLevelColor(point.surfaceGrip || 1.0);
            break;
          }
          default: {
            color = 'rgb(200, 200, 200)';
          }
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, 4 * zoom);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // Sector boundaries
    if (telemetryPoints.length > 0) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";

      let lastSector = -1;
      telemetryPoints.forEach((point, index) => {
        if (point.currentSector !== lastSector && lastSector !== -1) {
          const x = (point.x - minX) * zoomedScale + offsetX;
          const y = (point.z - minZ) * zoomedScale + offsetY;

          let trackAngle = 0;
          if (index > 0 && index < telemetryPoints.length - 1) {
            const prevPoint = telemetryPoints[index - 1];
            const nextPoint = telemetryPoints[index + 1];
            if (prevPoint && nextPoint) {
              const deltaX = nextPoint.x - prevPoint.x;
              const deltaZ = nextPoint.z - prevPoint.z;
              trackAngle = Math.atan2(deltaZ, deltaX);
            }
          }

          const lineAngle = trackAngle + Math.PI / 2;
          const lineLength = 30 * zoom;
          const halfLength = lineLength / 2;

          const x1 = x - Math.cos(lineAngle) * halfLength;
          const y1 = y - Math.sin(lineAngle) * halfLength;
          const x2 = x + Math.cos(lineAngle) * halfLength;
          const y2 = y + Math.sin(lineAngle) * halfLength;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          const currentSector = point.currentSector || 0;
          const label = `S${lastSector + 1}→S${currentSector + 1}`;
          const labelOffset = 20 * zoom;
          const labelX = x + Math.cos(lineAngle) * labelOffset;
          const labelY = y + Math.sin(lineAngle) * labelOffset;

          const textMetrics = ctx.measureText(label);
          const pad = 4;
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(labelX - textMetrics.width / 2 - pad, labelY - 6 - pad, textMetrics.width + pad * 2, 12 + pad * 2);

          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, labelX, labelY);
        }
        lastSector = point.currentSector || 0;
      });

      ctx.setLineDash([]);
    }

    // Start/finish line
    if (telemetryPoints.length > 1) {
      const startPoint = telemetryPoints[0];
      const secondPoint = telemetryPoints[1];
      if (startPoint && secondPoint) {
        const startX = (startPoint.x - minX) * zoomedScale + offsetX;
        const startY = (startPoint.z - minZ) * zoomedScale + offsetY;
        const deltaX = secondPoint.x - startPoint.x;
        const deltaZ = secondPoint.z - startPoint.z;
        const trackAngle = Math.atan2(deltaZ, deltaX);
        const lineAngle = trackAngle + Math.PI / 2;
        const lineLength = 40 * zoom;
        const halfLength = lineLength / 2;
        const sx1 = startX - Math.cos(lineAngle) * halfLength;
        const sy1 = startY - Math.sin(lineAngle) * halfLength;
        const sx2 = startX + Math.cos(lineAngle) * halfLength;
        const sy2 = startY + Math.sin(lineAngle) * halfLength;

        const numSegments = 8;
        for (let i = 0; i < numSegments; i++) {
          const t1 = i / numSegments;
          const t2 = (i + 1) / numSegments;
          const segX1 = sx1 + (sx2 - sx1) * t1;
          const segY1 = sy1 + (sy2 - sy1) * t1;
          const segX2 = sx1 + (sx2 - sx1) * t2;
          const segY2 = sy1 + (sy2 - sy1) * t2;
          ctx.strokeStyle = i % 2 === 0 ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)";
          ctx.lineWidth = 6;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(segX1, segY1);
          ctx.lineTo(segX2, segY2);
          ctx.stroke();
        }

        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const labelText = "START/FINISH";
        const labelOffset = 25 * zoom;
        const labelX = startX + Math.cos(lineAngle) * labelOffset;
        const labelY = startY + Math.sin(lineAngle) * labelOffset;
        const textMetrics = ctx.measureText(labelText);
        const pad = 4;
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(labelX - textMetrics.width / 2 - pad, labelY - 6 - pad, textMetrics.width + pad * 2, 12 + pad * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillText(labelText, labelX, labelY);
      }
    }

    // Car indicator and arrows
    if (activePoint) {
      const carX = (activePoint.x - minX) * zoomedScale + offsetX;
      const carY = (activePoint.z - minZ) * zoomedScale + offsetY;

      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(carX, carY, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      const hasHeading = activePoint.heading !== undefined && activePoint.heading !== null && !isNaN(activePoint.heading);

      if ((arrowMode === 'orientation' || arrowMode === 'both') && hasHeading) {
        const arrowLength = 25;
        const arrowHeadLength = 10;
        const angle = (activePoint.heading || 0) + Math.PI / 2;
        const endX = carX + Math.cos(angle) * arrowLength;
        const endY = carY + Math.sin(angle) * arrowLength;
        ctx.strokeStyle = "rgba(255, 255, 0, 1.0)";
        ctx.lineWidth = 4;
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
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(head1X, head1Y);
        ctx.lineTo(head2X, head2Y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${activePoint.speed.toFixed(0)} km/h`, carX, carY - 20);
      }

      if (arrowMode === 'trajectory' || arrowMode === 'both') {
        const idx = telemetryPoints.indexOf(activePoint);
        if (idx > 0 && idx < telemetryPoints.length - 1) {
          const prevPoint = telemetryPoints[idx - 1]!;
          const nextPoint = telemetryPoints[idx + 1]!;
          const deltaX = (nextPoint?.x ?? prevPoint.x) - prevPoint.x;
          const deltaZ = (nextPoint?.z ?? prevPoint.z) - prevPoint.z;
          const movementAngle = Math.atan2(deltaZ, deltaX);
          const arrowLength = 25;
          const arrowHeadLength = 10;
          const endX = carX + Math.cos(movementAngle) * arrowLength;
          const endY = carY + Math.sin(movementAngle) * arrowLength;
          ctx.strokeStyle = "rgba(255, 150, 0, 1.0)";
          ctx.lineWidth = 4;
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

      // Speed label (kept even if only trajectory arrow is shown)
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${activePoint.speed.toFixed(0)} km/h`, carX, carY - 20);
    }
  }, [telemetryPoints, zoom, panX, panY, visualizationMode, activePoint, arrowMode]);

  // Main render effect
  useEffect(() => {
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telemetryPoints, zoom, panX, panY, visualizationMode, activePoint, arrowMode]);

  // Interaction handlers
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || telemetryPoints.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Compute transform
    const xCoords = telemetryPoints.map(p => p.x);
    const zCoords = telemetryPoints.map(p => p.z);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minZ = Math.min(...zCoords);
    const maxZ = Math.max(...zCoords);
    const padding = 50;
    const xRange = Math.max(1, maxX - minX);
    const zRange = Math.max(1, maxZ - minZ);
    const scaleX = (canvas.width - 2 * padding) / xRange;
    const scaleZ = (canvas.height - 2 * padding) / zRange;
    const scale = Math.min(scaleX, scaleZ);
    const baseOffsetX = padding + (canvas.width - 2 * padding - xRange * scale) / 2;
    const baseOffsetY = padding + (canvas.height - 2 * padding - zRange * scale) / 2;
    const zoomedScale = scale * zoom;
    const offsetX = baseOffsetX * zoom + panX;
    const offsetY = baseOffsetY * zoom + panY;

    // Find closest point
    let closestPoint: TelemetryPoint | null = null;
    let closestDistance = Infinity;

    telemetryPoints.forEach((point) => {
      const x = (point.x - minX) * zoomedScale + offsetX;
      const y = (point.z - minZ) * zoomedScale + offsetY;
      const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
      if (distance < 30 && distance < closestDistance) {
        closestDistance = distance;
        closestPoint = point;
      }
    });

    if (isFrozen) {
      if (isDraggingDot) setFrozenPoint(closestPoint);
    } else {
      setHoveredPoint(closestPoint);
    }
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isFrozen && frozenPoint) {
      const canvas = canvasRef.current;
      if (!canvas || telemetryPoints.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const xCoords = telemetryPoints.map(p => p.x);
      const zCoords = telemetryPoints.map(p => p.z);
      const minX = Math.min(...xCoords);
      const maxX = Math.max(...xCoords);
      const minZ = Math.min(...zCoords);
      const maxZ = Math.max(...zCoords);
      const padding = 50;
      const xRange = Math.max(1, maxX - minX);
      const zRange = Math.max(1, maxZ - minZ);
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
      if (distance < 15) {
        setIsDraggingDot(true);
        return;
      }
    }
    setIsDragging(true);
    setLastMousePos({ x: event.clientX, y: event.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDraggingDot(false);
  };

  const handleMouseLeave = () => {
    if (!isFrozen) setHoveredPoint(null);
    setIsDragging(false);
    setIsDraggingDot(false);
  };

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

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || telemetryPoints.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const zoomFactor = event.deltaY > 0 ? 0.95 : 1.05;
    const newZoom = Math.max(0.5, Math.min(zoom * zoomFactor, 10));

    const xCoords = telemetryPoints.map(p => p.x);
    const zCoords = telemetryPoints.map(p => p.z);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minZ = Math.min(...zCoords);
    const maxZ = Math.max(...zCoords);
    const padding = 50;
    const xRange = Math.max(1, maxX - minX);
    const zRange = Math.max(1, maxZ - minZ);
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
    setZoom(newZoom);
  };

  const resetView = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  return (
    <div className={className}>
      {showControls && (
        <>
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
                      case 'yellow': return { backgroundColor: 'rgb(255, 255, 0)', borderColor: 'rgb(255, 255, 0)' } as React.CSSProperties;
                      case 'orange': return { backgroundColor: 'rgb(255, 150, 0)', borderColor: 'rgb(255, 150, 0)' } as React.CSSProperties;
                      default: return {} as React.CSSProperties;
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

          <div className="mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Track Map</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsFrozen(!isFrozen);
                    if (!isFrozen) setFrozenPoint(hoveredPoint || (telemetryPoints[0] || null));
                  }}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    isFrozen ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
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
              </div>
            </div>
          </div>
        </>
      )}

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-96 border border-slate-600 rounded-lg"
          onMouseMove={handleMouseDrag}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          style={{ cursor: isDragging ? 'grabbing' as const : 'grab' as const }}
        />
        <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          Scroll: Zoom • Drag: Pan • {isFrozen ? 'Click & Drag Dot' : 'Hover: Car Position'}
        </div>
      </div>
    </div>
  );
} 
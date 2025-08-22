"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useMemo } from "react";

// Track Map Preview Component
function TrackMapPreview() {
  const [dotPosition, setDotPosition] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Simple track shape (oval-like)
  const trackPoints = useMemo(() => [
    { x: 0.2, y: 0.5 }, { x: 0.25, y: 0.3 }, { x: 0.4, y: 0.2 }, { x: 0.6, y: 0.2 },
    { x: 0.75, y: 0.3 }, { x: 0.8, y: 0.5 }, { x: 0.75, y: 0.7 }, { x: 0.6, y: 0.8 },
    { x: 0.4, y: 0.8 }, { x: 0.25, y: 0.7 }
  ], []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotPosition(prev => (prev + 0.8) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const width = rect.width;
    const height = rect.height;
    
    // Draw track line with color gradient based on position
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    for (let i = 0; i < trackPoints.length; i++) {
      const currentPoint = trackPoints[i]!;
      const nextPoint = trackPoints[(i + 1) % trackPoints.length]!;
      
      const progress = (i / trackPoints.length) * 100;
      const distanceFromDot = Math.abs(progress - dotPosition);
      const normalizedDistance = Math.min(distanceFromDot, 100 - distanceFromDot) / 20;
      
      // Color based on proximity to dot (simulate speed/brake zones)
      if (normalizedDistance < 1) {
        ctx.strokeStyle = `rgba(239, 68, 68, ${1 - normalizedDistance})`;
      } else if (normalizedDistance < 2) {
        ctx.strokeStyle = `rgba(251, 191, 36, ${1 - (normalizedDistance - 1)})`;
      } else {
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
      }
      
      ctx.beginPath();
      ctx.moveTo(currentPoint.x * width, currentPoint.y * height);
      ctx.lineTo(nextPoint.x * width, nextPoint.y * height);
      ctx.stroke();
    }
    
    // Draw moving dot
    const dotIndex = Math.floor((dotPosition / 100) * trackPoints.length);
    const nextIndex = (dotIndex + 1) % trackPoints.length;
    const t = ((dotPosition / 100) * trackPoints.length) % 1;
    
    const currentPoint = trackPoints[dotIndex]!;
    const nextPoint = trackPoints[nextIndex]!;
    
    const dotX = currentPoint.x + (nextPoint.x - currentPoint.x) * t;
    const dotY = currentPoint.y + (nextPoint.y - currentPoint.y) * t;
    
    // Draw dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(dotX * width, dotY * height, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw arrow
    const angle = Math.atan2(nextPoint.y - currentPoint.y, nextPoint.x - currentPoint.x);
    ctx.save();
    ctx.translate(dotX * width, dotY * height);
    ctx.rotate(angle);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(2, -4);
    ctx.moveTo(8, 0);
    ctx.lineTo(2, 4);
    ctx.stroke();
    ctx.restore();
    
  }, [dotPosition, trackPoints]);

  return (
    <canvas 
      ref={canvasRef}
      className="w-full h-full rounded-xl"
      style={{ background: 'transparent' }}
    />
  );
}

// Performance Chart Preview Component
function PerformanceChartPreview() {
  const [time, setTime] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(prev => prev + 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const width = rect.width;
    const height = rect.height;
    const padding = 20;
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i * (height - padding * 2)) / 5;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // Draw speed line
    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < width - padding * 2; x += 2) {
      const t = (time + x * 0.02) % (Math.PI * 4);
      const speed = Math.sin(t) * 0.3 + 0.5;
      const y = height - padding - speed * (height - padding * 2);
      if (x === 0) ctx.moveTo(padding + x, y);
      else ctx.lineTo(padding + x, y);
    }
    ctx.stroke();
    
    // Draw throttle line
    ctx.strokeStyle = '#34D399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < width - padding * 2; x += 2) {
      const t = (time + x * 0.02) % (Math.PI * 4);
      const throttle = Math.max(0, Math.sin(t + 0.2)) * 0.8;
      const y = height - padding - throttle * (height - padding * 2);
      if (x === 0) ctx.moveTo(padding + x, y);
      else ctx.lineTo(padding + x, y);
    }
    ctx.stroke();
    
    // Draw brake line
    ctx.strokeStyle = '#F87171';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < width - padding * 2; x += 2) {
      const t = (time + x * 0.02) % (Math.PI * 4);
      const brake = Math.sin(t * 2) < -0.7 ? Math.random() * 0.6 + 0.2 : 0;
      const y = height - padding - brake * (height - padding * 2);
      if (x === 0) ctx.moveTo(padding + x, y);
      else ctx.lineTo(padding + x, y);
    }
    ctx.stroke();
    
    // Draw labels
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px monospace';
    ctx.fillText('Speed', padding + 5, padding + 15);
    ctx.fillStyle = '#34D399';
    ctx.fillText('Throttle', padding + 5, padding + 30);
    ctx.fillStyle = '#F87171';
    ctx.fillText('Brake', padding + 5, padding + 45);
    
  }, [time]);

  return (
    <canvas 
      ref={canvasRef}
      className="w-full h-full rounded-xl"
      style={{ background: 'transparent' }}
    />
  );
}

// Telemetry Data Preview Component
function TelemetryDataPreview() {
  const [currentData, setCurrentData] = useState({
    speed: 0,
    throttle: 0,
    brake: 0,
    gear: 1,
    rpm: 2000,
    tireTemp: 85
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const time = Date.now() / 1000;
      
      // Simulate lap data with realistic patterns
      const lapProgress = (time * 0.3) % 1;
      const speedPattern = Math.sin(lapProgress * Math.PI * 6) * 0.3 + 0.7;
      const brakeZone = Math.sin(lapProgress * Math.PI * 8) < -0.5 ? 1 : 0;
      
      setCurrentData({
        speed: Math.round(speedPattern * 180 + 40),
        throttle: brakeZone ? 0 : Math.round(speedPattern * 100),
        brake: brakeZone ? Math.round(Math.random() * 80 + 20) : 0,
        gear: Math.min(6, Math.max(1, Math.round(speedPattern * 5 + 1))),
        rpm: Math.round((speedPattern * 6000 + 2000) * (brakeZone ? 0.7 : 1)),
        tireTemp: Math.round(85 + Math.sin(time * 2) * 15)
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full p-4 text-white">
      <div className="grid grid-cols-2 gap-4 h-full text-sm">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-300">Speed:</span>
            <span className="font-mono text-blue-400">{currentData.speed} km/h</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Throttle:</span>
            <span className="font-mono text-green-400">{currentData.throttle}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Brake:</span>
            <span className="font-mono text-red-400">{currentData.brake}%</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-300">Gear:</span>
            <span className="font-mono text-yellow-400">{currentData.gear}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">RPM:</span>
            <span className="font-mono text-purple-400">{currentData.rpm.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Tire Temp:</span>
            <span className="font-mono text-orange-400">{currentData.tireTemp}°C</span>
          </div>
        </div>
        
        {/* Visual bars */}
        <div className="col-span-2 space-y-2">
          <div>
            <div className="text-xs text-slate-400 mb-1">Throttle</div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-400 h-2 rounded-full transition-all duration-100"
                style={{ width: `${currentData.throttle}%` }}
              />
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Brake</div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-red-400 h-2 rounded-full transition-all duration-100"
                style={{ width: `${currentData.brake}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [showArrow, setShowArrow] = useState(true);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videosLoaded, setVideosLoaded] = useState(false);
  
  const videos = useMemo(() => ["/gt_vid.mp4", "/f1_vid.mp4"], []);

  // Preload videos to prevent glitches
  useEffect(() => {
    const preloadVideos = async () => {
      const loadPromises = videos.map(src => {
        return new Promise((resolve, reject) => {
          const video = document.createElement('video');
          video.src = src;
          video.preload = 'metadata';
          video.onloadedmetadata = () => resolve(src);
          video.onerror = () => reject(new Error(`Failed to load ${src}`));
        });
      });

      try {
        await Promise.all(loadPromises);
        setVideosLoaded(true);
      } catch (error) {
        console.error('Failed to preload videos:', error);
        setVideosLoaded(true); // Continue anyway
      }
    };

    preloadVideos();
  }, [videos]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      // Hide arrow when user scrolls down more than 50px, show when at top
      setShowArrow(scrollPosition < 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVideoEnd = () => {
      // Switch to the next video
      setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % videos.length);
    };

    const handleVideoError = () => {
      console.error('Video error occurred');
      // Try to reload the current video
      setTimeout(() => {
        if (video.src) {
          video.load();
          video.play().catch(console.error);
        }
      }, 1000);
    };

    video.addEventListener('ended', handleVideoEnd);
    video.addEventListener('error', handleVideoError);
    return () => {
      video.removeEventListener('ended', handleVideoEnd);
      video.removeEventListener('error', handleVideoError);
    };
  }, [videos.length]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videosLoaded) return;

    // Only change video if src is different
    const newSrc = videos[currentVideoIndex]!;
    if (video.src.endsWith(newSrc)) return;

    // Load and play the new video
    video.src = newSrc;
    video.load();
    
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error('Video play failed:', error);
        // Retry after a short delay
        setTimeout(() => {
          video.play().catch(console.error);
        }, 500);
      });
    }
  }, [currentVideoIndex, videos, videosLoaded]);
  return (
    <main className="min-h-screen text-white">
      <div className="max-w-[1800px] mx-auto px-6 py-0">
        {/* Hero Section */}
                 <section className="relative overflow-hidden min-h-screen flex flex-col items-center justify-between text-center pt-16 md:pt-20 lg:pt-24 pb-0 isolate">
          <div className="fixed inset-0 z-0 pointer-events-none h-screen w-screen">
            <video 
              ref={videoRef}
              className="w-full h-full object-cover" 
              autoPlay 
              muted 
              playsInline 
              preload="auto" 
              aria-hidden="true"
            />
          </div>
          
          {/* Main content - positioned at top */}
          <div className="relative z-10 flex-shrink-0">
            <h1 className="text-8xl md:text-9xl font-bold tracking-tight mb-4 cursor-pointer group" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)' }}>
             <span className={`inline-block transition-colors duration-500 ease-in-out text-white ${currentVideoIndex === 0 ? 'group-hover:text-red-500' : 'group-hover:text-blue-500'}`}>Trail</span>{" "}
             <span className={`inline-block transition-colors duration-500 ease-in-out ${currentVideoIndex === 0 ? 'text-red-500 group-hover:text-white' : 'text-blue-500 group-hover:text-white'}`}>Break</span>
           </h1>
           
           {/* Modern divider line */}
           <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent mx-auto mb-4 opacity-70"></div>
           
           <div className="text-white text-xl mb-8 font-medium" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>Professional Sim-Racing Telemetry Analysis</div>
           {/* <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-8 py-6 max-w-4xl mx-auto">
             <p className="text-2xl text-white leading-relaxed font-medium">
               Analyze your sim racing telemetry data to improve lap times and consistency. 
               Visualize your racing line, analyze your inputs, and find those precious tenths.
             </p>
           </div> */}
          </div>
          
          {/* Buttons - positioned at bottom */}
          <div className="relative z-10 flex-shrink-0">
           <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <Link
               href="/data"
               className="group relative flex items-center justify-center w-40 py-3 text-lg font-medium text-white bg-black/30 border border-red-500/40 rounded-lg backdrop-blur-md hover:bg-black/40 hover:border-red-500/60 hover:shadow-lg hover:shadow-red-500/20 transition-all duration-300 overflow-hidden"
             >
               <span className="relative z-10">Dashboard</span>
               <div className="absolute inset-0 bg-gradient-to-r from-red-500/25 to-red-400/15 opacity-100 transition-opacity duration-300"></div>
               <div className="absolute inset-0 bg-gradient-to-r from-red-500/30 to-red-400/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
             </Link>
             <Link
               href="/leaderboard"
               className="group relative flex items-center justify-center w-40 py-3 text-lg font-medium text-white bg-black/30 border border-yellow-500/40 rounded-lg backdrop-blur-md hover:bg-black/40 hover:border-yellow-500/60 hover:shadow-lg hover:shadow-yellow-500/20 transition-all duration-300 overflow-hidden"
             >
               <span className="relative z-10">Leaderboard</span>
               <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/25 to-yellow-400/15 opacity-100 transition-opacity duration-300"></div>
               <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/30 to-yellow-400/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
             </Link>
             <Link
               href="/how-it-works"
               className="group relative flex items-center justify-center w-40 py-3 text-lg font-medium text-white bg-black/30 border border-white/20 rounded-lg backdrop-blur-md hover:bg-black/40 hover:border-white/30 hover:shadow-lg hover:shadow-white/10 transition-all duration-300 overflow-hidden"
             >
               <span className="relative z-10">How It Works</span>
               <div className="absolute inset-0 bg-gradient-to-r from-white/15 to-white/8 opacity-100 transition-opacity duration-300"></div>
               <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
             </Link>
           </div>
           
           {/* Scroll down arrow */}
           <div className={`flex justify-center mt-5 transition-opacity duration-500 ${showArrow ? 'opacity-100' : 'opacity-0'}`}>
             <div className="animate-bounce">
               <svg className="w-6 h-6 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                 <path d="M12 2L12 20M12 20L5 13M12 20L19 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
               </svg>
             </div>
           </div>
          </div>
        </section>
      </div>

      {/* Opaque content container that starts below the hero */}
      <div className="relative z-[6] w-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 rounded-t-3xl">
        <div className="max-w-6xl mx-auto px-6 py-20">
          
          {/* Section Header */}
          <div className="text-center mb-24">
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-red-400 to-red-200 bg-clip-text text-transparent">
              Comprehensive Analysis Tools
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Everything you need to analyze your performance and find those precious tenths
            </p>
          </div>

          {/* Feature 1 - Interactive Track Map */}
          <div className="mb-32">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-green-500/20 border border-green-500/40 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold text-white">Interactive Track Map</h3>
                </div>
                <p className="text-lg text-slate-300 leading-relaxed">
                  Visualize your racing line with multiple data overlays. See speed, G-forces, pedal inputs, and tire temperatures mapped directly onto the track with real-time position tracking.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-slate-300">Color-coded racing line visualization</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-slate-300">Real-time position tracking</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-slate-300">Multiple data overlay modes</span>
                  </div>
                </div>
              </div>
              <div className="lg:w-1/2">
                <div className="bg-black/40 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                  <div className="h-64 bg-gradient-to-br from-green-500/20 to-green-400/10 rounded-xl relative overflow-hidden">
                    <TrackMapPreview />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 - Telemetry Data */}
          <div className="mb-32">
            <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
              <div className="lg:w-1/2 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-500/20 border border-blue-500/40 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold text-white">60Hz Telemetry Data</h3>
                </div>
                <p className="text-lg text-slate-300 leading-relaxed">
                  Comprehensive data capture at 60Hz including tire temperatures, G-forces, fuel levels, and car state information directly from Assetto Corsa with precision timing.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-slate-300">Tire temperature analysis</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-slate-300">3-axis G-force tracking</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-slate-300">High-frequency data capture</span>
                  </div>
                </div>
              </div>
                             <div className="lg:w-1/2">
                 <div className="bg-black/40 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                   <div className="h-64 bg-gradient-to-br from-blue-500/20 to-blue-400/10 rounded-xl relative overflow-hidden">
                     <TelemetryDataPreview />
                   </div>
                 </div>
               </div>
            </div>
          </div>

          {/* Feature 3 - Performance Analysis */}
          <div className="mb-32">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-purple-500/20 border border-purple-500/40 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold text-white">Performance Analysis</h3>
                </div>
                <p className="text-lg text-slate-300 leading-relaxed">
                  Detailed sector analysis, lap comparison tools, and performance metrics to help you understand where time can be gained and consistency can be improved.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span className="text-slate-300">Sector time breakdowns</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span className="text-slate-300">Speed and consistency metrics</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span className="text-slate-300">Lap comparison tools</span>
                  </div>
                </div>
              </div>
                             <div className="lg:w-1/2">
                 <div className="bg-black/40 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                   <div className="h-64 bg-gradient-to-br from-purple-500/20 to-purple-400/10 rounded-xl relative overflow-hidden">
                     <PerformanceChartPreview />
                   </div>
                 </div>
               </div>
            </div>
          </div>

          {/* Getting Started Section */}
          <div className="bg-black/30 border border-white/10 backdrop-blur-sm rounded-3xl p-12 text-center">
            <h2 className="text-4xl font-bold mb-6 text-white">Ready to Improve Your Lap Times?</h2>
            <p className="text-xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Start analyzing your telemetry data today. Connect your Assetto Corsa installation and begin capturing detailed performance data.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/20 border border-green-500/40 rounded-2xl mx-auto flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl font-bold text-green-400">1</span>
                </div>
                <h4 className="text-xl font-semibold text-white">Download Client</h4>
                <p className="text-slate-300">Install the Windows telemetry client and connect to your system</p>
              </div>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-500/20 border border-blue-500/40 rounded-2xl mx-auto flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl font-bold text-blue-400">2</span>
                </div>
                <h4 className="text-xl font-semibold text-white">Run Assetto Corsa</h4>
                <p className="text-slate-300">Start a session with UDP telemetry enabled for data capture</p>
              </div>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-purple-500/20 border border-purple-500/40 rounded-2xl mx-auto flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl font-bold text-purple-400">3</span>
                </div>
                <h4 className="text-xl font-semibold text-white">Analyze Data</h4>
                <p className="text-slate-300">View your laps, find improvements, and optimize your performance</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 text-slate-300">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>All Assetto Corsa tracks supported</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Real-time data capture</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span>Professional analysis tools</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 
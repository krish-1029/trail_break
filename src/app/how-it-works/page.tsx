"use client";

import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute -top-24 -left-32 h-72 w-72 rounded-full bg-red-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-32 h-72 w-72 rounded-full bg-red-300/10 blur-3xl" />
        <div className="max-w-[1200px] mx-auto px-6 py-16 relative">
          <div className="mb-6">
            <Link href="/landing" className="inline-flex items-center text-white/70 hover:text-red-400 transition-colors">
              <span className="mr-2">←</span> Back to Home
            </Link>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-4">
            <span className="bg-gradient-to-r from-white via-red-200 to-red-400 bg-clip-text text-transparent">How Trail Break Works</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-3xl mb-6">
            A concise walkthrough of how the Windows C# client captures Assetto Corsa telemetry, sends it to the web app, and how we turn that data into interactive racing visuals.
          </p>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-green-400" /> 60Hz Telemetry
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-blue-400" /> UDP + Shared Memory
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-yellow-400" /> tRPC to Next.js
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-purple-400" /> Canvas Visuals
            </span>
          </div>
        </div>
      </section>

      {/* Content with Sticky TOC */}
      <section className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-8">
          {/* TOC (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-semibold text-white mb-3">On this page</div>
              <nav className="space-y-2 text-sm">
                <a href="#overview" className="block text-slate-300 hover:text-white transition-colors">1. Overview</a>
                <a href="#architecture" className="block text-slate-300 hover:text-white transition-colors">2. Architecture</a>
                <a href="#processing" className="block text-slate-300 hover:text-white transition-colors">3. Processing (60Hz)</a>
                <a href="#laps" className="block text-slate-300 hover:text-white transition-colors">4. Lap Lifecycle</a>
                <a href="#api" className="block text-slate-300 hover:text-white transition-colors">5. Send & Store</a>
                <a href="#visualization" className="block text-slate-300 hover:text-white transition-colors">6. Racing Line Visualization</a>
                <a href="#skills" className="block text-slate-300 hover:text-white transition-colors">7. What This Demonstrates</a>
                <a href="#cta" className="block text-slate-300 hover:text-white transition-colors">Get Started</a>
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <div className="space-y-10">
            {/* 1. Overview */}
            <section id="overview" className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm text-slate-400 mb-1">Section 1</div>
              <h2 className="text-2xl font-semibold mb-3">Overview</h2>
              <p className="text-slate-300">
                The Windows client connects to Assetto Corsa via the Remote Telemetry UDP port and through shared memory. We sample at 60Hz, collect
                frame-by-frame data for a full lap, and post completed laps to the Trail Break web app where they’re stored and visualized.
              </p>
            </section>

            {/* 2. Architecture */}
            <section id="architecture" className="rounded-2xl border border-white/10 bg-white/5">
              <div className="border-b border-white/10 p-6">
                <div className="text-sm text-slate-400 mb-1">Section 2</div>
                <h2 className="text-2xl font-semibold">Architecture</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6 p-6">
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-lg font-semibold mb-2">Capture</h3>
                  <ul className="list-disc pl-5 space-y-2 text-slate-300">
                    <li>
                      <span className="font-semibold">UDP Remote Telemetry (9996)</span>: live frames with speed, pedals, G-forces, gear, lap time, lap count, and approximate position.
                    </li>
                    <li>
                      <span className="font-semibold">Shared Memory</span> (<code>acpmf_static</code>, <code>acpmf_physics</code>, <code>acpmf_graphics</code>): precise car, track, physics (tyre temps, loads), and session context (sector index, grip, pit status).
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-lg font-semibold mb-2">Flow</h3>
                  <ol className="list-decimal pl-5 space-y-2 text-slate-300">
                    <li>Handshake and subscribe to UDP updates</li>
                    <li>Read shared memory for richer physics/graphics</li>
                    <li>Combine into a normalized <code>TelemetryPoint</code></li>
                    <li>Detect completed laps and package <code>LapData</code></li>
                    <li>Send to Next.js via tRPC for storage and visualization</li>
                  </ol>
                </div>
              </div>
            </section>

            {/* 3. Processing */}
            <section id="processing" className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm text-slate-400 mb-1">Section 3</div>
              <h2 className="text-2xl font-semibold mb-3">Processing (60Hz)</h2>
              <p className="text-slate-300 mb-4">Frames are sampled at 60Hz and merged with shared memory when available.</p>
              <details className="rounded-lg border border-white/10 bg-black/30 p-4 text-slate-200">
                <summary className="cursor-pointer select-none font-medium">Show example TelemetryPoint</summary>
                <pre className="mt-3 text-sm overflow-x-auto">
{`var point = new TelemetryPoint {
  time, x, z, speed, throttle, brake, steering,
  gForceX, gForceZ, gear, rpm,
  // Physics & graphics enrichments
  gForceY, fuel, heading, pitch, roll,
  tyreTemperature, wheelLoad, wheelSlip, suspensionTravel,
  absActive, tcActive, isInPit, drs, turboBoost,
  airTemp, roadTemp, surfaceGrip,
  normalizedPosition, currentSector, tyreCompound, raceFlag
};`}
                </pre>
              </details>
            </section>

            {/* 4. Lap Lifecycle */}
            <section id="laps" className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm text-slate-400 mb-1">Section 4</div>
              <h2 className="text-2xl font-semibold mb-3">Lap Lifecycle</h2>
              <p className="text-slate-300 mb-4">
                When the lap count increments and enough points exist, we mark a lap as complete, compute a human-readable time, and estimate sector splits.
              </p>
              <details className="rounded-lg border border-white/10 bg-black/30 p-4 text-slate-200">
                <summary className="cursor-pointer select-none font-medium">Show example LapData</summary>
                <pre className="mt-3 text-sm overflow-x-auto">
{`var lap = new LapData {
  lapTime, car, track, conditions: "Dry",
  telemetryPoints: currentLap.ToList(),
  sectorTimes: { sector1, sector2, sector3 }
};`}
                </pre>
              </details>
            </section>

            {/* 5. Send & Store */}
            <section id="api" className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm text-slate-400 mb-1">Section 5</div>
              <h2 className="text-2xl font-semibold mb-3">Send & Store</h2>
              <p className="text-slate-300 mb-4">
                Completed laps are posted to the Next.js app via a typed tRPC endpoint. The server authenticates the user, stores lap metadata and
                telemetry in Firebase, and exposes it in your dashboard and the public leaderboard.
              </p>
              <pre className="bg-black/30 border border-white/10 rounded-lg p-4 text-sm overflow-x-auto text-slate-200">
{`POST /api/trpc/lap.create
{
  json: LapData
}`}
              </pre>
            </section>

            {/* 6. Racing Line Visualization */}
            <section id="visualization" className="rounded-2xl border border-white/10 bg-white/5">
              <div className="border-b border-white/10 p-6">
                <div className="text-sm text-slate-400 mb-1">Section 6</div>
                <h2 className="text-2xl font-semibold">From Data to Racing Line</h2>
                <p className="text-slate-300 mt-2">
                  How telemetry becomes an interactive track map with colors, arrows, sectors, tooltips, and smooth interactions.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-6 p-6">
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-lg font-semibold mb-2">1) Normalize & Scale</h3>
                  <p className="text-slate-300">Compute <code>min/max</code> of x/z to normalize. Scale by the dominant axis so the track fits neatly; add padding and center.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-lg font-semibold mb-2">2) Polyline Rendering</h3>
                  <p className="text-slate-300">Draw short segments between consecutive points. Optional smoothing reduces noise but preserves quick transitions.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-lg font-semibold mb-2">3) Color Mapping</h3>
                  <ul className="list-disc pl-5 text-slate-300 space-y-1">
                    <li><span className="font-semibold">Speed</span>: cool → hot gradient by velocity.</li>
                    <li><span className="font-semibold">Pedals</span>: green (throttle) / red (brake) blends for mixed inputs.</li>
                    <li><span className="font-semibold">G‑Force</span>: hue by magnitude/direction.</li>
                    <li><span className="font-semibold">Grip/Performance</span>: traction and performance zones.</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-lg font-semibold mb-2">4) Arrows & Orientation</h3>
                  <p className="text-slate-300">Orientation from physics (heading) and trajectory from point-to-point vector. Toggle either or both to study steering vs. path.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-lg font-semibold mb-2">5) Sectors & Overlays</h3>
                  <p className="text-slate-300">Dashed cross-track lines at sector boundaries from session data, with labels. Optional overlays for temps, flags, and pedal states.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-lg font-semibold mb-2">6) Interactions</h3>
                  <p className="text-slate-300">Zoom (wheel), pan (drag). Hover highlights nearest telemetry point; freeze pins a point to compare against hover.</p>
                </div>
              </div>
              <div className="px-6 pb-6 grid md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm text-slate-400">Performance</div>
                  <div className="text-white font-semibold">Batched segments, adaptive line width, minimal redraw</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm text-slate-400">Clarity</div>
                  <div className="text-white font-semibold">Readable scales, contrast, consistent spacing</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm text-slate-400">Robustness</div>
                  <div className="text-white font-semibold">Graceful fallbacks when sensors/points are missing</div>
                </div>
              </div>
            </section>

            {/* 7. Skills */}
            <section id="skills" className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm text-slate-400 mb-1">Section 7</div>
              <h2 className="text-2xl font-semibold mb-3">What this demonstrates</h2>
              <ul className="list-disc pl-5 space-y-2 text-slate-300">
                <li><span className="font-semibold">Low-level systems integration</span>: Memory‑mapped I/O and UDP binary parsing</li>
                <li><span className="font-semibold">Real‑time data processing</span>: 60Hz sampling and efficient buffering</li>
                <li><span className="font-semibold">Client‑server architecture</span>: Windows client → Next.js + tRPC + Prisma + Firebase</li>
                <li><span className="font-semibold">Data visualization</span>: Interactive canvases with performant rendering</li>
              </ul>
            </section>

            {/* CTA */}
            <section id="cta" className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-bold">See it in action</h3>
                  <p className="text-slate-300">Explore the public leaderboard or sign up to analyze your own laps.</p>
                </div>
                <div className="flex gap-3">
                  <Link href="/leaderboard" className="px-5 py-3 rounded-lg bg-gradient-to-r from-yellow-600 to-yellow-400 hover:from-yellow-700 hover:to-yellow-500 text-white font-semibold transition-colors">
                    Leaderboard
                  </Link>
                  <Link href="/auth/signin?mode=signup" className="px-5 py-3 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold transition-colors">
                    Sign Up
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
} 
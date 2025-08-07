import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <div className="max-w-[1800px] mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-7xl font-bold tracking-tight mb-8 cursor-pointer group">
            <span className="inline-block transition-colors duration-500 ease-in-out text-white group-hover:text-red-500">Trail</span>{" "}
            <span className="inline-block transition-colors duration-500 ease-in-out text-red-500 group-hover:text-white">Break</span>
          </h1>
          <div className="text-slate-400 text-xl mb-8">Professional Sim-Racing Telemetry Analysis</div>
          <p className="text-2xl text-slate-300 max-w-4xl mx-auto leading-relaxed mb-12">
            Analyze your sim racing telemetry data to improve lap times and consistency. 
            Visualize your racing line, analyze your inputs, and find those precious tenths.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              href="/data"
              className="flex items-center justify-center px-12 py-4 text-xl font-semibold text-white bg-gradient-to-r from-red-600 to-red-400 rounded-xl hover:from-red-700 hover:to-red-500 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              View Your Laps
            </Link>
            <Link
              href="/leaderboard"
              className="flex items-center justify-center px-12 py-4 text-xl font-semibold text-white bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-xl hover:from-yellow-700 hover:to-yellow-500 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Leaderboard
            </Link>
            <Link
              href="/how-it-works"
              className="flex items-center justify-center px-12 py-4 text-xl font-semibold text-white bg-white/5 border border-white/20 rounded-xl hover:bg-white/10 transition-all duration-200 backdrop-blur-sm"
            >
              How It Works
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-red-400 to-red-200 bg-clip-text text-transparent">
            Comprehensive Analysis Tools
          </h2>
          <p className="text-xl text-slate-400 text-center mb-16 max-w-3xl mx-auto">
            Everything you need to analyze your performance and find those precious tenths
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Interactive Track Map */}
            <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-8 hover:bg-white/10 transition-all duration-200">
              <div className="w-12 h-12 bg-green-500 rounded-lg mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Interactive Track Map</h3>
              <p className="text-slate-400 mb-4">
                Visualize your racing line with multiple data overlays. See speed, G-forces, pedal inputs, and tire temperatures mapped directly onto the track.
              </p>
              <div className="text-sm text-green-400">✓ Color-coded racing line</div>
              <div className="text-sm text-green-400">✓ Real-time position tracking</div>
            </div>

            {/* Telemetry Analysis */}
            <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-8 hover:bg-white/10 transition-all duration-200">
              <div className="w-12 h-12 bg-blue-500 rounded-lg mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">60Hz Telemetry Data</h3>
              <p className="text-slate-400 mb-4">
                Comprehensive data capture at 60Hz including tire temperatures, G-forces, fuel levels, and car state information directly from Assetto Corsa.
              </p>
              <div className="text-sm text-blue-400">✓ Tire temperature analysis</div>
              <div className="text-sm text-blue-400">✓ 3-axis G-force tracking</div>
            </div>

            {/* Performance Insights */}
            <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-8 hover:bg-white/10 transition-all duration-200">
              <div className="w-12 h-12 bg-purple-500 rounded-lg mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Performance Analysis</h3>
              <p className="text-slate-400 mb-4">
                Detailed sector analysis, lap comparison tools, and performance metrics to help you understand where time can be gained.
              </p>
              <div className="text-sm text-purple-400">✓ Sector time breakdowns</div>
              <div className="text-sm text-purple-400">✓ Speed and consistency metrics</div>
            </div>
          </div>
        </div>

        {/* Getting Started Section */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Improve Your Lap Times?</h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Start analyzing your telemetry data today. Connect your Assetto Corsa installation and begin capturing detailed performance data.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="w-8 h-8 bg-green-500 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold">1</div>
              <h4 className="font-semibold mb-2">Download Client</h4>
              <p className="text-sm text-slate-400">Install the Windows telemetry client</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold">2</div>
              <h4 className="font-semibold mb-2">Run Assetto Corsa</h4>
              <p className="text-sm text-slate-400">Start a session with UDP enabled</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-purple-500 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold">3</div>
              <h4 className="font-semibold mb-2">Analyze Data</h4>
              <p className="text-sm text-slate-400">View your laps and find improvements</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Supports all Assetto Corsa tracks</span>
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>Real-time data capture</span>
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            <span>Professional analysis tools</span>
          </div>
        </div>
      </div>
    </main>
  );
} 
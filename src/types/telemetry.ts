export interface TelemetryPoint {
  // Basic telemetry (existing)
  time: number;
  x: number;
  z: number;
  speed: number;
  throttle: number;
  brake: number;
  steering: number;
  gForceX: number;
  gForceZ: number;
  gear: number;
  rpm: number;
  
  // Enhanced physics data
  gForceY?: number;           // Vertical G-force
  clutch?: number;            // Clutch pedal
  fuel?: number;              // Current fuel level
  heading?: number;           // Car heading (radians)
  pitch?: number;             // Car pitch (radians)
  roll?: number;              // Car roll (radians)
  
  // Tire data (per wheel: FL, FR, RL, RR)
  tyrePressure?: number[];     // Tire pressures [4]
  tyreTemperature?: number[];  // Tire core temperatures [4]
  tyreWear?: number[];         // Tire wear levels [4]
  tyreDirtyLevel?: number[];   // Tire dirt levels [4]
  wheelLoad?: number[];        // Wheel loads [4]
  wheelSlip?: number[];        // Wheel slip values [4]
  suspensionTravel?: number[]; // Suspension travel [4]
  
  // Car state
  absActive?: boolean;          // ABS engaged
  tcActive?: boolean;           // Traction control engaged
  isInPit?: boolean;            // In pit lane
  drs?: number;                 // DRS status
  turboBoost?: number;          // Turbo boost pressure
  numberOfTyresOut?: number;    // Tires off track
  
  // Environmental
  airTemp?: number;             // Air temperature
  roadTemp?: number;            // Road temperature
  surfaceGrip?: number;         // Track grip level
  
  // Session info
  normalizedPosition?: number;  // Position on track (0-1)
  currentSector?: number;       // Current sector (0-2)
  tyreCompound?: string;        // Tire compound name
  penaltyTime?: number;         // Penalty time
  raceFlag?: number;            // Race flag status
  
  // Advanced data
  carDamage?: number[];         // Damage levels [5]
  kersCharge?: number;          // KERS charge level
  rideHeight?: number[];        // Front/rear ride height [2]
}

// New chunked telemetry structure for comprehensive data
export interface TelemetryChunk {
  id: string;
  lapId: string;
  userId: string; // Associate chunks with users
  chunkIndex: number;
  startTime: number;
  endTime: number;
  points: TelemetryPoint[];
  createdAt: Date;
}

export interface LapData {
  id: string;
  lapTime: string;
  date: string;
  car: string;
  track: string;
  conditions: string;
  avgSpeed: number;
  maxSpeed: number;
  telemetryPoints: TelemetryPoint[]; // For backward compatibility - will be populated from chunks
  totalDataPoints: number; // Total number of high-res data points
  chunkCount: number; // Number of telemetry chunks
  createdAt: Date; // When the lap was created
  sectorTimes: {
    sector1: number;
    sector2: number;
    sector3: number;
  };
}

export interface Session {
  id: string;
  userId: string;
  date: string;
  track: string;
  car: string;
  conditions: string;
  laps: LapData[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackInfo {
  id: string;
  name: string;
  country: string;
  length: number; // in meters
  sectors: number;
  coordinates: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
} 
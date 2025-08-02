using System;
using System.Net;
using System.Net.Sockets;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.IO;
using System.IO.MemoryMappedFiles;
using System.Runtime.InteropServices;

namespace AssettoCorsaTelemetry
{
    // Assetto Corsa Shared Memory structures for comprehensive telemetry
    [StructLayout(LayoutKind.Sequential, Pack = 4, CharSet = CharSet.Unicode)]
    public struct SPageFilePhysics
    {
        public int packetId;
        public float gas;
        public float brake;
        public float fuel;
        public int gear;
        public int rpms;
        public float steerAngle;
        public float speedKmh;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 3)]
        public float[] velocity;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 3)]
        public float[] accG;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 4)]
        public float[] wheelSlip;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 4)]
        public float[] wheelLoad;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 4)]
        public float[] wheelsPressure;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 4)]
        public float[] wheelAngularSpeed;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 4)]
        public float[] tyreWear;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 4)]
        public float[] tyreDirtyLevel;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 4)]
        public float[] tyreCoreTemperature;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 4)]
        public float[] camberRAD;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 4)]
        public float[] suspensionTravel;
        public float drs;
        public float tc;
        public float heading;
        public float pitch;
        public float roll;
        public float cgHeight;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 5)]
        public float[] carDamage;
        public int numberOfTyresOut;
        public int pitLimiterOn;
        public float abs;
        public float kersCharge;
        public float kersInput;
        public int autoShifterOn;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 2)]
        public float[] rideHeight;
        public float turboBoost;
        public float ballast;
        public float airDensity;
    }

    [StructLayout(LayoutKind.Sequential, Pack = 4, CharSet = CharSet.Unicode)]
    public struct SPageFileGraphic
    {
        public int packetId;
        public int status;
        public int session;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 15)]
        public string currentTime;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 15)]
        public string lastTime;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 15)]
        public string bestTime;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 15)]
        public string split;
        public int completedLaps;
        public int position;
        public int iCurrentTime;
        public int iLastTime;
        public int iBestTime;
        public float sessionTimeLeft;
        public float distanceTraveled;
        public int isInPit;
        public int currentSectorIndex;
        public int lastSectorTime;
        public int numberOfLaps;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 33)]
        public string tyreCompound;
        public float replayTimeMultiplier;
        public float normalizedCarPosition;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 3)]
        public float[] carCoordinates;
        public float penaltyTime;
        public int flag;
        public int idealLineOn;
        public int isInPitLane;
        public float surfaceGrip;
    }

    // Assetto Corsa Shared Memory structures for static information
    [StructLayout(LayoutKind.Sequential, Pack = 4, CharSet = CharSet.Unicode)]
    public struct SPageFileStatic
    {
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 15)]
        public string smVersion;

        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 15)]
        public string acVersion;

        // session static info
        public int numberOfSessions;
        public int numCars;

        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 33)]
        public string carModel;

        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 33)]
        public string track;

        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 33)]
        public string playerName;

        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 33)]
        public string playerSurname;

        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 33)]
        public string playerNick;

        public int sectorCount;

        // car static info
        public float maxTorque;
        public float maxPower;
        public int maxRpm;
        public float maxFuel;

        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 4)]
        public float[] suspensionMaxTravel;

        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 4)]
        public float[] tyreRadius;

        public float maxTurboBoost;
        public float airTemp;
        public float roadTemp;
        public bool penaltiesEnabled;
        public float aidFuelRate;
        public float aidTireRate;
        public float aidMechanicalDamage;
        public bool aidAllowTyreBlankets;
        public float aidStability;
        public bool aidAutoClutch;
        public bool aidAutoBlip;
    }

    // Assetto Corsa UDP packet structure
    public struct RTCarInfo
    {
        public char identifier;          // 'a'
        public int size;                // Size of the packet
        public float speed_Kmh;         // Speed in km/h
        public float speed_Mph;         // Speed in mph
        public float speed_Ms;          // Speed in m/s
        public byte isAbsEnabled;       // ABS enabled
        public byte isAbsInAction;      // ABS in action
        public byte isTcInAction;       // TC in action
        public byte isTcEnabled;        // TC enabled
        public byte isInPit;           // In pit
        public byte isEngineLimiterOn; // Engine limiter on
        public float accG_vertical;    // Vertical G-force
        public float accG_horizontal;  // Horizontal G-force
        public float accG_frontal;     // Frontal G-force
        public int lapTime;            // Lap time in milliseconds
        public int lastLap;            // Last lap time in milliseconds
        public int bestLap;            // Best lap time in milliseconds
        public int lapCount;           // Lap count
        public float gas;              // Gas/throttle pedal (0.0-1.0)
        public float brake;            // Brake pedal (0.0-1.0)
        public float clutch;           // Clutch pedal (0.0-1.0)
        public float engineRPM;        // Engine RPM
        public float steer;            // Steering (-1.0 to 1.0)
        public int gear;               // Current gear
        public float cgHeight;         // Center of gravity height
        public float[] wheelAngularSpeed; // Wheel angular speeds [4]
        public float[] slipAngle;      // Slip angles [4]
        public float[] slipAngle_ContactPatch; // Contact patch slip angles [4]
        public float[] slipRatio;      // Slip ratios [4]
        public float[] tyreSlip;       // Tyre slip [4]
        public float[] ndSlip;         // Normalized slip [4]
        public float[] load;           // Load [4]
        public float[] Dy;             // Dy [4]
        public float[] Mz;             // Mz [4]
        public float[] tyreDirtyLevel; // Tyre dirty level [4]
        public float[] camberRAD;      // Camber in radians [4]
        public float[] tyreRadius;     // Tyre radius [4]
        public float[] tyreLoadedRadius; // Tyre loaded radius [4]
        public float[] suspensionHeight; // Suspension height [4]
        public float carPositionNormalized; // Car position normalized
        public float carSlope;         // Car slope
        public float[] carCoordinates; // Car coordinates [3] - X, Y, Z
    }

    // Comprehensive telemetry point for sending to web app
    public class TelemetryPoint
    {
        // Basic telemetry (existing)
        public float time { get; set; }
        public float x { get; set; }
        public float z { get; set; }
        public float speed { get; set; }
        public float throttle { get; set; }
        public float brake { get; set; }
        public float steering { get; set; }
        public float gForceX { get; set; }
        public float gForceZ { get; set; }
        public int gear { get; set; }
        public float rpm { get; set; }
        
        // Enhanced physics data
        public float gForceY { get; set; }           // Vertical G-force
        public float clutch { get; set; }            // Clutch pedal
        public float fuel { get; set; }              // Current fuel level
        public float heading { get; set; }           // Car heading (radians)
        public float pitch { get; set; }             // Car pitch (radians)
        public float roll { get; set; }              // Car roll (radians)
        
        // Tire data (per wheel: FL, FR, RL, RR)
        public float[] tyrePressure { get; set; } = new float[4];     // Tire pressures
        public float[] tyreTemperature { get; set; } = new float[4];  // Tire core temperatures
        public float[] tyreWear { get; set; } = new float[4];         // Tire wear levels
        public float[] tyreDirtyLevel { get; set; } = new float[4];   // Tire dirt levels
        public float[] wheelLoad { get; set; } = new float[4];        // Wheel loads
        public float[] wheelSlip { get; set; } = new float[4];        // Wheel slip values
        public float[] suspensionTravel { get; set; } = new float[4]; // Suspension travel
        
        // Car state
        public bool absActive { get; set; }          // ABS engaged
        public bool tcActive { get; set; }           // Traction control engaged
        public bool isInPit { get; set; }            // In pit lane
        public float drs { get; set; }               // DRS status
        public float turboBoost { get; set; }        // Turbo boost pressure
        public int numberOfTyresOut { get; set; }    // Tires off track
        
        // Environmental
        public float airTemp { get; set; }           // Air temperature
        public float roadTemp { get; set; }          // Road temperature
        public float surfaceGrip { get; set; }       // Track grip level
        
        // Session info
        public float normalizedPosition { get; set; } // Position on track (0-1)
        public int currentSector { get; set; }       // Current sector (0-2)
        public string tyreCompound { get; set; } = "";  // Tire compound name
        public float penaltyTime { get; set; }       // Penalty time
        public int raceFlag { get; set; }            // Race flag status
        
        // Advanced data
        public float[] carDamage { get; set; } = new float[5];  // Damage levels
        public float kersCharge { get; set; }        // KERS charge level
        public float[] rideHeight { get; set; } = new float[2]; // Front/rear ride height
    }

    // Lap data structure
    public class LapData
    {
        public string lapTime { get; set; } = "";
        public string car { get; set; } = "Unknown";
        public string track { get; set; } = "Spa-Francorchamps";
        public string conditions { get; set; } = "Dry";
        public List<TelemetryPoint> telemetryPoints { get; set; } = new();
        public SectorTimes sectorTimes { get; set; } = new();
    }

    public class SectorTimes
    {
        public float sector1 { get; set; }
        public float sector2 { get; set; }
        public float sector3 { get; set; }
    }

    class Program
    {
        private static UdpClient? udpClient;
        private static List<TelemetryPoint> currentLapData = new();
        private static int lastLapCount = -1;
        private static int telemetryCounter = 0; // Counter for sampling telemetry data
        private static string webAppUrl = "http://192.168.4.28:3000"; // Your Mac's IP from terminal output
        
        // Store actual car and track data from AC
        private static string currentCarName = "Unknown Car";
        private static string currentTrackName = "Unknown Track";
        private static string currentDriverName = "Unknown Driver";
        private static uint completedLapTime = 0; // Store the actual lap time when lap completes
        
        // Shared memory for getting accurate track/car info
        private static MemoryMappedFile sharedMemoryFile;
        private static MemoryMappedViewAccessor sharedMemoryAccessor;
        
        // Comprehensive shared memory for physics and graphics data
        private static MemoryMappedFile physicsMemoryFile;
        private static MemoryMappedViewAccessor physicsMemoryAccessor;
        private static MemoryMappedFile graphicsMemoryFile;
        private static MemoryMappedViewAccessor graphicsMemoryAccessor;
        
        // Static info from shared memory (updated once per session)
        private static float currentAirTemp = 20.0f;
        private static float currentRoadTemp = 25.0f;
        private static string currentTyreCompound = "Unknown";
        private static float maxFuel = 100.0f;
        
        // Helper method to format names with proper title case
        private static string ToTitleCase(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return input;
                
            // Replace underscores and clean up
            string cleaned = input.Replace("_", " ").Replace("%", "").Trim();
            
            if (string.IsNullOrEmpty(cleaned))
                return input;
            
            // Convert to title case using TextInfo
            System.Globalization.TextInfo textInfo = System.Globalization.CultureInfo.CurrentCulture.TextInfo;
            return textInfo.ToTitleCase(cleaned.ToLower());
        }
        
        // Method to read static information from AC shared memory
        private static bool TryReadSharedMemory()
        {
            try
            {
                // Try to open AC's shared memory for static info
                sharedMemoryFile = MemoryMappedFile.OpenExisting("acpmf_static");
                sharedMemoryAccessor = sharedMemoryFile.CreateViewAccessor();
                
                // Read the static info structure
                byte[] buffer = new byte[Marshal.SizeOf<SPageFileStatic>()];
                sharedMemoryAccessor.ReadArray(0, buffer, 0, buffer.Length);
                
                // Convert to structure
                GCHandle handle = GCHandle.Alloc(buffer, GCHandleType.Pinned);
                var staticInfo = Marshal.PtrToStructure<SPageFileStatic>(handle.AddrOfPinnedObject());
                handle.Free();
                
                // Extract, clean, and format the information we need
                currentTrackName = !string.IsNullOrWhiteSpace(staticInfo.track) ? 
                    ToTitleCase(staticInfo.track) : "Unknown Track";
                currentCarName = !string.IsNullOrWhiteSpace(staticInfo.carModel) ? 
                    ToTitleCase(staticInfo.carModel) : "Unknown Car";
                currentDriverName = !string.IsNullOrWhiteSpace(staticInfo.playerName) ? 
                    ToTitleCase(staticInfo.playerName) : "Unknown Driver";
                
                // Store static car/environment data
                currentAirTemp = staticInfo.airTemp;
                currentRoadTemp = staticInfo.roadTemp;
                maxFuel = staticInfo.maxFuel;
                
                Console.WriteLine("✅ Successfully read from AC Shared Memory:");
                Console.WriteLine($"   🏁 Track: {currentTrackName}");
                Console.WriteLine($"   🚗 Car: {currentCarName}");
                Console.WriteLine($"   🏎️  Driver: {currentDriverName}");
                Console.WriteLine($"   🌡️  Air: {currentAirTemp:F1}°C, Road: {currentRoadTemp:F1}°C");
                Console.WriteLine($"   ⛽ Max Fuel: {maxFuel:F0}L");
                
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️  Could not read AC Shared Memory: {ex.Message}");
                Console.WriteLine("   Will use UDP handshake data instead");
                return false;
            }
        }
        
        // Method to initialize comprehensive shared memory access
        private static bool TryInitializeComprehensiveSharedMemory()
        {
            try
            {
                // Open physics shared memory
                physicsMemoryFile = MemoryMappedFile.OpenExisting("acpmf_physics");
                physicsMemoryAccessor = physicsMemoryFile.CreateViewAccessor();
                
                // Open graphics shared memory
                graphicsMemoryFile = MemoryMappedFile.OpenExisting("acpmf_graphics");
                graphicsMemoryAccessor = graphicsMemoryFile.CreateViewAccessor();
                
                Console.WriteLine("✅ Comprehensive shared memory initialized");
                Console.WriteLine("   📊 Physics and Graphics data available");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️  Could not initialize comprehensive shared memory: {ex.Message}");
                Console.WriteLine("   Will use UDP data only");
                return false;
            }
        }
        
        // Method to read physics data from shared memory
        private static SPageFilePhysics? TryReadPhysicsData()
        {
            try
            {
                if (physicsMemoryAccessor == null) 
                {
                    // Only log this once every few seconds to avoid spam
                    if (telemetryCounter % 300 == 0) 
                    {
                        Console.WriteLine("⚠️  Physics memory accessor is null - comprehensive data unavailable");
                    }
                    return null;
                }
                
                byte[] buffer = new byte[Marshal.SizeOf<SPageFilePhysics>()];
                physicsMemoryAccessor.ReadArray(0, buffer, 0, buffer.Length);
                
                GCHandle handle = GCHandle.Alloc(buffer, GCHandleType.Pinned);
                var physics = Marshal.PtrToStructure<SPageFilePhysics>(handle.AddrOfPinnedObject());
                handle.Free();
                
                return physics;
            }
            catch (Exception ex)
            {
                // Only log this once every few seconds to avoid spam
                if (telemetryCounter % 300 == 0)
                {
                    Console.WriteLine($"⚠️  Error reading physics data: {ex.Message}");
                }
                return null;
            }
        }
        
        // Method to read graphics data from shared memory
        private static SPageFileGraphic? TryReadGraphicsData()
        {
            try
            {
                if (graphicsMemoryAccessor == null) return null;
                
                byte[] buffer = new byte[Marshal.SizeOf<SPageFileGraphic>()];
                graphicsMemoryAccessor.ReadArray(0, buffer, 0, buffer.Length);
                
                GCHandle handle = GCHandle.Alloc(buffer, GCHandleType.Pinned);
                var graphics = Marshal.PtrToStructure<SPageFileGraphic>(handle.AddrOfPinnedObject());
                handle.Free();
                
                return graphics;
            }
            catch
            {
                return null;
            }
        }

        static async Task Main(string[] args)
        {
            Console.WriteLine("🏁 Trail Break - Assetto Corsa Telemetry Capture");
            Console.WriteLine("============================================");
            Console.WriteLine($"Connecting to Assetto Corsa on port 9996...");
            Console.WriteLine($"Web app URL: {webAppUrl}");
            Console.WriteLine("Press Ctrl+C to exit\n");

            try
            {
                udpClient = new UdpClient();
                var acEndPoint = new IPEndPoint(IPAddress.Loopback, 9996); // AC Remote Telemetry port

                // Step 0: Try to read static info from shared memory first
                Console.WriteLine("🔍 Attempting to read static info from AC Shared Memory...");
                bool sharedMemorySuccess = TryReadSharedMemory();
                
                // Step 0.5: Try to initialize comprehensive shared memory for physics/graphics
                Console.WriteLine("🔬 Attempting to initialize comprehensive shared memory...");
                bool comprehensiveMemorySuccess = TryInitializeComprehensiveSharedMemory();

                // Step 1: Send handshake request
                Console.WriteLine("🤝 Sending handshake request...");
                await SendHandshake(acEndPoint, 0); // HANDSHAKE = 0

                // Step 2: Receive handshake response
                Console.WriteLine("⏳ Waiting for handshake response...");
                var handshakeResponse = udpClient.Receive(ref acEndPoint);
                Console.WriteLine($"✅ Received handshake response ({handshakeResponse.Length} bytes)");
                
                // Only parse handshake as fallback if shared memory failed
                if (!sharedMemorySuccess) {
                    Console.WriteLine("🔍 Parsing handshake response as fallback...");
                    if (handshakeResponse.Length >= 208) {
                        // Try different parsing approach based on AC Remote Telemetry docs
                        string carName = System.Text.Encoding.ASCII.GetString(handshakeResponse, 0, 50).TrimEnd('\0');
                        string driverName = System.Text.Encoding.ASCII.GetString(handshakeResponse, 50, 50).TrimEnd('\0');
                        
                        // Try alternative offsets for track info
                        string trackName = System.Text.Encoding.ASCII.GetString(handshakeResponse, 100, 50).TrimEnd('\0');
                        string trackConfig = System.Text.Encoding.ASCII.GetString(handshakeResponse, 150, 50).TrimEnd('\0');
                        
                        // Clean and store for use in lap data as fallback
                        currentCarName = !string.IsNullOrWhiteSpace(carName) ? 
                            ToTitleCase(carName) : "Unknown Car";
                        currentDriverName = !string.IsNullOrWhiteSpace(driverName) ? 
                            ToTitleCase(driverName) : "Unknown Driver";
                        // Note: Track name from UDP handshake seems unreliable, keeping as "Unknown Track"
                        
                        Console.WriteLine($"🏎️  Driver: {currentDriverName} (from UDP fallback)");
                        Console.WriteLine($"🚗 Car: {currentCarName} (from UDP fallback)");
                        Console.WriteLine($"🏁 Track: {currentTrackName} (shared memory preferred)");
                    } else {
                        Console.WriteLine($"⚠️  Handshake response too short ({handshakeResponse.Length} bytes, expected 208)");
                        Console.WriteLine("   Using default values");
                    }
                } else {
                    Console.WriteLine("✅ Using shared memory data (more accurate than UDP handshake)");
                }

                // Step 3: Subscribe to updates
                Console.WriteLine("📡 Subscribing to telemetry updates...");
                await SendHandshake(acEndPoint, 1); // SUBSCRIBE_UPDATE = 1
                Console.WriteLine("✅ Connected! Receiving telemetry data...\n");

                // Step 4: Listen for telemetry data
                while (true)
                {
                    try
                    {
                        byte[] data = udpClient.Receive(ref acEndPoint);
                        
                        if (data.Length > 0 && data[0] == (byte)'a')
                        {
                            await ProcessTelemetryData(data);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error receiving data: {ex.Message}");
                        await Task.Delay(1000);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Failed to connect to Assetto Corsa: {ex.Message}");
                Console.WriteLine("Make sure:");
                Console.WriteLine("1. Assetto Corsa is running and in a session");
                Console.WriteLine("2. UDP telemetry is enabled in AC settings");
                Console.WriteLine("3. You're in an active driving session (not menu)");
            }
            finally
            {
                udpClient?.Close();
                sharedMemoryAccessor?.Dispose();
                sharedMemoryFile?.Dispose();
                physicsMemoryAccessor?.Dispose();
                physicsMemoryFile?.Dispose();
                graphicsMemoryAccessor?.Dispose();
                graphicsMemoryFile?.Dispose();
            }
        }

        private static async Task SendHandshake(IPEndPoint endPoint, int operationId)
        {
            // Create handshake packet: identifier(4) + version(4) + operationId(4)
            byte[] handshake = new byte[12];
            BitConverter.GetBytes(1).CopyTo(handshake, 0);  // identifier
            BitConverter.GetBytes(1).CopyTo(handshake, 4);  // version  
            BitConverter.GetBytes(operationId).CopyTo(handshake, 8); // operationId
            
            await udpClient.SendAsync(handshake, handshake.Length, endPoint);
        }

        private static async Task ProcessTelemetryData(byte[] data)
        {
            try
            {
                // Process AC UDP telemetry packet
                if (data.Length < 328) return; // Ensure we have a complete packet

                // Parse telemetry data using proven offsets from AC community
                float speed = 0;
                float throttle = 0;
                float brake = 0;
                int gear = 0;
                float rpm = 0;
                int lapCount = 0;
                uint lapTime = 0; // Lap time in milliseconds
                float steering = 0;
                float gForceX = 0;
                float gForceZ = 0;
                float posX = 0;
                float posZ = 0;
                
                // Parse using proven working offsets from AC forum post
                if (data.Length >= 328)
                {
                    // Speed values
                    speed = BitConverter.ToSingle(data, 8);  // SpeedKMH
                    
                    // Pedal inputs
                    throttle = BitConverter.ToSingle(data, 56); // Gas
                    brake = BitConverter.ToSingle(data, 60);    // Brake
                    
                    // Controls  
                    steering = BitConverter.ToSingle(data, 72); // Steer
                    rpm = BitConverter.ToSingle(data, 68);      // RPM
                    gear = BitConverter.ToInt32(data, 76) - 1;  // Gear (subtract 1)
                    
                    // G-forces
                    gForceX = BitConverter.ToSingle(data, 32);  // GForceLat (lateral)
                    gForceZ = BitConverter.ToSingle(data, 36);  // GForceLon (longitudinal)
                    
                    // Lap timing (using UInt32 as per forum post)
                    lapTime = BitConverter.ToUInt32(data, 40);  // LapTime in milliseconds
                    lapCount = (int)BitConverter.ToUInt32(data, 52); // LapCount
                    
                    // Car position coordinates
                    posX = BitConverter.ToSingle(data, 316);    // CarPosition X
                    posZ = BitConverter.ToSingle(data, 324);    // CarPosition Z
                }

                // Read comprehensive data from shared memory
                var physicsData = TryReadPhysicsData();
                var graphicsData = TryReadGraphicsData();
                
                // Debug output every 60 frames (1 second)
                if (telemetryCounter % 60 == 0 && physicsData != null)
                {
                    Console.WriteLine($"🔍 Debug - Physics data available: heading={physicsData.Value.heading:F3} rad, speed={physicsData.Value.speedKmh:F1} km/h");
                }
                
                // Create comprehensive telemetry point combining UDP and shared memory
                var telemetryPoint = new TelemetryPoint
                {
                    // Basic telemetry (from UDP or shared memory)
                    time = lapTime / 1000.0f,
                    x = posX,
                    z = posZ,
                    speed = physicsData?.speedKmh ?? speed,
                    throttle = physicsData?.gas ?? throttle,
                    brake = physicsData?.brake ?? brake,
                    steering = physicsData?.steerAngle ?? steering,
                    gForceX = physicsData?.accG?[0] ?? gForceX,
                    gForceZ = physicsData?.accG?[2] ?? gForceZ,
                    gear = physicsData?.gear ?? gear,
                    rpm = physicsData?.rpms ?? (int)rpm,
                    
                    // Enhanced physics data (from shared memory)
                    gForceY = physicsData?.accG?[1] ?? 0,
                    clutch = 0, // Not in AC UDP, get from advanced parsing if needed
                    fuel = physicsData?.fuel ?? 0,
                    heading = physicsData?.heading ?? 0,
                    pitch = physicsData?.pitch ?? 0,
                    roll = physicsData?.roll ?? 0,
                    
                    // Tire data (4 wheels: FL, FR, RL, RR)
                    tyrePressure = physicsData?.wheelsPressure ?? new float[4],
                    tyreTemperature = physicsData?.tyreCoreTemperature ?? new float[4],
                    tyreWear = physicsData?.tyreWear ?? new float[4],
                    tyreDirtyLevel = physicsData?.tyreDirtyLevel ?? new float[4],
                    wheelLoad = physicsData?.wheelLoad ?? new float[4],
                    wheelSlip = physicsData?.wheelSlip ?? new float[4],
                    suspensionTravel = physicsData?.suspensionTravel ?? new float[4],
                    
                    // Car state
                    absActive = physicsData?.abs > 0.1f,
                    tcActive = physicsData?.tc > 0.1f,
                    isInPit = graphicsData?.isInPit == 1,
                    drs = physicsData?.drs ?? 0,
                    turboBoost = physicsData?.turboBoost ?? 0,
                    numberOfTyresOut = physicsData?.numberOfTyresOut ?? 0,
                    
                    // Environmental (from static memory, set once per session)
                    airTemp = currentAirTemp,
                    roadTemp = currentRoadTemp,
                    surfaceGrip = graphicsData?.surfaceGrip ?? 1.0f,
                    
                    // Session info
                    normalizedPosition = graphicsData?.normalizedCarPosition ?? 0,
                    currentSector = graphicsData?.currentSectorIndex ?? 0,
                    tyreCompound = graphicsData?.tyreCompound ?? "Unknown",
                    penaltyTime = graphicsData?.penaltyTime ?? 0,
                    raceFlag = graphicsData?.flag ?? 0,
                    
                    // Advanced data
                    carDamage = physicsData?.carDamage ?? new float[5],
                    kersCharge = physicsData?.kersCharge ?? 0,
                    rideHeight = physicsData?.rideHeight ?? new float[2]
                };

                // Capture ALL telemetry data points at full 60Hz resolution
                // New chunked storage system can handle comprehensive data
                telemetryCounter++;
                currentLapData.Add(telemetryPoint);

                // Check for lap completion using parsed lap count
                // With 60Hz capture, expect ~3600 points for a 1-minute lap
                if (lapCount > lastLapCount && lastLapCount >= 0 && currentLapData.Count > 300)
                {
                    // Store the completed lap time (from AC's lastLap field)
                    uint lastLapTimeMs = BitConverter.ToUInt32(data, 44); // LastLap time in milliseconds
                    completedLapTime = lastLapTimeMs;
                    
                    Console.WriteLine($"🏁 Lap {lastLapCount + 1} completed! Collected {currentLapData.Count} telemetry points");
                    Console.WriteLine($"📊 Lap time: {completedLapTime}ms ({completedLapTime / 1000.0f:F3}s)");
                    await SendLapToWebApp();
                    currentLapData.Clear();
                    telemetryCounter = 0; // Reset counter for next lap
                }
                
                lastLapCount = Math.Max(lastLapCount, lapCount);

                // Print live data every 60 data points (1Hz display rate at 60Hz capture)
                if (telemetryCounter % 60 == 0)
                {
                    int minutes = (int)(lapTime / 60000);
                    float seconds = (lapTime % 60000) / 1000.0f;
                    Console.WriteLine($"Lap {lapCount + 1} | {minutes}:{seconds:F3} | Speed: {speed:F1} km/h | Throttle: {throttle * 100:F0}% | Brake: {brake * 100:F0}% | Gear: {gear} | RPM: {rpm:F0}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing telemetry: {ex.Message}");
            }
        }

        private static async Task SendLapToWebApp()
        {
            if (currentLapData.Count == 0) return;

            try
            {
                // Use the actual completed lap time from AC, with fallback to telemetry data
                float lapTimeSeconds = completedLapTime / 1000.0f; // Convert milliseconds to seconds
                
                // Debug the lap time calculation
                Console.WriteLine($"🔍 Debug - Lap time calculation:");
                Console.WriteLine($"   completedLapTime (raw): {completedLapTime}ms");
                Console.WriteLine($"   lapTimeSeconds: {lapTimeSeconds}s");
                Console.WriteLine($"   Telemetry points: {currentLapData.Count}");
                Console.WriteLine($"   First point time: {(currentLapData.Count > 0 ? currentLapData[0].time : 0)}s");
                Console.WriteLine($"   Last point time: {(currentLapData.Count > 0 ? currentLapData.Last().time : 0)}s");
                
                // If AC lap time seems invalid (too small), use telemetry data as fallback
                if (lapTimeSeconds < 10.0f && currentLapData.Count > 0) {
                    float telemetryLapTime = currentLapData.Last().time - currentLapData.First().time;
                    Console.WriteLine($"⚠️  AC lap time seems invalid ({lapTimeSeconds}s), using telemetry fallback: {telemetryLapTime}s");
                    lapTimeSeconds = telemetryLapTime;
                }
                
                int minutes = (int)(lapTimeSeconds / 60);
                float seconds = lapTimeSeconds % 60;
                string lapTimeFormatted = $"{minutes}:{seconds:F3}";

                var lapData = new LapData
                {
                    lapTime = lapTimeFormatted,
                    car = currentCarName,
                    track = currentTrackName,
                    conditions = "Dry",
                    telemetryPoints = currentLapData.ToList(),
                    sectorTimes = new SectorTimes
                    {
                        // Calculate realistic sector times based on lap time
                        sector1 = lapTimeSeconds * 0.33f, // ~33% of lap
                        sector2 = lapTimeSeconds * 0.35f, // ~35% of lap  
                        sector3 = lapTimeSeconds * 0.32f  // ~32% of lap
                    }
                };

                // Send to your Trail Break web app using tRPC format
                using var httpClient = new HttpClient();
                
                // tRPC expects data in this specific batched format
                var tRpcRequest = new {
                    json = lapData
                };
                
                var json = JsonSerializer.Serialize(tRpcRequest);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                
                var response = await httpClient.PostAsync($"{webAppUrl}/api/trpc/lap.create", content);
                
                if (response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"✅ Lap data sent successfully! Time: {lapTimeFormatted}");
                }
                else
                {
                    Console.WriteLine($"❌ Failed to send lap data: {response.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error sending lap data: {ex.Message}");
            }
        }
    }
} 
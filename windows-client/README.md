# Trail Break - Windows Telemetry Client

Captures real-time telemetry from Assetto Corsa and sends it to your Trail Break web app.

## ✨ Features

- ✅ **AC Remote Telemetry Protocol** - Implements proper handshake and data parsing  
- ✅ **Proven UDP Parsing** - Uses community-verified offsets for accurate data extraction
- ✅ **Dynamic Car & Track Detection** - Automatically extracts car and track names from AC
- ✅ **Real-time Data Collection** - Captures speed, throttle, brake, gear, RPM, G-forces, position
- ✅ **Lap Detection** - Automatically detects lap completion using AC's lap counter
- ✅ **Web App Integration** - Sends data to Trail Break web app via tRPC API
- ✅ **Data Sampling** - 6Hz sampling to fit within Firestore 1MB document limits

## 🚀 Quick Setup

### Prerequisites
- Windows gaming laptop with Assetto Corsa
- .NET 8.0 Runtime (download from https://dotnet.microsoft.com/download)
- Your Mac running the Trail Break web app on the same network

### Step 1: Enable Assetto Corsa UDP Telemetry
1. Open Assetto Corsa
2. Go to Settings → General
3. Find "UDP Telemetry" section
4. Set:
   - **Enable UDP**: ✅ ON
   - **Address**: `127.0.0.1` (localhost)
   - **Port**: `9996` (AC Remote Telemetry standard)
   - **Hz**: `60` (max available in Content Manager)

### Step 2: Build & Run the Client
```bash
# In PowerShell or Command Prompt
cd path\to\windows-client\AssettoCorsaTelemetry
dotnet restore
dotnet build
dotnet run
```

### Step 3: Test with Assetto Corsa
1. Start the telemetry client (it will wait for data)
2. Launch Assetto Corsa
3. Choose **Spa-Francorchamps** track
4. Start a practice session or race
5. Drive around - you should see live telemetry in the console
6. Complete a lap - the client will automatically send data to your web app!

## 🔧 Configuration

Edit `Program.cs` line 91 to match your Mac's IP address:
```csharp
private static string webAppUrl = "http://YOUR_MAC_IP:3000";
```

## 📊 What It Captures
- ✅ Car position (X, Z coordinates)
- ✅ Speed, throttle, brake, steering inputs  
- ✅ G-forces and gear changes
- ✅ Engine RPM
- ✅ Automatic lap detection
- ✅ Sector timing (basic implementation)

## 🐛 Troubleshooting

**No data received:**
- Make sure Assetto Corsa UDP telemetry is enabled (Content Manager settings)
- Check Windows Firewall isn't blocking port 9996
- Verify Assetto Corsa is in an active driving session (not menu)
- Make sure you're actually driving, not in the pits or paused

**Can't send to web app:**
- Verify your Mac's IP address in the code
- Make sure both devices are on the same WiFi network
- Check your Mac's firewall settings

**UDP packet parsing errors:**
- Assetto Corsa UDP format may vary by version
- The byte offsets might need adjustment for your AC version

## 🏁 Next Steps
Once this is working, we can:
- Add proper Assetto Corsa UDP packet parsing
- Implement real sector detection for Spa
- Add car and track auto-detection
- Create a Windows GUI instead of console app 
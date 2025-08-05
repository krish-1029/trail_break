import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { LapData, TelemetryPoint, TelemetryChunk } from "@/types/telemetry";
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc,
  orderBy,
  limit,
  Timestamp 
} from "firebase/firestore";

// Zod schemas for validation
const telemetryPointSchema = z.object({
  // Basic telemetry (existing)
  time: z.number(),
  x: z.number(),
  z: z.number(),
  speed: z.number(),
  throttle: z.number(),
  brake: z.number(),
  steering: z.number(),
  gForceX: z.number(),
  gForceZ: z.number(),
  gear: z.number(),
  rpm: z.number(),
  
  // Enhanced physics data
  gForceY: z.number().optional(),
  clutch: z.number().optional(),
  fuel: z.number().optional(),
  heading: z.number().optional(),          // 🎯 This was missing!
  pitch: z.number().optional(),
  roll: z.number().optional(),
  
  // Tire data (per wheel: FL, FR, RL, RR)
  tyrePressure: z.array(z.number()).optional(),
  tyreTemperature: z.array(z.number()).optional(),
  tyreWear: z.array(z.number()).optional(),
  tyreDirtyLevel: z.array(z.number()).optional(),
  wheelLoad: z.array(z.number()).optional(),
  wheelSlip: z.array(z.number()).optional(),
  suspensionTravel: z.array(z.number()).optional(),
  
  // Car state
  absActive: z.boolean().optional(),
  tcActive: z.boolean().optional(),
  isInPit: z.boolean().optional(),
  drs: z.number().optional(),
  turboBoost: z.number().optional(),
  numberOfTyresOut: z.number().optional(),
  
  // Environmental
  airTemp: z.number().optional(),
  roadTemp: z.number().optional(),
  surfaceGrip: z.number().optional(),
  
  // Session info
  normalizedPosition: z.number().optional(),
  currentSector: z.number().optional(),
  tyreCompound: z.string().optional(),
  penaltyTime: z.number().optional(),
  raceFlag: z.number().optional(),
  
  // Advanced data
  carDamage: z.array(z.number()).optional(),
  kersCharge: z.number().optional(),
  rideHeight: z.array(z.number()).optional(),
});

const sectorTimesSchema = z.object({
  sector1: z.number(),
  sector2: z.number(),
  sector3: z.number(),
});

const createLapSchema = z.object({
  lapTime: z.string(),
  car: z.string(),
  track: z.string(),
  conditions: z.string().default("Dry"),
  telemetryPoints: z.array(telemetryPointSchema),
  sectorTimes: sectorTimesSchema,
});

const getLapSchema = z.object({
  lapId: z.string(),
});

// Helper function to chunk telemetry data
const chunkTelemetryData = (points: TelemetryPoint[], chunkSize = 500): TelemetryPoint[][] => {
  const chunks: TelemetryPoint[][] = [];
  for (let i = 0; i < points.length; i += chunkSize) {
    chunks.push(points.slice(i, i + chunkSize));
  }
  return chunks;
};

// Helper function to store telemetry chunks
const storeTelemetryChunks = async (lapId: string, telemetryPoints: TelemetryPoint[], userId: string): Promise<number> => {
  const chunks = chunkTelemetryData(telemetryPoints, 500); // 500 points per chunk (~400KB each)
  
  const chunkPromises = chunks.map(async (chunkPoints, index) => {
    const chunkData: Omit<TelemetryChunk, 'id'> = {
      lapId,
      userId, // Associate chunks with user
      chunkIndex: index,
      startTime: chunkPoints[0]?.time || 0,
      endTime: chunkPoints[chunkPoints.length - 1]?.time || 0,
      points: chunkPoints,
      createdAt: Timestamp.now() as any,
    };
    
    return addDoc(collection(db, "telemetryChunks"), chunkData);
  });
  
  await Promise.all(chunkPromises);
  return chunks.length;
};

// Helper function to load telemetry chunks
const loadTelemetryChunks = async (lapId: string, userId: string): Promise<TelemetryPoint[]> => {
  try {
    const chunksQuery = query(
      collection(db, "telemetryChunks"),
      where("lapId", "==", lapId),
      where("userId", "==", userId), // Only load chunks for the current user
      orderBy("chunkIndex", "asc")
    );
    
    const chunksSnapshot = await getDocs(chunksQuery);
    const allPoints: TelemetryPoint[] = [];
    
    chunksSnapshot.docs.forEach(doc => {
      const chunk = doc.data() as TelemetryChunk;
      if (chunk.points && Array.isArray(chunk.points)) {
        allPoints.push(...chunk.points);
      }
    });
    
    console.log(`Loaded ${allPoints.length} telemetry points from ${chunksSnapshot.docs.length} chunks for lap ${lapId}`);
    return allPoints;
  } catch (error) {
    console.error(`Error loading telemetry chunks for lap ${lapId}:`, error);
    return []; // Return empty array if chunks can't be loaded
  }
};

export const lapRouter = createTRPCRouter({
  // Create a new lap with chunked telemetry storage
  create: protectedProcedure
    .input(createLapSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      
      // Store lap metadata first
      const lapDoc = {
        userId, // Associate lap with user
        lapTime: input.lapTime,
        date: new Date().toISOString().split('T')[0]!,
        car: input.car,
        track: input.track,
        conditions: input.conditions,
        avgSpeed: input.telemetryPoints.reduce((sum, p) => sum + p.speed, 0) / input.telemetryPoints.length,
        maxSpeed: Math.max(...input.telemetryPoints.map(p => p.speed)),
        totalDataPoints: input.telemetryPoints.length,
        chunkCount: 0, // Will be updated after storing chunks
        sectorTimes: input.sectorTimes,
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "laps"), lapDoc);
      
      // Store telemetry data in chunks
      const chunkCount = await storeTelemetryChunks(docRef.id, input.telemetryPoints, userId);
      
      return {
        id: docRef.id,
        ...lapDoc,
        chunkCount,
        telemetryPoints: [], // Don't return full data in create response
        createdAt: lapDoc.createdAt.toDate(),
      };
    }),

  // Get a specific lap by ID with full telemetry data (only if user owns it)
  getById: protectedProcedure
    .input(getLapSchema)
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      
      const docSnap = await getDoc(doc(db, "laps", input.lapId));
      if (!docSnap.exists()) {
        throw new Error("Lap not found");
      }
      
      const data = docSnap.data();
      
      // Check if this lap belongs to the current user
      if (data.userId && data.userId !== userId) {
        throw new Error("Unauthorized: This lap belongs to another user");
      }
      
      // Check if this is a legacy lap with embedded telemetry or new chunked format
      let telemetryPoints: TelemetryPoint[] = [];
      
      if (data.telemetryPoints && Array.isArray(data.telemetryPoints)) {
        // Legacy lap with embedded telemetry data
        telemetryPoints = data.telemetryPoints;
      } else {
        // New format - load from chunks
        telemetryPoints = await loadTelemetryChunks(input.lapId, userId);
      }
      
      return {
        id: docSnap.id,
        lapTime: data.lapTime,
        date: data.date,
        car: data.car,
        track: data.track,
        conditions: data.conditions,
        avgSpeed: data.avgSpeed,
        maxSpeed: data.maxSpeed,
        totalDataPoints: data.totalDataPoints || telemetryPoints.length,
        chunkCount: data.chunkCount || 0,
        telemetryPoints, // Full data (either legacy or from chunks)
        sectorTimes: data.sectorTimes,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
      } as LapData;
    }),

  // Get all laps for the current user (without full telemetry data for performance)
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      const q = query(
        collection(db, "laps"), 
        where("userId", "==", userId), // Only get laps for current user
        orderBy("createdAt", "desc") // Now that index is created, we can use database-level ordering
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          lapTime: data.lapTime,
          date: data.date,
          car: data.car,
          track: data.track,
          conditions: data.conditions,
          avgSpeed: data.avgSpeed,
          maxSpeed: data.maxSpeed,
          totalDataPoints: data.totalDataPoints || 0,
          chunkCount: data.chunkCount || 0,
          telemetryPoints: [], // Empty for list view performance
          sectorTimes: data.sectorTimes,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
        } as LapData;
      }); // No need for in-memory sorting since database handles it efficiently
    }),

  // Delete a lap and all its telemetry chunks (only if user owns it)
  delete: protectedProcedure
    .input(getLapSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      
      // First check if the lap exists and belongs to the user
      const docSnap = await getDoc(doc(db, "laps", input.lapId));
      if (!docSnap.exists()) {
        throw new Error("Lap not found");
      }
      
      const data = docSnap.data();
      if (data.userId && data.userId !== userId) {
        throw new Error("Unauthorized: This lap belongs to another user");
      }
      
      // Delete all telemetry chunks for this user's lap
      const chunksQuery = query(
        collection(db, "telemetryChunks"),
        where("lapId", "==", input.lapId),
        where("userId", "==", userId)
      );
      const chunksSnapshot = await getDocs(chunksQuery);
      
      const deleteChunkPromises = chunksSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteChunkPromises);
      
      // Delete the lap document
      await deleteDoc(doc(db, "laps", input.lapId));
      
      return { success: true };
    }),
}); 
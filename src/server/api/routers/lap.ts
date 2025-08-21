import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { LapData, TelemetryPoint, TelemetryChunk } from "@/types/telemetry";
import { tryGetAdminDb } from "@/server/firebase-admin";
import { db as webDb } from "@/lib/firebase";
import { 
  collection as webCollection,
  addDoc as webAddDoc,
  doc as webDoc,
  getDoc as webGetDoc,
  getDocs as webGetDocs,
  query as webQuery,
  where as webWhere,
  deleteDoc as webDeleteDoc,
  orderBy as webOrderBy,
  Timestamp as WebTimestamp 
} from "firebase/firestore";
import { Timestamp as AdminTimestamp } from "firebase-admin/firestore";

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

// Helper to store telemetry chunks using Admin or Web
const storeTelemetryChunks = async (
  adminDb: FirebaseFirestore.Firestore | null,
  lapId: string,
  telemetryPoints: TelemetryPoint[],
  userId: string
): Promise<number> => {
  const chunks = chunkTelemetryData(telemetryPoints, 500); // ~500 points per chunk
  if (adminDb) {
    await Promise.all(
      chunks.map(async (chunkPoints, index) => {
        const chunkData: Omit<TelemetryChunk, 'id'> = {
          lapId,
          userId,
          chunkIndex: index,
          startTime: chunkPoints[0]?.time ?? 0,
          endTime: chunkPoints[chunkPoints.length - 1]?.time ?? 0,
          points: chunkPoints,
          createdAt: new Date(),
        };
        await adminDb.collection("telemetryChunks").add(chunkData);
      })
    );
    return chunks.length;
  }
  await Promise.all(
    chunks.map(async (chunkPoints, index) => {
      const chunkData: Omit<TelemetryChunk, 'id'> = {
        lapId,
        userId,
        chunkIndex: index,
        startTime: chunkPoints[0]?.time ?? 0,
        endTime: chunkPoints[chunkPoints.length - 1]?.time ?? 0,
        points: chunkPoints,
        createdAt: WebTimestamp.now().toDate(),
      };
      await webAddDoc(webCollection(webDb, "telemetryChunks"), chunkData);
    })
  );
  return chunks.length;
};

// Helper to load telemetry chunks using Admin or Web
const loadTelemetryChunks = async (
  adminDb: FirebaseFirestore.Firestore | null,
  lapId: string,
  userId: string
): Promise<TelemetryPoint[]> => {
  try {
    if (adminDb) {
      const q = await adminDb
        .collection("telemetryChunks")
        .where("lapId", "==", lapId)
        .where("userId", "==", userId)
        .orderBy("chunkIndex", "asc")
        .get();
      const all: TelemetryPoint[] = [];
      q.docs.forEach(d => {
        const chunk = d.data() as TelemetryChunk;
        if (Array.isArray(chunk.points)) all.push(...chunk.points);
      });
      return all;
    }
    const chunksQuery = webQuery(
      webCollection(webDb, "telemetryChunks"),
      webWhere("lapId", "==", lapId),
      webWhere("userId", "==", userId),
      webOrderBy("chunkIndex", "asc")
    );
    const chunksSnapshot = await webGetDocs(chunksQuery);
    const allPoints: TelemetryPoint[] = [];
    chunksSnapshot.docs.forEach(d => {
      const chunk = d.data() as TelemetryChunk;
      if (Array.isArray(chunk.points)) allPoints.push(...chunk.points);
    });
    return allPoints;
  } catch (error) {
    console.error(`Error loading telemetry chunks for lap ${lapId}:`, error);
    return [];
  }
};

export const lapRouter = createTRPCRouter({
  // Create a new lap with chunked telemetry storage
  create: protectedProcedure
    .input(createLapSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const adminDb = tryGetAdminDb();
      
      if (adminDb) {
        const lapDoc = {
          userId,
          lapTime: input.lapTime,
          date: new Date().toISOString().split('T')[0]!,
          car: input.car,
          track: input.track,
          conditions: input.conditions,
          avgSpeed: input.telemetryPoints.reduce((sum, p) => sum + p.speed, 0) / input.telemetryPoints.length,
          maxSpeed: Math.max(...input.telemetryPoints.map(p => p.speed)),
          totalDataPoints: input.telemetryPoints.length,
          chunkCount: 0,
          sectorTimes: input.sectorTimes,
          createdAt: AdminTimestamp.now(),
        };
        const docRef = await adminDb.collection("laps").add(lapDoc);
        const chunkCount = await storeTelemetryChunks(adminDb, docRef.id, input.telemetryPoints, userId);
        return {
          id: docRef.id,
          ...lapDoc,
          chunkCount,
          telemetryPoints: [],
          createdAt: lapDoc.createdAt.toDate(),
        };
      }
      
      const lapDoc = {
        userId,
        lapTime: input.lapTime,
        date: new Date().toISOString().split('T')[0]!,
        car: input.car,
        track: input.track,
        conditions: input.conditions,
        avgSpeed: input.telemetryPoints.reduce((sum, p) => sum + p.speed, 0) / input.telemetryPoints.length,
        maxSpeed: Math.max(...input.telemetryPoints.map(p => p.speed)),
        totalDataPoints: input.telemetryPoints.length,
        chunkCount: 0,
        sectorTimes: input.sectorTimes,
        createdAt: WebTimestamp.now(),
      };
      const docRef = await webAddDoc(webCollection(webDb, "laps"), lapDoc);
      const chunkCount = await storeTelemetryChunks(null, docRef.id, input.telemetryPoints, userId);
      return {
        id: docRef.id,
        ...lapDoc,
        chunkCount,
        telemetryPoints: [],
        createdAt: lapDoc.createdAt.toDate(),
      };
    }),

  // Get a specific lap by ID with full telemetry data (only if user owns it)
  getById: protectedProcedure
    .input(getLapSchema)
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const adminDb = tryGetAdminDb();
      
      if (adminDb) {
        const docSnap = await adminDb.collection("laps").doc(input.lapId).get();
        if (!docSnap.exists) throw new Error("Lap not found");
        const data = docSnap.data() as Record<string, unknown>;
        if (data.userId && data.userId !== userId) throw new Error("Unauthorized: This lap belongs to another user");
        let telemetryPoints: TelemetryPoint[] = [];
        if (data.telemetryPoints && Array.isArray(data.telemetryPoints)) {
          telemetryPoints = data.telemetryPoints as TelemetryPoint[];
        } else {
          telemetryPoints = await loadTelemetryChunks(adminDb, input.lapId, userId);
        }
        return {
          id: docSnap.id,
          lapTime: data.lapTime as string,
          date: data.date as string,
          car: data.car as string,
          track: data.track as string,
          conditions: data.conditions as string,
          avgSpeed: data.avgSpeed as number,
          maxSpeed: data.maxSpeed as number,
          totalDataPoints: (data.totalDataPoints as number) ?? telemetryPoints.length,
          chunkCount: (data.chunkCount as number) ?? 0,
          telemetryPoints,
          sectorTimes: data.sectorTimes as { sector1: number; sector2: number; sector3: number },
          createdAt: (data.createdAt as AdminTimestamp).toDate(),
        } satisfies LapData;
      }
      
      const docSnap = await webGetDoc(webDoc(webDb, "laps", input.lapId));
      if (!docSnap.exists()) throw new Error("Lap not found");
      const data = docSnap.data() as Record<string, unknown>;
      if (data.userId && data.userId !== userId) throw new Error("Unauthorized: This lap belongs to another user");
      let telemetryPoints: TelemetryPoint[] = [];
      if (data.telemetryPoints && Array.isArray(data.telemetryPoints)) {
        telemetryPoints = data.telemetryPoints as TelemetryPoint[];
      } else {
        telemetryPoints = await loadTelemetryChunks(null, input.lapId, userId);
      }
      return {
        id: docSnap.id,
        lapTime: data.lapTime as string,
        date: data.date as string,
        car: data.car as string,
        track: data.track as string,
        conditions: data.conditions as string,
        avgSpeed: data.avgSpeed as number,
        maxSpeed: data.maxSpeed as number,
        totalDataPoints: (data.totalDataPoints as number) ?? telemetryPoints.length,
        chunkCount: (data.chunkCount as number) ?? 0,
        telemetryPoints,
        sectorTimes: data.sectorTimes as { sector1: number; sector2: number; sector3: number },
        createdAt: data.createdAt instanceof WebTimestamp ? data.createdAt.toDate() : (data.createdAt as Date),
      } satisfies LapData;
    }),

  // Get all laps for the current user (without full telemetry data for performance)
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const adminDb = tryGetAdminDb();
      
      if (adminDb) {
        const q = await adminDb
          .collection("laps")
          .where("userId", "==", userId)
          .orderBy("createdAt", "desc")
          .get();
        return q.docs.map(d => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            lapTime: data.lapTime as string,
            date: data.date as string,
            car: data.car as string,
            track: data.track as string,
            conditions: data.conditions as string,
            avgSpeed: data.avgSpeed as number,
            maxSpeed: data.maxSpeed as number,
            totalDataPoints: (data.totalDataPoints as number) ?? 0,
            chunkCount: (data.chunkCount as number) ?? 0,
            telemetryPoints: [],
            sectorTimes: data.sectorTimes as { sector1: number; sector2: number; sector3: number },
            createdAt: (data.createdAt as AdminTimestamp).toDate(),
          } satisfies LapData;
        });
      }
      
      const q = webQuery(
        webCollection(webDb, "laps"), 
        webWhere("userId", "==", userId),
        webOrderBy("createdAt", "desc")
      );
      const querySnapshot = await webGetDocs(q);
      return querySnapshot.docs.map(d => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          lapTime: data.lapTime as string,
          date: data.date as string,
          car: data.car as string,
          track: data.track as string,
          conditions: data.conditions as string,
          avgSpeed: data.avgSpeed as number,
          maxSpeed: data.maxSpeed as number,
          totalDataPoints: (data.totalDataPoints as number) ?? 0,
          chunkCount: (data.chunkCount as number) ?? 0,
          telemetryPoints: [],
          sectorTimes: data.sectorTimes as { sector1: number; sector2: number; sector3: number },
          createdAt: data.createdAt instanceof WebTimestamp ? data.createdAt.toDate() : (data.createdAt as Date),
        } satisfies LapData;
      });
    }),

  // Delete a lap and all its telemetry chunks (only if user owns it)
  delete: protectedProcedure
    .input(getLapSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const adminDb = tryGetAdminDb();
      
      if (adminDb) {
        const docRef = adminDb.collection("laps").doc(input.lapId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) throw new Error("Lap not found");
        const data = docSnap.data() as any;
        if (data.userId && data.userId !== userId) throw new Error("Unauthorized: This lap belongs to another user");
        const chunksQ = await adminDb
          .collection("telemetryChunks")
          .where("lapId", "==", input.lapId)
          .where("userId", "==", userId)
          .get();
        await Promise.all(chunksQ.docs.map(d => d.ref.delete()));
        await docRef.delete();
        return { success: true };
      }
      
      const docSnap = await webGetDoc(webDoc(webDb, "laps", input.lapId));
      if (!docSnap.exists()) throw new Error("Lap not found");
      const data = docSnap.data() as any;
      if (data.userId && data.userId !== userId) throw new Error("Unauthorized: This lap belongs to another user");
      const chunksQuery = webQuery(
        webCollection(webDb, "telemetryChunks"),
        webWhere("lapId", "==", input.lapId),
        webWhere("userId", "==", userId)
      );
      const chunksSnapshot = await webGetDocs(chunksQuery);
      await Promise.all(chunksSnapshot.docs.map(d => webDeleteDoc(d.ref)));
      await webDeleteDoc(webDoc(webDb, "laps", input.lapId));
      return { success: true };
    }),
}); 
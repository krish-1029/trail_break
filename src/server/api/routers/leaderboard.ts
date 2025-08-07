import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { PrismaClient } from "@prisma/client";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  documentId ,
  getDoc,
  doc,
  orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { z } from "zod";

const prisma = new PrismaClient();

export const leaderboardRouter = createTRPCRouter({
  getFeaturedLaps: publicProcedure.query(async () => {
    try {
      // Get all users with their featured lap IDs
      const usersWithFeaturedLaps = await prisma.user.findMany({
        where: {
          featuredLapIds: {
            isEmpty: false,
          },
        },
        select: {
          id: true,
          name: true,
          username: true,
          featuredLapIds: true,
        },
      });

      // Collect all featured lap IDs
      const allFeaturedLapIds = usersWithFeaturedLaps.flatMap((user: { featuredLapIds: string[] }) => user.featuredLapIds);

      if (allFeaturedLapIds.length === 0) {
        return [];
      }

      // Firestore limits `in` to 10 items. Batch into chunks of 10.
      const idChunks: string[][] = [];
      for (let i = 0; i < allFeaturedLapIds.length; i += 10) {
        idChunks.push(allFeaturedLapIds.slice(i, i + 10));
      }

      const lapsCollection = collection(db, "laps");
      const featuredLaps: Array<{
        id: string;
        lapTime: string;
        car: string;
        track: string;
        conditions: string;
        avgSpeed: number;
        maxSpeed: number;
        sectorTimes: Record<string, number>;
        totalDataPoints: number;
        createdAt: Date;
        userName: string;
        userDisplayName: string;
      }> = [];

      for (const chunk of idChunks) {
        const q = query(lapsCollection, where(documentId(), "in", chunk));
        const snapshot = await getDocs(q);

        for (const lapDoc of snapshot.docs) {
          const lapData = lapDoc.data() as Record<string, unknown>;

          // Find the user who owns this lap based on featured list membership
          const lapOwner = usersWithFeaturedLaps.find((user: { featuredLapIds: string[]; name?: string | null; username?: string | null }) =>
            user.featuredLapIds.includes(lapDoc.id)
          );

          featuredLaps.push({
            id: lapDoc.id,
            lapTime: (lapData.lapTime as string) ?? "",
            car: (lapData.car as string) ?? "Unknown",
            track: (lapData.track as string) ?? "Unknown",
            conditions: (lapData.conditions as string) ?? "",
            avgSpeed: (lapData.avgSpeed as number) ?? 0,
            maxSpeed: (lapData.maxSpeed as number) ?? 0,
            sectorTimes: (lapData.sectorTimes as Record<string, number>) ?? { sector1: 0, sector2: 0, sector3: 0 },
            totalDataPoints: (lapData.totalDataPoints as number) ?? 0,
            createdAt: lapData.createdAt instanceof Timestamp
              ? lapData.createdAt.toDate()
              : new Date((lapData.createdAt as string) ?? Date.now()),
            userName: (lapOwner?.name ?? lapOwner?.username ?? "Unknown User") as string,
            userDisplayName: (lapOwner?.username ?? lapOwner?.name ?? "Unknown User") as string,
          });
        }
      }

      // Sort by lap time (fastest first)
      featuredLaps.sort((a, b) => {
        const parseTime = (timeStr: string) => {
          const [minutes, seconds] = timeStr.split(":");
          return parseFloat(minutes ?? "0") * 60 + parseFloat(seconds ?? "0");
        };
        return parseTime(a.lapTime) - parseTime(b.lapTime);
      });

      return featuredLaps;
    } catch (error) {
      console.error("Error fetching featured laps:", error);
      return [];
    }
  }),

  // Publicly get a single featured lap with full telemetry
  getLapPublic: publicProcedure
    .input(z.object({ lapId: z.string() }))
    .query(async ({ input }) => {
      // Verify lap is featured by some user
      const owner = await prisma.user.findFirst({
        where: { featuredLapIds: { has: input.lapId } },
        select: { id: true, name: true, username: true },
      });
      if (!owner) {
        throw new Error("Lap is not public");
      }

      // Fetch lap metadata
      const lapSnap = await getDoc(doc(db, "laps", input.lapId));
      if (!lapSnap.exists()) throw new Error("Lap not found");
      const data = lapSnap.data() as Record<string, any>;

      // Load chunks using the lap's owner userId and lapId
      const chunksQ = query(
        collection(db, "telemetryChunks"),
        where("lapId", "==", input.lapId),
        where("userId", "==", data.userId),
        orderBy("chunkIndex", "asc")
      );
      const chunksSnap = await getDocs(chunksQ);
      const points: any[] = [];
      chunksSnap.docs.forEach(d => {
        const c = d.data() as any;
        if (Array.isArray(c.points)) points.push(...c.points);
      });

      return {
        id: lapSnap.id,
        lapTime: data.lapTime as string,
        date: data.date as string,
        car: data.car as string,
        track: data.track as string,
        conditions: data.conditions as string,
        avgSpeed: data.avgSpeed as number,
        maxSpeed: data.maxSpeed as number,
        totalDataPoints: (data.totalDataPoints as number) ?? points.length,
        chunkCount: (data.chunkCount as number) ?? 0,
        telemetryPoints: points,
        sectorTimes: data.sectorTimes as { sector1: number; sector2: number; sector3: number },
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
        ownerName: owner.name ?? owner.username ?? "Unknown",
        ownerUsername: owner.username ?? owner.name ?? "Unknown",
      };
    }),
}); 
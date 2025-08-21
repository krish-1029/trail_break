import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { prisma } from "@/server/db";
import { tryGetAdminDb } from "@/server/firebase-admin";
import { db as webDb } from "@/lib/firebase";
import { 
	collection as webCollection, 
	query as webQuery, 
	where as webWhere, 
	getDocs as webGetDocs, 
	Timestamp as WebTimestamp,
	orderBy as webOrderBy
} from "firebase/firestore";
import { z } from "zod";
import { Timestamp as AdminTimestamp } from "firebase-admin/firestore";

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

			const allFeaturedLapIds = usersWithFeaturedLaps.flatMap((u) => u.featuredLapIds);
			if (allFeaturedLapIds.length === 0) return [];

			const adminDb = tryGetAdminDb();
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

			if (adminDb) {
				// Fetch each lap by ID (Admin SDK)
				await Promise.all(
					allFeaturedLapIds.map(async (lapId) => {
						const snap = await adminDb.collection("laps").doc(lapId).get();
						if (!snap.exists) return;
						const lapData = snap.data() as Record<string, unknown>;
						const lapOwner = usersWithFeaturedLaps.find((u) => u.featuredLapIds.includes(lapId));
						featuredLaps.push({
							id: lapId,
							lapTime: (lapData.lapTime as string) ?? "",
							car: (lapData.car as string) ?? "Unknown",
							track: (lapData.track as string) ?? "Unknown",
							conditions: (lapData.conditions as string) ?? "",
							avgSpeed: (lapData.avgSpeed as number) ?? 0,
							maxSpeed: (lapData.maxSpeed as number) ?? 0,
							sectorTimes: (lapData.sectorTimes as Record<string, number>) ?? { sector1: 0, sector2: 0, sector3: 0 },
							totalDataPoints: (lapData.totalDataPoints as number) ?? 0,
							createdAt: (lapData.createdAt as AdminTimestamp)?.toDate?.() ?? new Date(),
							userName: (lapOwner?.name ?? lapOwner?.username ?? "Unknown User") as string,
							userDisplayName: (lapOwner?.username ?? lapOwner?.name ?? "Unknown User") as string,
						});
					})
				);
			} else {
				// Web SDK fallback: we cannot query by documentId(), so fetch in batches by reading each id
				await Promise.all(
					allFeaturedLapIds.map(async (lapId) => {
						const snap = await webGetDocs(webQuery(webCollection(webDb, "laps"), webWhere("__name__", "==", lapId)));
						const doc = snap.docs[0];
						if (!doc) return;
						const lapData = doc.data() as Record<string, unknown>;
						const lapOwner = usersWithFeaturedLaps.find((u) => u.featuredLapIds.includes(lapId));
						featuredLaps.push({
							id: lapId,
							lapTime: (lapData.lapTime as string) ?? "",
							car: (lapData.car as string) ?? "Unknown",
							track: (lapData.track as string) ?? "Unknown",
							conditions: (lapData.conditions as string) ?? "",
							avgSpeed: (lapData.avgSpeed as number) ?? 0,
							maxSpeed: (lapData.maxSpeed as number) ?? 0,
							sectorTimes: (lapData.sectorTimes as Record<string, number>) ?? { sector1: 0, sector2: 0, sector3: 0 },
							totalDataPoints: (lapData.totalDataPoints as number) ?? 0,
							createdAt: (lapData.createdAt as WebTimestamp)?.toDate?.() ?? new Date(),
							userName: (lapOwner?.name ?? lapOwner?.username ?? "Unknown User") as string,
							userDisplayName: (lapOwner?.username ?? lapOwner?.name ?? "Unknown User") as string,
						});
					})
				);
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
			if (!owner) throw new Error("Lap is not public");

			const adminDb = tryGetAdminDb();
			if (adminDb) {
				const lapSnap = await adminDb.collection("laps").doc(input.lapId).get();
				if (!lapSnap.exists) throw new Error("Lap not found");
				const data = lapSnap.data() as Record<string, any>;
				const chunksQ = await adminDb
					.collection("telemetryChunks")
					.where("lapId", "==", input.lapId)
					.where("userId", "==", data.userId)
					.orderBy("chunkIndex", "asc")
					.get();
				const points: any[] = [];
				chunksQ.docs.forEach(d => {
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
					createdAt: (data.createdAt as AdminTimestamp)?.toDate?.() ?? new Date(data.createdAt),
					ownerName: owner.name ?? owner.username ?? "Unknown",
					ownerUsername: owner.username ?? owner.name ?? "Unknown",
				};
			}

			// Web SDK fallback
			const lapSnap = await webGetDocs(webQuery(webCollection(webDb, "laps"), webWhere("__name__", "==", input.lapId)));
			const d = lapSnap.docs[0];
			if (!d) throw new Error("Lap not found");
			const data = d.data() as Record<string, any>;
			const chunksQ = webQuery(
				webCollection(webDb, "telemetryChunks"),
				webWhere("lapId", "==", input.lapId),
				webWhere("userId", "==", data.userId),
				webOrderBy("chunkIndex", "asc")
			);
			const chunksSnap = await webGetDocs(chunksQ);
			const points: any[] = [];
			chunksSnap.docs.forEach(doc => {
				const c = doc.data() as any;
				if (Array.isArray(c.points)) points.push(...c.points);
			});
			return {
				id: d.id,
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
				createdAt: (data.createdAt as WebTimestamp)?.toDate?.() ?? new Date(data.createdAt),
				ownerName: owner.name ?? owner.username ?? "Unknown",
				ownerUsername: owner.username ?? owner.name ?? "Unknown",
			};
		}),
}); 
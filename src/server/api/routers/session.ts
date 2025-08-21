import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { Session as UserSession } from "@/types/telemetry";
import { tryGetAdminDb } from "@/server/firebase-admin";
import { db as webDb } from "@/lib/firebase";
import { Timestamp as AdminTimestamp } from "firebase-admin/firestore";
import { collection, addDoc, doc, getDoc, getDocs, query, where, deleteDoc, Timestamp as WebTimestamp } from "firebase/firestore";

// Firestore representation (admin Timestamp)
type FirestoreSessionAdmin = Omit<UserSession, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt: AdminTimestamp;
  updatedAt: AdminTimestamp;
};

export const sessionRouter = createTRPCRouter({
  // Create a new racing session (authenticated user only)
  create: protectedProcedure
    .input(z.object({ track: z.string(), car: z.string(), conditions: z.string().default("Dry") }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const adminDb = tryGetAdminDb();

      if (adminDb) {
        const sessionData: FirestoreSessionAdmin = {
          userId,
          date: new Date().toISOString().split('T')[0]!,
          track: input.track,
          car: input.car,
          conditions: input.conditions,
          laps: [],
          createdAt: AdminTimestamp.now(),
          updatedAt: AdminTimestamp.now(),
        };
        const docRef = await adminDb.collection("sessions").add(sessionData);
        return {
          id: docRef.id,
          ...sessionData,
          createdAt: sessionData.createdAt.toDate(),
          updatedAt: sessionData.updatedAt.toDate(),
        } satisfies UserSession;
      }

      const sessionData = {
        userId,
        date: new Date().toISOString().split('T')[0]!,
        track: input.track,
        car: input.car,
        conditions: input.conditions,
        laps: [],
        createdAt: WebTimestamp.now(),
        updatedAt: WebTimestamp.now(),
      };
      const docRef = await addDoc(collection(webDb, "sessions"), sessionData);
      return {
        id: docRef.id,
        ...sessionData,
        createdAt: sessionData.createdAt.toDate(),
        updatedAt: sessionData.updatedAt.toDate(),
      } satisfies UserSession;
    }),

  // Get a specific session by ID (must belong to current user)
  getById: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const adminDb = tryGetAdminDb();

      if (adminDb) {
        const docSnap = await adminDb.collection("sessions").doc(input.sessionId).get();
        if (!docSnap.exists) throw new Error("Session not found");
        const data = docSnap.data() as FirestoreSessionAdmin;
        if (data.userId !== userId) throw new Error("Unauthorized");
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } satisfies UserSession;
      }

      const docSnap = await getDoc(doc(webDb, "sessions", input.sessionId));
      if (!docSnap.exists()) throw new Error("Session not found");
      const data = docSnap.data() as any;
      if (data.userId !== userId) throw new Error("Unauthorized");
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt.toDate?.() ?? data.createdAt,
        updatedAt: data.updatedAt.toDate?.() ?? data.updatedAt,
      } satisfies UserSession;
    }),

  // Get all sessions for current user
  getMine: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const adminDb = tryGetAdminDb();

      if (adminDb) {
        const q = await adminDb.collection("sessions").where("userId", "==", userId).get();
        return q.docs.map(doc => {
          const data = doc.data() as FirestoreSessionAdmin;
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          } satisfies UserSession;
        });
      }

      const q = query(collection(webDb, "sessions"), where("userId", "==", userId));
      const qs = await getDocs(q);
      return qs.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate?.() ?? data.createdAt,
          updatedAt: data.updatedAt.toDate?.() ?? data.updatedAt,
        } satisfies UserSession;
      });
    }),

  // Delete a session (must belong to current user)
  delete: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const adminDb = tryGetAdminDb();

      if (adminDb) {
        const docRef = adminDb.collection("sessions").doc(input.sessionId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) throw new Error("Session not found");
        const data = docSnap.data() as FirestoreSessionAdmin;
        if (data.userId !== userId) throw new Error("Unauthorized");
        await docRef.delete();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } satisfies UserSession;
      }

      const docRef = doc(webDb, "sessions", input.sessionId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error("Session not found");
      const data = docSnap.data() as any;
      if (data.userId !== userId) throw new Error("Unauthorized");
      await deleteDoc(docRef);
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt.toDate?.() ?? data.createdAt,
        updatedAt: data.updatedAt.toDate?.() ?? data.updatedAt,
      } satisfies UserSession;
    }),
}); 
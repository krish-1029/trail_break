import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import type { Session } from "@/types/telemetry";
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
  Timestamp 
} from "firebase/firestore";

// Zod schemas for validation
const createSessionSchema = z.object({
  userId: z.string(),
  track: z.string(),
  car: z.string(),
  conditions: z.string().default("Dry"),
});

const getSessionSchema = z.object({
  sessionId: z.string(),
});

const getUserSessionsSchema = z.object({
  userId: z.string(),
});

export const sessionRouter = createTRPCRouter({
  // Create a new racing session
  create: publicProcedure
    .input(createSessionSchema)
    .mutation(async ({ input }) => {
      const sessionData = {
        userId: input.userId,
        date: new Date().toISOString().split('T')[0]!,
        track: input.track,
        car: input.car,
        conditions: input.conditions,
        laps: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      const docRef = await addDoc(collection(db, "sessions"), sessionData);
      return {
        id: docRef.id,
        ...sessionData,
        createdAt: sessionData.createdAt.toDate(),
        updatedAt: sessionData.updatedAt.toDate(),
      };
    }),

  // Get a specific session by ID
  getById: publicProcedure
    .input(getSessionSchema)
    .query(async ({ input }) => {
      const docSnap = await getDoc(doc(db, "sessions", input.sessionId));
      if (!docSnap.exists()) {
        throw new Error("Session not found");
      }
      const data = docSnap.data() as Omit<Session, 'id'>;
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
      };
    }),

  // Get all sessions for a user
  getByUser: publicProcedure
    .input(getUserSessionsSchema)
    .query(async ({ input }) => {
      const q = query(collection(db, "sessions"), where("userId", "==", input.userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data() as Omit<Session, 'id'>;
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
        };
      });
    }),

  // Get all sessions (for demo purposes)
  getAll: publicProcedure.query(async () => {
    const querySnapshot = await getDocs(collection(db, "sessions"));
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as Omit<Session, 'id'>;
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
      };
    });
  }),

  // Delete a session
  delete: publicProcedure
    .input(getSessionSchema)
    .mutation(async ({ input }) => {
      const docRef = doc(db, "sessions", input.sessionId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error("Session not found");
      }
      await deleteDoc(docRef);
      const data = docSnap.data() as Omit<Session, 'id'>;
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
      };
    }),
}); 
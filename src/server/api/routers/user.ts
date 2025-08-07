import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        featuredLapIds: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }),

  updateUsername: protectedProcedure
    .input(z.object({
      username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, {
        message: "Username can only contain letters, numbers, and underscores"
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if username is already taken
      const existingUser = await prisma.user.findUnique({
        where: { username: input.username },
      });

      if (existingUser && existingUser.id !== ctx.session.user.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username is already taken",
        });
      }

      // Update the username
      const updatedUser = await prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { username: input.username },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    }),

  updateFeaturedLaps: protectedProcedure
    .input(z.object({
      lapIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update user's featured laps
      await prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { featuredLapIds: input.lapIds },
      });

      return { success: true };
    }),
}); 
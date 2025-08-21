import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db";
import { hash } from "bcrypt";

const registerAttempts = new Map<string, { count: number; resetAt: number }>();
function rateLimit(key: string, limit: number, windowMs: number) {
	const now = Date.now();
	const entry = registerAttempts.get(key);
	if (!entry || entry.resetAt < now) {
		registerAttempts.set(key, { count: 1, resetAt: now + windowMs });
		return true;
	}
	if (entry.count >= limit) return false;
	entry.count += 1;
	return true;
}

export const userRouter = createTRPCRouter({
	register: publicProcedure
		.input(z.object({
			name: z.string().min(1),
			email: z.string().email(),
			password: z.string().min(8),
		}))
		.mutation(async ({ input, ctx }) => {
			// Simple IP rate limit: 10 attempts / 10 minutes per IP
			const ip = ctx.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
			const ok = rateLimit(`register:${ip}`, 10, 10 * 60 * 1000);
			if (!ok) {
				throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please try again later." });
			}

			const existing = await prisma.user.findUnique({ where: { email: input.email } });
			if (existing) {
				throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });
			}
			const passwordHash = await hash(input.password, 12);
			const user = await prisma.user.create({
				data: { name: input.name, email: input.email, password: passwordHash },
				select: { id: true, name: true, email: true },
			});
			return { user };
		}),

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
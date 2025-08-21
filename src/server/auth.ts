import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import { prisma } from "@/server/db";

export const authOptions = {
	adapter: PrismaAdapter(prisma),
	providers: [
		CredentialsProvider({
			name: "Credentials",
			credentials: {
				email: { label: "Email", type: "text" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) {
					return null;
				}

				const user = await prisma.user.findFirst({
					where: {
						OR: [
							{ email: credentials.email },
							{ username: credentials.email },
						],
					},
				});

				if (!user?.password) {
					return null;
				}

				const isValid = await compare(credentials.password, user.password);
				return isValid ? user : null;
			},
		}),
	],
	secret: process.env.NEXTAUTH_SECRET,
	session: {
		strategy: "jwt",
	},
	pages: {
		signIn: "/auth/signin",
	},
	callbacks: {
		session: ({ session, token }: any) => ({
			...session,
			user: {
				...session.user,
				id: token.sub,
			},
		}),
		jwt: ({ token, user }: any) => {
			if (user) {
				token.sub = (user as any).id;
			}
			return token;
		},
	},
} as any; 
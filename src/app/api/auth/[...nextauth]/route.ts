import NextAuth from "next-auth";
import { authOptions } from "@/server/auth";

const handler = (NextAuth as any)(authOptions as any);

export { handler as GET, handler as POST }; 
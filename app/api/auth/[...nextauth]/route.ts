// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Next.js App Router ต้อง export เฉพาะ HTTP handlers เท่านั้น
export const GET = NextAuth(authOptions);
export const POST = NextAuth(authOptions);

// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// ขยาย type ของ global ให้มี property prisma
type CustomGlobal = typeof global & {
  prisma?: PrismaClient;
};

const globalWithPrisma = global as CustomGlobal;

// สร้างหรือ reuse instance
export const prisma =
  globalWithPrisma.prisma ??
  new PrismaClient({
    log: ["query"],
  });

// ใน dev mode ให้เก็บ instance ไว้ใน global ไม่สร้างซ้ำเวลารันใหม่
if (process.env.NODE_ENV !== "production") {
  globalWithPrisma.prisma = prisma;
}

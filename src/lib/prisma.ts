import { PrismaClient } from "@prisma/client";

// Voorkomt te veel Prisma-instanties tijdens hot-reload in ontwikkeling
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

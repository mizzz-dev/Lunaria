import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  lunariaPrisma?: PrismaClient;
};

export function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}

export const prisma =
  globalForPrisma.lunariaPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.lunariaPrisma = prisma;
}

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  lifePrisma?: PrismaClient;
  lifePrismaConnectionString?: string;
};

function createPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString, max: 10, connectionTimeoutMillis: 5_000 });
  return new PrismaClient({ adapter });
}

export function getPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required for database operations.");

  if (globalForPrisma.lifePrisma && globalForPrisma.lifePrismaConnectionString !== connectionString) {
    const staleClient = globalForPrisma.lifePrisma;
    globalForPrisma.lifePrisma = undefined;
    globalForPrisma.lifePrismaConnectionString = undefined;
    void staleClient.$disconnect().catch((error: unknown) => {
      console.error("Previous Prisma client could not be disconnected after DATABASE_URL changed.", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
    });
  }

  globalForPrisma.lifePrisma ??= createPrismaClient(connectionString);
  globalForPrisma.lifePrismaConnectionString = connectionString;
  return globalForPrisma.lifePrisma;
}

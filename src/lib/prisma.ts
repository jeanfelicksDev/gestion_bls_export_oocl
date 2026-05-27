import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { logger } from "./logger";

declare global {
  var prismaGlobal: {
    prisma: PrismaClient | undefined;
    pool: pg.Pool | undefined;
  };
}

const globalForPrisma = globalThis as unknown as {
  prismaGlobal?: typeof global.prismaGlobal;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Ensure global object exists
if (!globalForPrisma.prismaGlobal) {
  globalForPrisma.prismaGlobal = {
    prisma: undefined,
    pool: undefined,
  };
}

if (!globalForPrisma.prismaGlobal.pool) {
  logger.info("PRISMA", "Creating new database connection pool");

  globalForPrisma.prismaGlobal.pool = new pg.Pool({
    connectionString,
    max: 20, // Increased from 10 to support more concurrent connections
    min: 2, // Minimum connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000, // Increased from 2000
    application_name: "gestion_bls_export_oocl",
  });

  // Log pool events in development
  if (process.env.NODE_ENV === "development") {
    globalForPrisma.prismaGlobal.pool.on("error", (err) => {
      logger.error("PRISMA", "Pool error", err);
    });

    globalForPrisma.prismaGlobal.pool.on("connect", () => {
      logger.debug("PRISMA", "Pool connection established");
    });
  }
}

const adapter = new PrismaPg(globalForPrisma.prismaGlobal.pool);

export const prisma =
  globalForPrisma.prismaGlobal.prisma ||
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? [
            {
              emit: "event",
              level: "query",
            },
            {
              emit: "stdout",
              level: "error",
            },
            {
              emit: "stdout",
              level: "warn",
            },
          ]
        : [
            {
              emit: "stdout",
              level: "error",
            },
          ],
  });

// Log queries in development
if (process.env.NODE_ENV === "development") {
  (prisma as any).$on("query", (e: any) => {
    logger.debug("PRISMA", `Query took ${e.duration}ms`, {
      query: e.query,
      params: e.params,
    });
  });
}

// Ensure singleton pattern in development
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaGlobal!.prisma = prisma;
}

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("PRISMA", "Shutting down database connection pool");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("PRISMA", "Shutting down database connection pool");
  await prisma.$disconnect();
  process.exit(0);
});



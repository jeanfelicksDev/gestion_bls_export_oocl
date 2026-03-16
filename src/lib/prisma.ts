import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma: any };

const dbPath = path.resolve(process.cwd(), "dev.db");
// Prisma 7 SQLite adapter expects the URL in the config object
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
// Forced reload for schema sync

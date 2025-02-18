import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query", "info", "warn", "error"], // ✅ Enable Prisma logs
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ✅ Ensure logs are visible on startup
(async () => {
  console.log("🔄 Testing Prisma database connection...");

  try {
    await prisma.$connect();
    console.log("✅ Prisma database connected successfully!");
  } catch (error) {
    console.error("❌ Prisma database connection failed:", error);
  }
})();

export default prisma;
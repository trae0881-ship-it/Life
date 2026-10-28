import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile();
} catch {
  // Railway injects variables directly; local development may not have a .env file.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});

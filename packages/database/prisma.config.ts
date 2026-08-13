import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

// Prisma commands can be run from this package or the monorepo root. Always load
// the root environment file so DATABASE_URL is available in either case.
const packageDirectory = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(packageDirectory, "../../.env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});

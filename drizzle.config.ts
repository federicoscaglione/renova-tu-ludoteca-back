import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "./src/db/schema/game_catalog.ts",
    "./src/db/schema/games.ts",
    "./src/db/schema/offers.ts",
    "./src/db/schema/meetups.ts",
    "./src/db/schema/participants.ts",
    "./src/db/schema/users.ts",
    "./src/db/schema/invitations.ts",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/renova",
  },
});

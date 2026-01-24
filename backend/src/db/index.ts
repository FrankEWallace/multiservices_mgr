import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";
import { mkdirSync, existsSync } from "fs";

const dbPath = "./data/meilleur.db";

// Ensure data directory exists
if (!existsSync("./data")) {
  mkdirSync("./data", { recursive: true });
}

// Create libsql client
const client = createClient({
  url: `file:${dbPath}`,
});

// Create Drizzle instance with schema
export const db = drizzle(client, { schema });

export default db;

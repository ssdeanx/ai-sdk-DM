/**
 * Script to update models table and seed default models
 */
import { getSupabaseClient } from "@/lib/memory/supabase";
import { seedDefaultModels } from "@/lib/services/model-service";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  try {
    console.log("Updating models table and seeding default models...");
    
    // Run migration
    console.log("Running migration...");
    const connectionString = process.env.SUPABASE_CONNECTION_STRING;
    
    if (!connectionString) {
      throw new Error("SUPABASE_CONNECTION_STRING is not defined");
    }
    
    const sql = postgres(connectionString, { max: 1 });
    const db = drizzle(sql);
    
    await migrate(db, { migrationsFolder: "drizzle/migrations/supabase" });
    
    console.log("Migration completed successfully");
    
    // Seed default models
    console.log("Seeding default models...");
    const count = await seedDefaultModels();
    
    console.log(`Seeded ${count} models successfully`);
    
    console.log("Done!");
    process.exit(0);
  } catch (error) {
    console.error("Error updating models:", error);
    process.exit(1);
  }
}

main();

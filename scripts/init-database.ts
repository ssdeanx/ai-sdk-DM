import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import { createClient as createLibSQLClient } from "@libsql/client"
import { initVectorStore } from "../lib/memory/vector-store"

dotenv.config()

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Initialize LibSQL client
const libsqlUrl = process.env.LIBSQL_DATABASE_URL
const libsqlToken = process.env.LIBSQL_AUTH_TOKEN

if (!libsqlUrl) {
  console.error("Missing LibSQL environment variables")
  process.exit(1)
}

const libsql = createLibSQLClient({
  url: libsqlUrl,
  authToken: libsqlToken,
})

// Supabase schema
async function initSupabaseSchema() {
  console.log("Initializing Supabase schema...")

  try {
    // Create models table
    const { error: modelsError } = await supabase.rpc("create_models_table")
    if (modelsError) throw modelsError

    // Create tools table
    const { error: toolsError } = await supabase.rpc("create_tools_table")
    if (toolsError) throw toolsError

    // Create agents table
    const { error: agentsError } = await supabase.rpc("create_agents_table")
    if (agentsError) throw agentsError

    // Create agent_tools junction table
    const { error: agentToolsError } = await supabase.rpc("create_agent_tools_table")
    if (agentToolsError) throw agentToolsError

    // Create settings table
    const { error: settingsError } = await supabase.rpc("create_settings_table")
    if (settingsError) throw settingsError

    console.log("Supabase schema initialized successfully")
  } catch (error) {
    console.error("Error initializing Supabase schema:", error)
  }
}

// LibSQL schema for agent memory
async function initLibSQLSchema() {
  console.log("Initializing LibSQL schema...")

  try {
    // Create memory_threads table
    await libsql.execute(`
      CREATE TABLE IF NOT EXISTS memory_threads (
        id TEXT PRIMARY KEY,
        agent_id TEXT,
        name TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `)

    // Create messages table
    await libsql.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        thread_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        name TEXT,
        tool_call_id TEXT,
        created_at TEXT NOT NULL,
        embedding BLOB,
        token_count INTEGER,
        FOREIGN KEY (thread_id) REFERENCES memory_threads(id)
      )
    `)

    // Create agent_state table
    await libsql.execute(`
      CREATE TABLE IF NOT EXISTS agent_state (
        thread_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        state TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (thread_id, agent_id),
        FOREIGN KEY (thread_id) REFERENCES memory_threads(id)
      )
    `)

    // Create embeddings table
    await libsql.execute(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id TEXT PRIMARY KEY,
        vector BLOB NOT NULL,
        model TEXT NOT NULL,
        dimensions INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    console.log("LibSQL schema initialized successfully")

    // Initialize vector index for embeddings
    await initVectorStore()
  } catch (error) {
    console.error("Error initializing LibSQL schema:", error)
  }
}

// Seed data
async function seedData() {
  console.log("Seeding data...")

  try {
    // Seed models
    const { error: modelError } = await supabase.from("models").upsert([
      {
        id: "google-gemini-pro",
        name: "Google Gemini Pro",
        provider: "google",
        model_id: "gemini-pro",
        status: "active",
      },
      {
        id: "google-gemini-pro-vision",
        name: "Google Gemini Pro Vision",
        provider: "google",
        model_id: "gemini-pro-vision",
        status: "active",
      },
    ])

    if (modelError) throw modelError

    // Seed tools
    const { error: toolError } = await supabase.from("tools").upsert([
      {
        id: "web-search",
        name: "web_search",
        description: "Search the web for information",
        parameters_schema: JSON.stringify({
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query",
            },
          },
          required: ["query"],
        }),
      },
      {
        id: "calculator",
        name: "calculator",
        description: "Perform mathematical calculations",
        parameters_schema: JSON.stringify({
          type: "object",
          properties: {
            expression: {
              type: "string",
              description: "The mathematical expression to evaluate",
            },
          },
          required: ["expression"],
        }),
      },
    ])

    if (toolError) throw toolError

    // Seed agents
    const { error: agentError } = await supabase.from("agents").upsert([
      {
        id: "research-assistant",
        name: "Research Assistant",
        description: "An AI assistant that helps with research tasks",
        model_id: "google-gemini-pro",
        system_prompt:
          "You are a research assistant. Your goal is to provide accurate and helpful information on any topic.",
        temperature: 0.7,
      },
    ])

    if (agentError) throw agentError

    // Seed agent_tools
    const { error: agentToolError } = await supabase.from("agent_tools").upsert([
      {
        agent_id: "research-assistant",
        tool_id: "web-search",
      },
      {
        agent_id: "research-assistant",
        tool_id: "calculator",
      },
    ])

    if (agentToolError) throw agentToolError

    // Seed settings
    const { error: settingsError } = await supabase.from("settings").upsert([
      {
        category: "api",
        key: "default_model_id",
        value: "google-gemini-pro",
      },
      {
        category: "appearance",
        key: "theme",
        value: "system",
      },
      {
        category: "advanced",
        key: "streaming_responses",
        value: "true",
      },
    ])

    if (settingsError) throw settingsError

    console.log("Data seeded successfully")
  } catch (error) {
    console.error("Error seeding data:", error)
  }
}

// Main function
async function main() {
  try {
    // Initialize schemas
    await initSupabaseSchema()
    await initLibSQLSchema()

    // Seed data
    await seedData()

    console.log("Database initialization completed successfully")
  } catch (error) {
    console.error("Database initialization failed:", error)
  } finally {
    process.exit()
  }
}

main()

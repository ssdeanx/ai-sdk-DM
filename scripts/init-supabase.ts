import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import { mockModels } from "../lib/mock-data/models"
import { mockTools } from "../lib/mock-data/tools"
import { mockAgents } from "../lib/mock-data/agents"
import { mockSettings } from "../lib/mock-data/settings"
import { mockBlogPosts } from "../lib/mock-data/blog-posts"
import { mockMdxDocuments } from "../lib/mock-data/mdx-documents"
import { mockNetworks } from "../lib/mock-data/networks"

// Load environment variables
dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin operations

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTables() {
  console.log("Creating tables...")

  // Create models table
  const { error: modelsError } = await supabase.rpc("create_models_table")
  if (modelsError) {
    console.error("Error creating models table:", modelsError)
  } else {
    console.log("✅ Models table created")
  }

  // Create tools table
  const { error: toolsError } = await supabase.rpc("create_tools_table")
  if (toolsError) {
    console.error("Error creating tools table:", toolsError)
  } else {
    console.log("✅ Tools table created")
  }

  // Create agents table
  const { error: agentsError } = await supabase.rpc("create_agents_table")
  if (agentsError) {
    console.error("Error creating agents table:", agentsError)
  } else {
    console.log("✅ Agents table created")
  }

  // Create settings table
  const { error: settingsError } = await supabase.rpc("create_settings_table")
  if (settingsError) {
    console.error("Error creating settings table:", settingsError)
  } else {
    console.log("✅ Settings table created")
  }

  // Create blog_posts table
  const { error: blogPostsError } = await supabase.rpc("create_blog_posts_table")
  if (blogPostsError) {
    console.error("Error creating blog_posts table:", blogPostsError)
  } else {
    console.log("✅ Blog posts table created")
  }

  // Create mdx_documents table
  const { error: mdxDocumentsError } = await supabase.rpc("create_mdx_documents_table")
  if (mdxDocumentsError) {
    console.error("Error creating mdx_documents table:", mdxDocumentsError)
  } else {
    console.log("✅ MDX documents table created")
  }

  // Create networks table
  const { error: networksError } = await supabase.rpc("create_networks_table")
  if (networksError) {
    console.error("Error creating networks table:", networksError)
  } else {
    console.log("✅ Networks table created")
  }
}

async function seedData() {
  console.log("Seeding data...")

  // Seed models
  const { error: modelsError } = await supabase.from("models").insert(mockModels)
  if (modelsError) {
    console.error("Error seeding models:", modelsError)
  } else {
    console.log("✅ Models seeded")
  }

  // Seed tools
  const { error: toolsError } = await supabase.from("tools").insert(mockTools)
  if (toolsError) {
    console.error("Error seeding tools:", toolsError)
  } else {
    console.log("✅ Tools seeded")
  }

  // Seed agents
  const { error: agentsError } = await supabase.from("agents").insert(mockAgents)
  if (agentsError) {
    console.error("Error seeding agents:", agentsError)
  } else {
    console.log("✅ Agents seeded")
  }

  // Seed settings
  const { error: settingsError } = await supabase.from("settings").insert(mockSettings)
  if (settingsError) {
    console.error("Error seeding settings:", settingsError)
  } else {
    console.log("✅ Settings seeded")
  }

  // Seed blog posts
  const { error: blogPostsError } = await supabase.from("blog_posts").insert(mockBlogPosts)
  if (blogPostsError) {
    console.error("Error seeding blog posts:", blogPostsError)
  } else {
    console.log("✅ Blog posts seeded")
  }

  // Seed MDX documents
  const { error: mdxDocumentsError } = await supabase.from("mdx_documents").insert(mockMdxDocuments)
  if (mdxDocumentsError) {
    console.error("Error seeding MDX documents:", mdxDocumentsError)
  } else {
    console.log("✅ MDX documents seeded")
  }

  // Seed networks
  const { error: networksError } = await supabase.from("networks").insert(mockNetworks)
  if (networksError) {
    console.error("Error seeding networks:", networksError)
  } else {
    console.log("✅ Networks seeded")
  }
}

async function main() {
  // Get Supabase credentials from environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "Error: Supabase credentials not found. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.",
    )
    process.exit(1)
  }

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log("Initializing Supabase database...")

  try {
    // Create models table
    console.log("Creating models table...")
    await supabase.rpc("create_models_table", {})

    // Create tools table
    console.log("Creating tools table...")
    await supabase.rpc("create_tools_table", {})

    // Create agents table
    console.log("Creating agents table...")
    await supabase.rpc("create_agents_table", {})

    // Create settings table
    console.log("Creating settings table...")
    await supabase.rpc("create_settings_table", {})

    // Create blog_posts table
    console.log("Creating blog_posts table...")
    await supabase.rpc("create_blog_posts_table", {})

    // Create mdx_documents table
    console.log("Creating mdx_documents table...")
    await supabase.rpc("create_mdx_documents_table", {})

    // Create networks table
    console.log("Creating networks table...")
    await supabase.rpc("create_networks_table", {})

    console.log("Database initialization completed successfully!")
  } catch (error) {
    console.error("Error initializing database:", error)
    process.exit(1)
  }
}

main()

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
4. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: app/api/ai-sdk
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Empty lines have been removed from all files
- Line numbers have been added to the beginning of each line
- Content has been formatted for parsing in markdown style
- Content has been compressed - code blocks are separated by ⋮---- delimiter
- Files are sorted by Git change count (files with more changes are at the bottom)

## Additional Info

# Directory Structure
```
app/api/ai-sdk/agents/[id]/route.ts
app/api/ai-sdk/agents/[id]/run/route.ts
app/api/ai-sdk/agents/route.ts
app/api/ai-sdk/apps/[id]/route.ts
app/api/ai-sdk/apps/route.ts
app/api/ai-sdk/assistant/route.ts
app/api/ai-sdk/auth/callback/admin-github/route.ts
app/api/ai-sdk/auth/callback/github/route.ts
app/api/ai-sdk/auth/signin/route.ts
app/api/ai-sdk/auth/signup/route.ts
app/api/ai-sdk/chat/route.ts
app/api/ai-sdk/code/route.ts
app/api/ai-sdk/content/route.ts
app/api/ai-sdk/crud/[table]/route.ts
app/api/ai-sdk/dashboard/route.ts
app/api/ai-sdk/files/route.ts
app/api/ai-sdk/integrations/route.ts
app/api/ai-sdk/memory/config/route.ts
app/api/ai-sdk/memory/upstash-adapter/route.ts
app/api/ai-sdk/memory/upstash-config/route.ts
app/api/ai-sdk/models/[id]/route.ts
app/api/ai-sdk/models/route.ts
app/api/ai-sdk/models/seed/route.ts
app/api/ai-sdk/observability/costs/route.ts
app/api/ai-sdk/observability/evaluations/route.ts
app/api/ai-sdk/observability/metrics/route.ts
app/api/ai-sdk/observability/performance/route.ts
app/api/ai-sdk/observability/traces/route.ts
app/api/ai-sdk/providers/route.ts
app/api/ai-sdk/settings/route.ts
app/api/ai-sdk/system/route.ts
app/api/ai-sdk/system/status/route.ts
app/api/ai-sdk/terminal/route.ts
app/api/ai-sdk/threads/[id]/messages/route.ts
app/api/ai-sdk/threads/[id]/route.ts
app/api/ai-sdk/threads/route.ts
app/api/ai-sdk/tools/execute/route.ts
app/api/ai-sdk/tools/route.ts
```

# Files

## File: app/api/ai-sdk/auth/callback/admin-github/route.ts
```typescript
import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/memory/supabase'
/**
 * Admin GitHub OAuth callback handler
 * This route is called by Supabase after an admin authenticates with GitHub
 */
export async function GET(request: Request)
⋮----
// Get the code and state from the URL
⋮----
// Create a Supabase client
⋮----
// Exchange the code for a session
⋮----
// TEMPORARY: Allow all authenticated users to access admin features
// In a real app, you would check a role or a specific claim
// For now, we'll allow any authenticated user to access admin features
// Original admin check (commented out for now)
// if (data.user.email !== 'owner@deanmachines.com') {
//   console.error('User is not an admin:', data.user.email)
//   return NextResponse.redirect(`${origin}/admin/login?error=not_admin`)
// }
// Handle successful authentication
const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
⋮----
// Local development environment
⋮----
// Production with load balancer
⋮----
// Production without load balancer
```

## File: app/api/ai-sdk/auth/callback/github/route.ts
```typescript
import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/memory/supabase'
/**
 * GitHub OAuth callback handler
 * This route is called by Supabase after a user authenticates with GitHub
 */
export async function GET(request: Request)
⋮----
// Get the code and state from the URL
⋮----
// Create a Supabase client
⋮----
// Exchange the code for a session
⋮----
// Handle successful authentication
const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
⋮----
// Local development environment
⋮----
// Production with load balancer
⋮----
// Production without load balancer
```

## File: app/api/ai-sdk/auth/signin/route.ts
```typescript
import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/memory/supabase"
// POST /api/auth/signin - Sign in a user
export async function POST(request: Request)
⋮----
// Authenticate via Supabase Auth
⋮----
// Return user and session info
```

## File: app/api/ai-sdk/auth/signup/route.ts
```typescript
import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/memory/supabase"
import { v4 as uuidv4 } from "uuid"
// POST /api/auth/signup - Register a new user
export async function POST(request: Request)
⋮----
// Attempt to sign up the user with Supabase Auth
⋮----
name: name || email.split("@")[0], // Optional: pass additional user metadata
⋮----
// Check if the error is due to the user already existing
⋮----
// Handle cases where sign up might require confirmation (email verification)
// or if user is successfully created but session is null initially.
⋮----
// This might happen if email confirmation is required.
// Adjust response as needed for your application flow.
⋮----
// Return user information upon successful sign up
```

## File: app/api/ai-sdk/code/route.ts
```typescript
// API route for CRUD operations on app_code_blocks (AppBuilder code blocks)
import { NextRequest, NextResponse } from 'next/server';
import { getLibSQLClient } from '@/lib/memory/db';
import { getMemoryProvider } from '@/lib/memory/factory';
import { handleApiError } from '@/lib/api-error-handler';
import {
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getData,
  TableRow,
  TableInsert,
  TableUpdate
} from '@/lib/memory/upstash/supabase-adapter';
⋮----
export async function GET(req: NextRequest)
export async function POST(req: NextRequest)
⋮----
// LibSQL fallback
⋮----
export async function PUT(req: NextRequest)
⋮----
// LibSQL fallback
⋮----
export async function DELETE(req: NextRequest)
⋮----
// LibSQL fallback
⋮----
// Generated on 2025-05-17: CRUD API for app_code_blocks table, cross-backend compatible, type-safe, and ready for AppBuilder code block UI integration.
```

## File: app/api/ai-sdk/content/route.ts
```typescript
// Content API route for CRUD operations
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseClient from '@/lib/memory/upstash/supabase-adapter-factory';
⋮----
export async function GET(req: NextRequest)
export async function POST(req: NextRequest)
export async function PUT(req: NextRequest)
export async function DELETE(req: NextRequest)
```

## File: app/api/ai-sdk/crud/[table]/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getData, createItem, updateItem, deleteItem, TableName } from '@/lib/memory/supabase';
// Allowed tables for CRUD
⋮----
function getTableName(param: string): TableName
export async function GET(req: NextRequest,
export async function POST(req: NextRequest,
export async function PUT(req: NextRequest,
export async function DELETE(req: NextRequest,
```

## File: app/api/ai-sdk/files/route.ts
```typescript
// filepath: app/api/ai-sdk/files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
⋮----
function safeJoin(base: string, target: string)
export async function GET(req: NextRequest)
export async function POST(req: NextRequest)
export async function PUT(req: NextRequest)
export async function DELETE(req: NextRequest)
```

## File: app/api/ai-sdk/integrations/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseClient from '@/lib/memory/upstash/supabase-adapter-factory';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
⋮----
// GET: List all integrations or get by id
export async function GET(req: NextRequest)
⋮----
// List all integrations (filter by key prefix)
⋮----
type SettingsRow = { key: string; value: string; [k: string]: unknown };
⋮----
// POST: Create a new integration
export async function POST(req: NextRequest)
// PUT: Update an integration
export async function PUT(req: NextRequest)
// DELETE: Remove an integration
export async function DELETE(req: NextRequest)
```

## File: app/api/ai-sdk/memory/config/route.ts
```typescript
import { NextResponse } from 'next/server';
import { checkUpstashAvailability } from '@/lib/memory/upstash';
import { isMemoryAvailable, getMemoryProvider } from '@/lib/memory/factory';
/**
 * GET /api/memory/config
 * 
 * Returns the current memory provider configuration
 */
export async function GET()
⋮----
// Get the configured memory provider
⋮----
// Check if Upstash adapter should be used
⋮----
// Check if memory provider is available
⋮----
// Check Upstash availability if adapter is enabled
⋮----
provider: 'libsql', // Default to LibSQL
```

## File: app/api/ai-sdk/memory/upstash-adapter/route.ts
```typescript
import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
import { checkUpstashAvailability } from '@/lib/memory/upstash';
/**
 * GET /api/memory/upstash-adapter
 * 
 * Returns information about the Upstash adapter configuration
 */
export async function GET()
⋮----
// Check if Upstash adapter is enabled
⋮----
// Check Upstash availability
⋮----
/**
 * POST /api/memory/upstash-adapter
 * 
 * Test the Upstash adapter by performing a simple operation
 */
export async function POST(request: Request)
⋮----
// Check if Upstash adapter is enabled
⋮----
// Create Supabase client with Upstash adapter
⋮----
// Perform a simple operation to test the adapter
⋮----
// Use a test table that won't affect production data
⋮----
// If the table doesn't exist, that's okay - just return success
if (error.code === '42P01') { // undefined_table
```

## File: app/api/ai-sdk/memory/upstash-config/route.ts
```typescript
import { NextResponse } from 'next/server';
/**
 * GET /api/memory/upstash-config
 * 
 * Returns the Upstash adapter configuration
 * This endpoint is safe to call from the client as it only returns
 * public URLs without tokens
 */
export async function GET()
⋮----
// Check if Upstash adapter is enabled
⋮----
// Get Upstash Redis URL (without token)
⋮----
// Get Upstash Vector URL (without token)
⋮----
// Check if QStash is configured
⋮----
// Do not include tokens in the response
```

## File: app/api/ai-sdk/observability/costs/route.ts
```typescript
import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/memory/supabase"
import { createTrace, logEvent } from "@/lib/langfuse-integration"
/**
 * API route for fetching cost estimation data for observability dashboard
 * Provides cost metrics for different AI models
 */
export async function GET(request: Request)
⋮----
// Get URL parameters
⋮----
// Create a trace for this API call
⋮----
// Log API call event
⋮----
// Get Supabase client
⋮----
// Convert time range to milliseconds
⋮----
// If modelId is provided, get specific model cost data
⋮----
// Try to connect to Supabase and get real data
⋮----
// If no cost data found, return mock data
⋮----
// Otherwise, get list of model costs
⋮----
// Try to get real cost data from Supabase
⋮----
// If no cost data found, return mock data
⋮----
// Return error response
⋮----
/**
 * Generate mock cost data for a specific model
 */
function getMockModelCost(modelId: string, timeRange: string)
⋮----
// Generate random usage data
⋮----
// Generate time series data
⋮----
// Calculate daily average and projected monthly cost
⋮----
/**
 * Generate a list of mock model costs
 */
function getMockModelCosts(timeRange: string)
⋮----
// Generate random usage data
⋮----
// Generate time series data
⋮----
// Calculate daily average and projected monthly cost
```

## File: app/api/ai-sdk/observability/evaluations/route.ts
```typescript
import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/memory/supabase"
import { createTrace, logEvent } from "@/lib/langfuse-integration"
/**
 * API route for fetching model evaluation data for observability dashboard
 * Provides evaluation metrics for different AI models
 */
export async function GET(request: Request)
⋮----
// Get URL parameters
⋮----
// Create a trace for this API call
⋮----
// Log API call event
⋮----
// Get Supabase client
⋮----
// Convert time range to milliseconds
⋮----
// If modelId is provided, get specific model evaluation
⋮----
// Try to connect to Supabase and get real data
⋮----
// If no evaluation found, return mock data
⋮----
// Otherwise, get list of model evaluations
⋮----
// Try to get real evaluations from Supabase
⋮----
// If no evaluations found, return mock data
⋮----
// Return error response
⋮----
/**
 * Generate a mock model evaluation for a specific model ID
 */
function getMockModelEvaluation(modelId: string)
⋮----
// Generate random metrics
⋮----
value: Math.random() * 0.4 + 0.6, // Between 0.6 and 1.0
⋮----
// Calculate overall score
⋮----
// Generate example evaluations
⋮----
exampleScores[metric.name] = Math.random() * 0.4 + 0.6 // Between 0.6 and 1.0
⋮----
previousScore: overallScore - (Math.random() * 0.1 - 0.05), // Slight variation from current
⋮----
/**
 * Generate a list of mock model evaluations
 */
function getMockModelEvaluations()
⋮----
// Generate random metrics
⋮----
value: Math.random() * 0.4 + 0.6, // Between 0.6 and 1.0
⋮----
// Calculate overall score
⋮----
// Generate example evaluations
⋮----
exampleScores[metric.name] = Math.random() * 0.4 + 0.6 // Between 0.6 and 1.0
⋮----
previousScore: overallScore - (Math.random() * 0.1 - 0.05), // Slight variation from current
```

## File: app/api/ai-sdk/observability/metrics/route.ts
```typescript
import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/memory/supabase"
import { createTrace, logEvent } from "@/lib/langfuse-integration"
/**
 * API route for fetching system metrics data for observability dashboard
 * Provides system health metrics like CPU usage, memory usage, etc.
 */
export async function GET(request: Request)
⋮----
// Get URL parameters
⋮----
// Create a trace for this API call
⋮----
// Log API call event
⋮----
// Get Supabase client
⋮----
// Convert time range to milliseconds
let timeInMs = 24 * 60 * 60 * 1000 // Default: 24 hours
⋮----
// Check if we can connect to Supabase
⋮----
// Generate mock data points based on time range
⋮----
// Return mock data if we can't connect to Supabase
⋮----
// If we can connect, get real metrics from the database
⋮----
// Calculate summary metrics
⋮----
// Return error response
⋮----
// Helper function to generate time series data for mock metrics
function generateTimeSeriesData(timeRange: string)
⋮----
let timeInMs = 24 * 60 * 60 * 1000 // Default: 24 hours
let dataPoints = 24 // Default: hourly data points for 24 hours
⋮----
dataPoints = 60 // Minute-by-minute for 1 hour
⋮----
dataPoints = 72 // 5-minute intervals for 6 hours
⋮----
dataPoints = 168 // Hourly for 7 days
⋮----
dataPoints = 30 // Daily for 30 days
⋮----
// Base values
⋮----
// Generate data points with realistic variations
⋮----
// Add some randomness but maintain trends
⋮----
// Add daily patterns for more realism
```

## File: app/api/ai-sdk/observability/performance/route.ts
```typescript
import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/memory/supabase"
import { createTrace, logEvent } from "@/lib/langfuse-integration"
/**
 * API route for fetching model performance data for observability dashboard
 * Provides performance metrics for different AI models like latency, tokens per second, etc.
 */
export async function GET(request: Request)
⋮----
// Get URL parameters
⋮----
// Create a trace for this API call
⋮----
// Log API call event
⋮----
// Get Supabase client
⋮----
// Convert time range to milliseconds
let timeInMs = 24 * 60 * 60 * 1000 // Default: 24 hours
⋮----
// Check if we can connect to Supabase
⋮----
// Generate mock model performance data
⋮----
// Filter by model if specified
⋮----
// Generate performance data for each model
⋮----
// Generate time series data
⋮----
// Calculate aggregated metrics
⋮----
// Return mock data
⋮----
// If we can connect, get real performance data from the database
⋮----
// Filter by model if specified
⋮----
// Process and aggregate the data by model
⋮----
// Calculate aggregated metrics for each model
⋮----
// Return error response
⋮----
// Helper function to generate time series data for mock model performance
function generateModelTimeSeriesData(timeRange: string, modelId: string)
⋮----
let timeInMs = 24 * 60 * 60 * 1000 // Default: 24 hours
let dataPoints = 24 // Default: hourly data points for 24 hours
⋮----
dataPoints = 60 // Minute-by-minute for 1 hour
⋮----
dataPoints = 72 // 5-minute intervals for 6 hours
⋮----
dataPoints = 168 // Hourly for 7 days
⋮----
dataPoints = 30 // Daily for 30 days
⋮----
// Base values - different for each model
⋮----
// Set base values based on model
⋮----
// Generate data points with realistic variations
⋮----
const dailyPattern = Math.sin(timeOffset * Math.PI * 2) * 0.2 // 20% variation based on time of day
// Calculate values with some randomness and daily patterns
```

## File: app/api/ai-sdk/observability/traces/route.ts
```typescript
import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/memory/supabase"
import { createTrace, logEvent } from "@/lib/langfuse-integration"
/**
 * API route for fetching trace data for observability dashboard
 * Supports fetching a list of traces or a single trace by ID
 */
export async function GET(request: Request)
⋮----
// Get URL parameters
⋮----
// Create a trace for this API call for meta-observability
⋮----
// Log API call event
⋮----
// Get Supabase client
⋮----
// Convert time range to milliseconds
⋮----
// If traceId is provided, get specific trace details
⋮----
// Try to connect to Supabase and get real data
⋮----
// If no trace found, return mock data
⋮----
// Otherwise, get list of traces
⋮----
// Try to get real traces from Supabase
⋮----
// If no traces found, return mock data
⋮----
// Return error response
⋮----
/**
 * Generate a detailed mock trace for a specific trace ID
 */
function getDetailedMockTrace(traceId: string)
⋮----
const startTime = now - 1000 * 60 * 5 // 5 minutes ago
const endTime = now - 1000 * 60 * 4 // 4 minutes ago
// Generate model ID and provider
⋮----
// Generate spans with realistic timing
const spanCount = Math.floor(Math.random() * 3) + 3 // 3-5 spans
⋮----
// Generate events
⋮----
// Add tool events if applicable
⋮----
// Add completion event
⋮----
/**
 * Generate metadata for a specific span type
 */
function getSpanMetadata(spanType: string, provider: string, modelId: string)
/**
 * Generate a list of mock traces
 */
function getMockTraceList(timeInMs: number)
⋮----
const traceCount = Math.floor(Math.random() * 15) + 15 // 15-30 traces
⋮----
const duration = Math.floor(Math.random() * 60000) + 1000 // 1-61 seconds
```

## File: app/api/ai-sdk/system/route.ts
```typescript
// System Metrics API route for CRUD operations
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseClient from '@/lib/memory/upstash/supabase-adapter-factory';
⋮----
export async function GET(req: NextRequest)
export async function POST(req: NextRequest)
export async function PUT(req: NextRequest)
export async function DELETE(req: NextRequest)
```

## File: app/api/ai-sdk/terminal/route.ts
```typescript
// filepath: app/api/ai-sdk/terminal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
export async function POST(req: NextRequest)
```

## File: app/api/ai-sdk/assistant/route.ts
```typescript
import { NextResponse } from "next/server";
import { AssistantResponse } from "ai";
import OpenAI from "openai";
import { createMemoryThread, saveMessage } from "@/lib/memory/memory";
import { createTrace, logEvent } from "@/lib/langfuse-integration";
import { handleApiError } from "@/lib/api-error-handler";
import { v4 as uuidv4 } from "uuid";
// Initialize OpenAI client
⋮----
export async function POST(req: Request)
⋮----
// Validate request
⋮----
// Create a trace for this assistant interaction
⋮----
// Log the user message event
⋮----
async process(
⋮----
// Create a thread if needed
⋮----
// If this is a new thread, create a memory thread for persistence
⋮----
// Save user message to memory
⋮----
// Add user message to thread
⋮----
// Send initial status
⋮----
// Run the assistant
⋮----
// Handle tool calls if needed
⋮----
// Process each tool call
⋮----
// Log tool call
⋮----
// Execute the tool (in a real implementation, you would have a tool registry)
⋮----
// Log tool result
⋮----
// Add to tool outputs
⋮----
// Submit tool outputs
⋮----
// Get the assistant's response
⋮----
// Save assistant message to memory
⋮----
// Log assistant message
⋮----
// Send completion status
⋮----
// Mock tool implementations
async function executeWeatherTool(args:
⋮----
// In a real implementation, this would call a weather API
⋮----
async function executeSearchTool(args:
⋮----
// In a real implementation, this would call a search API
```

## File: app/api/ai-sdk/dashboard/route.ts
```typescript
// Dashboard API route for CRUD operations (apps table)
import { NextRequest, NextResponse } from 'next/server';
import { getLibSQLClient } from '@/lib/memory/db';
import { getMemoryProvider } from '@/lib/memory/factory';
import { handleApiError } from '@/lib/api-error-handler';
import {
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getData,
  TableRow,
  TableInsert,
  TableUpdate
} from '@/lib/memory/upstash/supabase-adapter';
⋮----
export async function GET(req: NextRequest)
export async function POST(req: NextRequest)
⋮----
// LibSQL fallback
⋮----
export async function PUT(req: NextRequest)
⋮----
// LibSQL fallback
⋮----
export async function DELETE(req: NextRequest)
⋮----
// LibSQL fallback
⋮----
// Generated on 2025-05-17: Refactored to use type-safe generics for all CRUD operations on the 'apps' table, removing all 'any' usages.
```

## File: app/api/ai-sdk/models/[id]/route.ts
```typescript
import { NextResponse } from "next/server"
import { getItemById, updateItem, deleteItem, getDrizzleClient } from "@/lib/memory/supabase"
import type { Model } from "@/types/models"
import { handleApiError } from "@/lib/api-error-handler"
import { models } from "@/db/supabase/schema"
import { eq } from "drizzle-orm"
export async function GET(request: Request,
⋮----
// Try using Drizzle first
⋮----
// Continue to Supabase fallback
⋮----
// Fall back to Supabase client
⋮----
export async function PUT(request: Request,
⋮----
// Format the data to match schema
⋮----
// Try using Drizzle first
⋮----
// Update the model
⋮----
// Get the updated model
⋮----
// Continue to Supabase fallback
⋮----
// Fall back to Supabase client
⋮----
export async function DELETE(request: Request,
⋮----
// Try using Drizzle first
⋮----
// Delete the model
⋮----
// Continue to Supabase fallback
⋮----
// Fall back to Supabase client
```

## File: app/api/ai-sdk/models/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseClient from '@/lib/memory/upstash/supabase-adapter-factory';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
⋮----
export async function GET(req: NextRequest)
export async function POST(req: NextRequest)
export async function PUT(req: NextRequest)
export async function DELETE(req: NextRequest)
```

## File: app/api/ai-sdk/models/seed/route.ts
```typescript
import { NextResponse } from "next/server";
import { seedDefaultModels } from "@/lib/services/model-service";
import { handleApiError } from "@/lib/api-error-handler";
/**
 * Seed default models from the model registry
 * @route POST /api/models/seed
 */
export async function POST(request: Request)
⋮----
// Get provider from request body
⋮----
// Seed models
```

## File: app/api/ai-sdk/providers/route.ts
```typescript
// Providers API route for CRUD operations
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseClient from '@/lib/memory/upstash/supabase-adapter-factory';
⋮----
export async function GET(req: NextRequest)
⋮----
type SettingsRow = { key: string; value: string; [k: string]: unknown };
⋮----
export async function POST(req: NextRequest)
export async function PUT(req: NextRequest)
export async function DELETE(req: NextRequest)
```

## File: app/api/ai-sdk/settings/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseClient from '@/lib/memory/upstash/supabase-adapter-factory';
⋮----
export async function GET(req: NextRequest)
⋮----
const item = await adapter.from(table).getById(`${category}:${key}`); // Composite key
⋮----
export async function POST(req: NextRequest)
export async function PUT(req: NextRequest)
export async function DELETE(req: NextRequest)
```

## File: app/api/ai-sdk/system/status/route.ts
```typescript
import { NextResponse } from "next/server"
import { isSupabaseAvailable } from "@/lib/memory/supabase"
import { isLibSQLAvailable } from "@/lib/memory/libsql"
import { getRedisClient } from "@/lib/memory/upstash/upstashClients"
import { handleApiError } from "@/lib/api-error-handler"
// Example: List of API routes to check
⋮----
async function checkUpstashAvailable()
async function checkSupabaseAvailable()
async function checkLibSQLAvailable()
async function checkApiRoutes()
export async function GET()
⋮----
// Check Supabase connection
⋮----
// Check LibSQL connection
⋮----
// Check Upstash connection
⋮----
// Check API route health
```

## File: app/api/ai-sdk/threads/[id]/route.ts
```typescript
import { NextResponse } from "next/server";
import { getLibSQLClient } from "@/lib/memory/db";
import { handleApiError } from "@/lib/api-error-handler";
import { getMemoryProvider } from '@/lib/memory/factory';
import { getItemById, updateItem, deleteItem, getData, UpstashAdapterError } from '@/lib/memory/upstash/supabase-adapter';
/**
 * GET /api/ai-sdk/threads/[id]
 * 
 * Fetch a specific thread and optionally its messages
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
)
⋮----
// Format messages
// eslint-disable-next-line @typescript-eslint/no-explicit-any
⋮----
// Fallback to LibSQL
⋮----
// LibSQL fallback
⋮----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
⋮----
/**
 * PATCH /api/ai-sdk/threads/[id]
 * 
 * Update a specific thread
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
)
⋮----
// Fallback to LibSQL
⋮----
// LibSQL fallback
⋮----
/**
 * DELETE /api/ai-sdk/threads/[id]
 * 
 * Delete a specific thread and all its messages
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
)
⋮----
// Optionally delete messages as well (if needed)
// await deleteItem('messages', { thread_id: id });
⋮----
// Fallback to LibSQL
⋮----
// LibSQL fallback
```

## File: app/api/ai-sdk/apps/[id]/route.ts
```typescript
import { handleApiError } from '@/lib/api-error-handler';
import { getLibSQLClient } from '@/lib/memory/db';
import { getMemoryProvider } from '@/lib/memory/factory';
import { getData, updateItem, deleteItem } from '@/lib/memory/upstash/supabase-adapter';
⋮----
export async function GET(req: Request)
⋮----
// LibSQL fallback
⋮----
export async function PUT(req: Request)
⋮----
// LibSQL fallback
⋮----
export async function DELETE(req: Request)
⋮----
// LibSQL fallback
```

## File: app/api/ai-sdk/threads/[id]/messages/route.ts
```typescript
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { logEvent } from "@/lib/langfuse-integration";
import { generateId } from "ai";
import { upstashLogger } from "@/lib/memory/upstash/upstash-logger";
import { getMemoryProvider } from "@/lib/memory/factory";
import {
  getItemById,
  getData,
  createItem,
  updateItem
} from "@/lib/memory/upstash/supabase-adapter";
import { getLibSQLClient } from "@/lib/memory/db";
/**
 * GET /api/ai-sdk/threads/[id]/messages
 * 
 * Fetch messages for a specific thread
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
)
⋮----
// ignore
⋮----
// Format messages for Upstash
⋮----
// ignore
⋮----
/**
 * POST /api/ai-sdk/threads/[id]/messages
 * 
 * Add a message to a specific thread
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
)
⋮----
// Validate required fields
```

## File: app/api/ai-sdk/apps/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';
import { getLibSQLClient } from '@/lib/memory/db';
import { getMemoryProvider } from '@/lib/memory/factory';
import {
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getData,
  TableName,
  TableInsert,
  TableUpdate
} from '@/lib/memory/upstash/supabase-adapter';
⋮----
export async function GET(req: NextRequest)
export async function POST(req: NextRequest)
⋮----
// LibSQL fallback
⋮----
export async function PUT(req: NextRequest)
⋮----
// LibSQL fallback
⋮----
export async function DELETE(req: NextRequest)
⋮----
// LibSQL fallback
```

## File: app/api/ai-sdk/chat/route.ts
```typescript
/**
 * AI SDK Chat API Route
 * 
 * This route handles chat requests using the AI SDK integration.
 * It supports multiple providers (Google, OpenAI, Anthropic) and
 * includes features like tool execution, middleware, and tracing.
 */
import { NextResponse } from "next/server";
import { streamWithAISDK, getAllAISDKTools } from "@/lib/ai-sdk-integration";
import { createMemory } from "@/lib/memory/factory";
import { handleApiError } from "@/lib/api-error-handler";
import { createTrace } from "@/lib/langfuse-integration";
import { personaManager } from "@/lib/agents/personas/persona-manager";
import { ModelSettings } from "@/lib/models/model-registry";
import { getModelById, getModelByModelId } from "@/lib/models/model-service";
⋮----
/**
 * POST /api/ai-sdk/chat
 * 
 * Process a chat request using the AI SDK
 */
export async function POST(request: Request)
⋮----
// Validate request
⋮----
// Generate thread ID if not provided
⋮----
// Create trace for observability
⋮----
// Inline getModelConfiguration logic (Upstash/Supabase aware)
⋮----
// Determine provider from model config or model name
⋮----
// Get model settings
⋮----
// Process messages and handle attachments/images
⋮----
// Add system prompt if provided
⋮----
// Add system prompt to the beginning of messages
⋮----
// Try to get persona from the first message metadata
⋮----
// Process images if supported
⋮----
// Add images to the last user message
⋮----
// Get effective max tokens
⋮----
// Process tools
⋮----
// Get all available tools
⋮----
// Filter tools based on provided tool IDs or names
⋮----
// Create middleware
⋮----
ttl: 1000 * 60 * 60, // 1 hour
⋮----
// Use the AI SDK integration for enhanced capabilities
⋮----
middleware: middlewareConfig.languageModel // Pass only the language model middleware
⋮----
// Save user message to memory
⋮----
// Stream the response
⋮----
// Return the appropriate response based on the stream protocol
```

## File: app/api/ai-sdk/threads/route.ts
```typescript
import { NextResponse } from "next/server";
import { getLibSQLClient } from "@/lib/memory/db";
import { handleApiError } from "@/lib/api-error-handler";
import { generateId } from 'ai';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { getMemoryProvider } from '@/lib/memory/factory';
import { getData, createItem, type TableRow, type QueryOptions, type FilterOptions } from '@/lib/memory/upstash/supabase-adapter';
/**
 * GET /api/ai-sdk/threads
 * 
 * Fetch all threads for AI SDK UI
 */
export async function GET(request: Request)
⋮----
// Upstash: get threads with source 'ai-sdk-ui'
⋮----
// Upstash: get total count
⋮----
// Fallback to LibSQL if Upstash fails
⋮----
// LibSQL fallback
⋮----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
⋮----
// Normalize all fields to string/null as needed
const normalize = (v: unknown): string | null =>
// Only include message_count in the response, not in the TableRow type
⋮----
metadata: parsedMetadata as unknown as import('@/types/supabase').Json, // Cast to Json type
⋮----
/**
 * POST /api/ai-sdk/threads
 * 
 * Create a new thread for AI SDK UI
 */
export async function POST(request: Request)
⋮----
// Fallback to LibSQL
⋮----
// LibSQL fallback
```

## File: app/api/ai-sdk/tools/route.ts
```typescript
import { NextResponse } from "next/server";
import { getLibSQLClient } from "@/lib/memory/db";
import { handleApiError } from "@/lib/api-error-handler";
import { getAllBuiltInTools, loadCustomTools, toolCategories } from "@/lib/tools";
import { agenticTools } from "@/lib/tools/agentic";
import { getAllAISDKTools } from "@/lib/ai-sdk-integration";
import { createTrace } from "@/lib/langfuse-integration";
import { getMemoryProvider } from "@/lib/memory/factory";
import { z } from "zod";
// Define schemas for validation
⋮----
/**
 * GET /api/ai-sdk/tools
 *
 * Fetch all available tools for use with AI SDK
 */
export async function GET(request: Request)
⋮----
// Parse and validate query parameters
⋮----
// Get all tools using the AI SDK integration module
⋮----
// Get individual tool collections for categorization
⋮----
// Get custom tools - try Upstash first if enabled
⋮----
// Use a more specific type for Upstash tools table
type UpstashToolRow = { name: string; description: string; parameters_schema: string; category?: string };
⋮----
// fallback: normalize loadCustomTools result
⋮----
// fallback: normalize loadCustomTools result
⋮----
// Helper to get tool category
function getToolCategory(name: string): string
// Format tools for response
⋮----
// Apply category filter
⋮----
// Apply search filter
⋮----
// Define schemas for validation
⋮----
/**
 * POST /api/ai-sdk/tools
 *
 * Create a new custom tool
 */
export async function POST(request: Request)
⋮----
// Parse and validate request body
⋮----
// Validate parameters schema is valid JSON
⋮----
// Determine which provider to use
⋮----
// Check if tool with same name already exists
⋮----
// Create new tool
⋮----
// If implementation is provided, save it to the apps table
⋮----
name, // Assuming tool name can serve as app name for this context
description: `Implementation for tool: ${name}`, // Optional: add a description
⋮----
// parameters_schema and metadata can be omitted if they have defaults or are nullable
⋮----
// Create trace for tool creation
⋮----
// Fall back to LibSQL if needed
⋮----
// Check if tool with same name already exists
⋮----
// Insert new tool
⋮----
// If implementation is provided, save it to the apps table
⋮----
// Create trace for tool creation
```

## File: app/api/ai-sdk/tools/execute/route.ts
```typescript
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { getAllBuiltInTools, loadCustomTools } from "@/lib/tools";
import { agenticTools } from "@/lib/tools/agentic";
import { getAllAISDKTools } from "@/lib/ai-sdk-integration";
import { getMemoryProvider } from "@/lib/memory/factory";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
// Local type for dynamic tool execution
interface DynamicTool {
  execute: (params: Record<string, unknown>, options: { toolCallId: string }) => Promise<unknown>;
}
⋮----
export async function POST(request: Request)
⋮----
// Use explicit type for tool_executions row
type ToolExecutionRow = {
          id: string;
          tool_name: string;
          parameters: string;
          result: string;
          status: string;
          execution_time: number;
          created_at: string;
        };
⋮----
// fallback: do not throw, just skip logging if Upstash fails
```

## File: app/api/ai-sdk/agents/[id]/route.ts
```typescript
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { createTrace } from "@/lib/langfuse-integration";
import { agentRegistry } from "@/lib/agents/registry";
import { personaManager } from "@/lib/agents/personas/persona-manager";
import { getSupabaseClient } from "@/lib/memory/supabase";
import { getMemoryProvider } from "@/lib/memory/factory";
import { getData, getItemById, updateItem, deleteItem, createItem } from "@/lib/memory/upstash/supabase-adapter";
import { upstashLogger } from "@/lib/memory/upstash/upstash-logger";
import { z } from "zod";
// Define a type for the agent from registry which might have different property names
interface RegistryAgent {
  id: string;
  name: string;
  description?: string;
  modelId?: string;
  model_id?: string;
  systemPrompt?: string;
  system_prompt?: string;
  tool_ids?: string[];
  persona_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  [key: string]: string | string[] | undefined; // More specific type for additional properties
}
⋮----
[key: string]: string | string[] | undefined; // More specific type for additional properties
⋮----
// Zod validation schemas
⋮----
/**
 * GET /api/ai-sdk/agents/[id]
 *
 * Get details for a specific agent
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
)
⋮----
// Validate params
⋮----
// Initialize agent registry
⋮----
// Get agent from registry
⋮----
// Cast agent to RegistryAgent type with proper type conversion
⋮----
// Get persona information if available
⋮----
// Get tool IDs
⋮----
// Format response with proper type handling
⋮----
// Validate response
⋮----
// Handle Upstash-specific errors with detailed error messages
⋮----
// Create a trace for the error
⋮----
// Handle specific Upstash errors
⋮----
/**
 * PATCH /api/ai-sdk/agents/[id]
 *
 * Update an agent
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
)
⋮----
// Validate params
⋮----
// Parse and validate request body
⋮----
// Determine which provider to use
⋮----
// Use Upstash adapter
⋮----
// Prepare update data
⋮----
// Update agent
⋮----
// Handle tool associations if provided
⋮----
// Get all existing tool associations
⋮----
// Delete existing tool associations
⋮----
// Add new tool associations
⋮----
// Fall back to LibSQL if Upstash fails
// Create a trace for the error
⋮----
// Fall back to LibSQL/Supabase if needed
⋮----
// Get Supabase client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
⋮----
// Check if agent exists
⋮----
// Prepare update data
⋮----
// Update agent
⋮----
// Update tool associations if provided
⋮----
// Delete existing tool associations
⋮----
// Add new tool associations
⋮----
interface ToolAssociation {
              agent_id: string;
              tool_id: string;
              created_at?: string;
            }
⋮----
// Reload agent in registry
⋮----
// Create trace for agent update
⋮----
// Prepare response
⋮----
// Validate response
⋮----
// Handle Upstash-specific errors with detailed error messages
⋮----
// Create a trace for the error
⋮----
// Handle specific Upstash errors
⋮----
// Use the generic API error handler for other errors
⋮----
/**
 * DELETE /api/ai-sdk/agents/[id]
 *
 * Delete an agent
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
)
⋮----
// Validate params
⋮----
// Determine which provider to use
⋮----
// Check if agent exists
⋮----
// Get all tool associations
⋮----
// Delete tool associations first (foreign key constraint)
⋮----
// Delete the agent
⋮----
// Fall back to LibSQL if Upstash fails
⋮----
// Fall back to LibSQL/Supabase if needed
⋮----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
⋮----
// Check if agent exists first
⋮----
// Delete agent tools first (foreign key constraint)
⋮----
// Delete agent
⋮----
// Create trace for agent deletion
⋮----
// Handle Upstash-specific errors with detailed error messages
⋮----
// Create a trace for the error
⋮----
// Handle specific Upstash errors
⋮----
// Use the generic API error handler for other errors
```

## File: app/api/ai-sdk/agents/route.ts
```typescript
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { createTrace } from "@/lib/langfuse-integration";
import { generateId } from "ai";
import { z } from "zod";
import { getMemoryProvider } from "@/lib/memory/factory";
import { upstashLogger } from "@/lib/memory/upstash/upstash-logger";
// Import Upstash adapter functions
import {
  getData,
  getItemById,
  createItem,
  updateItem,
  deleteItem
} from "@/lib/memory/upstash/supabase-adapter";
// Helper functions for Upstash operations
/**
 * Updates an agent in Upstash
 *
 * @param id - Agent ID
 * @param updates - Updates to apply
 * @returns Updated agent
 */
async function updateAgentInUpstash(id: string, updates: Record<string, unknown>)
⋮----
// First check if agent exists
⋮----
// Add updated_at timestamp
⋮----
// Update the agent
⋮----
/**
 * Deletes an agent from Upstash
 *
 * @param id - Agent ID
 * @returns Whether deletion was successful
 */
async function deleteAgentFromUpstash(id: string)
⋮----
// First check if agent exists
⋮----
// First delete related agent_tools
⋮----
// Then delete the agent
⋮----
// Helper to get composite key for agent_tools
function getAgentToolKey(agent_id: string, tool_id: string)
// Import LibSQL client for fallback
import { getLibSQLClient } from "@/lib/memory/db";
// Define schemas for validation
⋮----
/**
 * GET /api/ai-sdk/agents
 *
 * Fetch all available agents with their tools and models
 */
export async function GET(request: Request)
⋮----
// Validate and parse query parameters using Zod
⋮----
// Determine which provider to use
⋮----
// Get agents from Upstash
⋮----
// Format agents with their models and tools
⋮----
// Get model details
⋮----
// Get tools for this agent
⋮----
// Get tool details
⋮----
// Filter out null tools
⋮----
// Get total count
⋮----
// If Upstash fails, fall back to LibSQL
⋮----
// Create trace for error with detailed logging
⋮----
// Fall back to LibSQL if Upstash is not configured or failed
⋮----
// Query to get agents with their models and tools
⋮----
// Add search condition if provided
⋮----
// Add pagination
⋮----
// Format agents
⋮----
// Get tools for this agent
⋮----
// Get total count
⋮----
// Handle Upstash-specific errors
⋮----
// Use the generic API error handler for other errors
⋮----
/**
 * POST /api/ai-sdk/agents
 *
 * Create a new agent
 */
export async function POST(request: Request)
⋮----
// Validate request body using Zod
⋮----
// Determine which provider to use
⋮----
// Check if model exists
⋮----
// Create agent
⋮----
// Create the agent in Upstash
⋮----
// Add tools to agent
⋮----
// Create trace for agent creation
⋮----
// If Upstash fails, fall back to LibSQL
⋮----
// Create trace for error with detailed logging
⋮----
// Fall back to LibSQL if Upstash is not configured or failed
⋮----
// Get model details
⋮----
// Create agent
⋮----
// Add tools to agent
⋮----
// Create trace for agent creation
⋮----
// Handle Upstash-specific errors
⋮----
// Use the generic API error handler for other errors
⋮----
/**
 * PATCH /api/ai-sdk/agents/:id
 *
 * Update an existing agent
 */
export async function PATCH(request: Request)
⋮----
// Extract agent ID from URL
⋮----
// Validate agent ID
⋮----
// Parse and validate request body
⋮----
// Determine which provider to use
⋮----
// Check if agent exists
⋮----
// Prepare update data
⋮----
// Update agent using the helper function
⋮----
// Handle tool associations if provided
⋮----
// Get all existing tool associations
⋮----
// Delete existing tool associations
⋮----
// Add new tool associations
⋮----
// Create trace for agent update
⋮----
// Get updated agent
⋮----
// Get tools for this agent
⋮----
// Prepare response
⋮----
// Create trace for error with detailed logging
⋮----
// Fall back to LibSQL
⋮----
// Fall back to LibSQL if needed
⋮----
// Check if agent exists
⋮----
// Prepare update data
⋮----
// Add ID to values
⋮----
// Update agent
⋮----
// Update tool associations if provided
⋮----
// Delete existing tool associations
⋮----
// Add new tool associations
⋮----
// Get updated tool IDs
⋮----
// Create trace for agent update
⋮----
// Prepare response
⋮----
// Handle Upstash-specific errors
⋮----
// Use the generic API error handler for other errors
⋮----
/**
 * DELETE /api/ai-sdk/agents/:id
 *
 * Delete an agent
 */
export async function DELETE(request: Request)
⋮----
// Extract agent ID from URL
⋮----
// Validate agent ID
⋮----
// Determine which provider to use
⋮----
// Delete agent using the helper function
⋮----
// Create trace for agent deletion
⋮----
// If error is "not found", return 404
⋮----
// Create trace for error with detailed logging
⋮----
// Fall back to LibSQL
⋮----
// Fall back to LibSQL if needed
⋮----
// Check if agent exists
⋮----
// Delete agent tools first (foreign key constraint)
⋮----
// Delete agent
⋮----
// Create trace for agent deletion
⋮----
// Handle Upstash-specific errors
⋮----
// Use the generic API error handler for other errors
```

## File: app/api/ai-sdk/agents/[id]/run/route.ts
```typescript
import { NextResponse } from "next/server";
import { createDataStreamResponse, generateId } from 'ai';
import { handleApiError } from "@/lib/api-error-handler";
import { createTrace, logEvent } from "@/lib/langfuse-integration";
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { agentRegistry } from "@/lib/agents/registry";
import { runAgent } from "@/lib/agents/agent-service";
import { AgentRunOptions } from "@/lib/agents/agent.types";
import { personaManager } from "@/lib/agents/personas/persona-manager";
import { createMemoryThread, saveMessage, loadMessages, loadAgentState, saveAgentState } from "@/lib/memory/memory";
import { getSupabaseClient, isSupabaseClient, isUpstashClient } from "@/lib/memory/supabase";
/**
 * POST /api/ai-sdk/agents/[id]/run
 *
 * Run an agent with the AI SDK
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
)
⋮----
// Generate thread ID if not provided
⋮----
// Log agent run start
⋮----
// Health check: ensure Supabase/Upstash is available
⋮----
// Upstash: try a simple getAll
⋮----
// Initialize agent registry
⋮----
// Get agent config using agentRegistry (loads from Upstash/Supabase as needed)
⋮----
// Optionally, get persona if present (uses personaManager)
⋮----
// BaseAgent does not expose persona_id directly, but its config does.
// @ts-expect-error: Accessing private property for persona_id
⋮----
// Create a memory thread if it doesn't exist
⋮----
// Save user message if input is provided
⋮----
// Load previous messages
⋮----
// Load agent state
// (agentState is not used directly, but triggers any stateful logic)
⋮----
// Create trace for this run
⋮----
// Run options with onFinish to persist assistant message
⋮----
// Save assistant message to memory after completion
⋮----
// Save agent state if needed
⋮----
// Log event
⋮----
// Run the agent (Upstash/Supabase logic handled in runAgent)
⋮----
// Log agent run completion
⋮----
// Use streamResult if available
⋮----
// Fallback: use createDataStreamResponse with execute function
⋮----
// send only JSON-safe fields
```

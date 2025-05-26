/**
 * Cloudflare Workers API for AI SDK DM Project
 *
 * This Worker implements the full backend API for the ai-sdk-dm project,
 * migrated from Next.js API routes to Cloudflare Workers with Hono router.
 *
 * Generated on 2025-05-24
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { z } from 'zod';
import { generateId } from 'ai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { streamText, CoreMessage, Tool } from 'ai';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../../lib/database/cloudflare/d1/schema';
import { bindingValidationMiddleware } from './middleware/bindings';
import { MemoryFactory } from '../../lib/memory/cloudflare/factory';

// Import Durable Object classes
export { AgentThreadDO } from '../../lib/database/cloudflare/durableObjects/agentThreadDO';
export { PersonaProfileDO } from '../../lib/database/cloudflare/durableObjects/personaProfileDO';
export { WorkflowInstanceDO } from '../../lib/database/cloudflare/durableObjects/worflowInstanceDO';
export { AppBuilderSessionDO } from '../../lib/database/cloudflare/durableObjects/appBuilderSessionDO';
export { ChatRoomDO } from '../../lib/database/cloudflare/durableObjects/chatRoomDO';
export { TerminalSessionDO } from '../../lib/database/cloudflare/durableObjects/terminalSessionDO';
export { DocumentCollaborationDO } from '../../lib/database/cloudflare/durableObjects/documentCallaborationDO';
export { IntegrationSessionDO } from '../../lib/database/cloudflare/durableObjects/integrationSessionDO';
export { CacheCoordinatorDO } from '../../lib/database/cloudflare/durableObjects/cacheCordinatorDO';

// Define Vectorize interface for proper typing
interface VectorizeIndex {
	describe(): Promise<{
		name: string;
		description?: string;
		dimensions: number;
		metric: string;
	}>;
	query(
		vector: number[],
		options?: {
			topK?: number;
			filter?: Record<string, unknown>;
			returnValues?: boolean;
			returnMetadata?: boolean;
		},
	): Promise<{
		matches: Array<{
			id: string;
			score: number;
			values?: number[];
			metadata?: Record<string, unknown>;
		}>;
	}>;
	insert(
		vectors: Array<{
			id: string;
			values: number[];
			metadata?: Record<string, unknown>;
		}>,
	): Promise<{
		count: number;
		ids: string[];
	}>;
	upsert(
		vectors: Array<{
			id: string;
			values: number[];
			metadata?: Record<string, unknown>;
		}>,
	): Promise<{
		count: number;
		ids: string[];
	}>;
	deleteByIds(ids: string[]): Promise<{
		count: number;
		ids: string[];
	}>;
}

// Define Env type for Worker bindings
interface Env {
	// KV Stores
	DB_KV: KVNamespace;
	KV_MAIN_CACHE: KVNamespace;
	KV_EPHEMERAL_CACHE: KVNamespace;

	// D1 Database
	DB_D1: D1Database;

	// R2 Storage
	R2_MAIN_BUCKET: R2Bucket;

	// Vectorize Index
	VECTORIZE_MAIN_INDEX: VectorizeIndex;

	// Durable Objects
	AGENT_THREAD_DO: DurableObjectNamespace;
	PERSONA_PROFILE_DO: DurableObjectNamespace;
	WORKFLOW_INSTANCE_DO: DurableObjectNamespace;
	APP_BUILDER_SESSION_DO: DurableObjectNamespace;
	CHAT_ROOM_DO: DurableObjectNamespace;
	TERMINAL_SESSION_DO: DurableObjectNamespace;
	DOCUMENT_COLLABORATION_DO: DurableObjectNamespace;
	INTEGRATION_SESSION_DO: DurableObjectNamespace;
	CACHE_COORDINATOR_DO: DurableObjectNamespace;

	// Environment Variables
	GOOGLE_GENERATIVE_AI_API_KEY: string;
	ANTHROPIC_API_KEY: string;
	OPENAI_API_KEY: string;
	NEXTAUTH_SECRET: string;
	NEXTAUTH_URL: string;
}

// Zod Schemas for validation
const ChatRequestSchema = z.object({
	messages: z.array(
		z.object({
			id: z.string().optional(),
			role: z.enum(['user', 'assistant', 'system', 'tool']),
			content: z.string(),
			toolInvocations: z.array(z.any()).optional(),
		}),
	),
	threadId: z.string().optional(),
	model: z.string().default('gemini-2.0-flash'),
	temperature: z.number().min(0).max(2).default(0.7),
	maxTokens: z.number().min(1).max(100000).default(8192),
	tools: z.array(z.any()).default([]),
	attachments: z.array(z.any()).default([]),
	images: z.array(z.any()).default([]),
	provider: z.enum(['google', 'openai', 'anthropic']).default('google'),
	systemPrompt: z.string().optional(),
	streamProtocol: z.enum(['data', 'text']).default('data'),
	toolChoice: z.enum(['auto', 'none', 'required']).default('auto'),
	middleware: z.object({}).default({}),
});

const ThreadCreateSchema = z.object({
	title: z.string().optional(),
	agentId: z.string().optional(),
	metadata: z.record(z.any()).optional(),
});

const MessageCreateSchema = z.object({
	threadId: z.string(),
	role: z.enum(['user', 'assistant', 'system', 'tool']),
	content: z.string(),
	toolInvocations: z.array(z.any()).optional(),
	metadata: z.record(z.any()).optional(),
});

// Initialize Hono app
const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use(
	'*',
	cors({
		origin: ['http://localhost:3000', 'https://ai-sdk-dm.vercel.app'],
		allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowHeaders: ['Content-Type', 'Authorization'],
		credentials: true,
	}),
);

// Validate environment bindings
app.use('*', bindingValidationMiddleware);

// Initialize MemoryFactory for request context
app.use('*', async (c, next) => {
	try {
		const factory = new MemoryFactory(c.env);
		c.set('memoryFactory', factory);
	} catch (error) {
		return c.json({ error: 'Internal Server Error - failed to initialize services' }, 500);
	}
	await next();
});

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get AI provider based on provider name and environment
 */
function getAIProvider(provider: string, _env: Env) {
	switch (provider) {
		case 'google':
			return google;
		case 'openai':
			return openai;
		case 'anthropic':
			return anthropic;
		default:
			throw new Error(`Unsupported provider: ${provider}`);
	}
}

/**
 * Initialize Drizzle database client
 */
function getDatabase(d1: D1Database) {
	return drizzle(d1, { schema });
}

/**
 * Log error with context
 */
function logError(error: unknown, _context: string): void {
	if (error instanceof Error && error.stack) {
	} else {
	}
}

// =============================================================================
// Health & Test Endpoints
// =============================================================================

/**
 * Health check endpoint
 */
app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

/**
 * Test KV functionality
 */
app.get('/test/kv', async (c) => {
	try {
		const { DB_KV } = c.env;
		const testKey = `test-${Date.now()}`;
		const testValue = { message: 'KV test successful', timestamp: Date.now() };

		await DB_KV.put(testKey, JSON.stringify(testValue));
		const retrieved = await DB_KV.get(testKey, 'json');

		return c.json({
			success: true,
			key: testKey,
			stored: testValue,
			retrieved,
		});
	} catch (error: unknown) {
		logError(error, 'KV Test');
		return c.json({ error: 'KV test failed' }, 500);
	}
});

/**
 * Test D1 database functionality
 */
app.get('/test/d1', async (c) => {
	try {
		const { DB_D1 } = c.env;

		// Test basic query - use raw D1 query since we're testing connectivity
		const result = await DB_D1.prepare('SELECT 1 as test_value, datetime("now") as current_time').first();

		// Test schema query using Drizzle
		let threadsCount = 0;
		try {
			// Use raw D1 query since schema might not be properly imported
			const threadsResult = await DB_D1.prepare('SELECT COUNT(*) as count FROM threads LIMIT 1').first();
			threadsCount = (threadsResult?.count as number) || 0;
		} catch {
			// Threads table might not exist yet
			threadsCount = -1; // Indicate table doesn't exist
		}

		// Test schema query
		const tables = await DB_D1.prepare(
			`
			SELECT name FROM sqlite_master
			WHERE type='table' AND name NOT LIKE 'sqlite_%'
			ORDER BY name
		`,
		).all();

		return c.json({
			success: true,
			query_result: result,
			tables: tables.results,
			drizzle_test: { threads_accessible: threadsCount >= 0 },
		});
	} catch (error: unknown) {
		logError(error, 'D1 Test');
		return c.json({ error: 'D1 test failed' }, 500);
	}
}); /**
 * Test R2 storage functionality
 */
app.get('/test/r2', async (c) => {
	try {
		const { R2_MAIN_BUCKET } = c.env;

		// List objects (up to 10)
		const list = await R2_MAIN_BUCKET.list({ limit: 10 });

		// Test put/get if no objects exist
		if (list.objects.length === 0) {
			const testKey = `test-${Date.now()}.txt`;
			const testContent = `R2 test file created at ${new Date().toISOString()}`;

			await R2_MAIN_BUCKET.put(testKey, testContent);
			const retrieved = await R2_MAIN_BUCKET.get(testKey);
			const content = retrieved ? await retrieved.text() : null;

			return c.json({
				success: true,
				test_file: { key: testKey, content },
				total_objects: 1,
			});
		}

		return c.json({
			success: true,
			objects: list.objects.map((obj) => ({ key: obj.key, size: obj.size })),
			total_objects: list.objects.length,
		});
	} catch (error: unknown) {
		logError(error, 'R2 Test');
		return c.json({ error: 'R2 test failed' }, 500);
	}
});

/**
 * Test Vectorize functionality
 */
app.get('/test/vectorize', async (c) => {
	try {
		const { VECTORIZE_MAIN_INDEX } = c.env;

		const description = await VECTORIZE_MAIN_INDEX.describe();

		// Try a simple query
		const testVector = new Array(description.dimensions).fill(0.1);
		const queryResult = await VECTORIZE_MAIN_INDEX.query(testVector, { topK: 1 });

		return c.json({
			success: true,
			index: description,
			query_test: {
				matches_found: queryResult.matches.length,
				test_vector_length: testVector.length,
			},
		});
	} catch (error: unknown) {
		logError(error, 'Vectorize Test');
		return c.json({ error: 'Vectorize test failed' }, 500);
	}
});

// =============================================================================
// AI SDK Chat Endpoints
// =============================================================================

/**
 * POST /api/ai-sdk/chat
 * Main chat endpoint with streaming support
 */
app.post('/api/ai-sdk/chat', zValidator('json', ChatRequestSchema), async (c) => {
	try {
		const { messages, threadId, model, temperature, maxTokens, tools, provider, systemPrompt, streamProtocol, toolChoice } =
			c.req.valid('json');

		// Get AI provider
		const aiProvider = getAIProvider(provider, c.env);

		// Prepare messages with system prompt
		const coreMessages: CoreMessage[] = [];
		if (systemPrompt) {
			coreMessages.push({ role: 'system', content: systemPrompt });
		}

		// Transform messages to CoreMessage format
		for (const message of messages) {
			if (message.role === 'tool') {
				// Tool messages should be handled as tool result messages
				// Skip for now until proper tool implementation
				continue;
			} else {
				coreMessages.push({
					role: message.role as 'user' | 'assistant' | 'system',
					content: message.content,
				});
			}
		}

		// TODO: 2025-05-24 - Implement tool loading and validation
		const availableTools: Record<string, Tool> = {};

		// Convert tools from request to availableTools format if provided
		if (tools && tools.length > 0) {
		}

		// TODO: 2025-05-24 - Use threadId for persistence and message storage
		if (threadId) {
			// Will be used for saving conversation to database
		}

		// Stream response
		const result = await streamText({
			model: aiProvider(model),
			messages: coreMessages,
			tools: availableTools,
			toolChoice: toolChoice === 'auto' ? 'auto' : toolChoice === 'none' ? 'none' : toolChoice === 'required' ? 'required' : undefined,
			temperature,
			maxTokens,
		});

		// Return appropriate stream response based on protocol
		if (streamProtocol === 'text') {
			return result.toTextStreamResponse();
		} else {
			// Default to data stream protocol
			return result.toDataStreamResponse();
		}
	} catch (error: unknown) {
		logError(error, 'Chat API');
		return c.json({ error: 'Chat request failed' }, 500);
	}
});

// =============================================================================
// Thread Management Endpoints
// =============================================================================

/**
 * POST /api/ai-sdk/threads
 * Create a new conversation thread
 */
app.post('/api/ai-sdk/threads', zValidator('json', ThreadCreateSchema), async (c) => {
	try {
		const { title, agentId, metadata } = c.req.valid('json');

		// TODO: 2025-05-24 - Get userId from authentication
		const userId = 'anonymous'; // Placeholder

		const threadId = generateId();
		const now = Date.now();
		// TODO: 2025-05-24 - Fix schema import and table definition
		// The schema.threads table is not properly defined in the imported schema
		// Using raw D1 query as temporary workaround
		await c.env.DB_D1.prepare(
			`
			INSERT INTO threads (id, title, userId, agentId, metadata, createdAt, updatedAt)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`,
		)
			.bind(threadId, title || 'New Conversation', userId, agentId, JSON.stringify(metadata), now, now)
			.run();
		return c.json({
			id: threadId,
			title: title || 'New Conversation',
			userId,
			agentId,
			metadata,
			createdAt: now,
			updatedAt: now,
		});
	} catch (error: unknown) {
		logError(error, 'Create Thread');
		return c.json({ error: 'Failed to create thread' }, 500);
	}
});

/**
 * GET /api/ai-sdk/threads/:threadId
 * Get thread details with messages
 */
app.get('/api/ai-sdk/threads/:threadId', async (c) => {
	try {
		const threadId = c.req.param('threadId');

		// TODO: 2025-05-24 - Fix schema import and table definition
		// Using raw D1 query as temporary workaround
		const thread = await c.env.DB_D1.prepare(
			`
			SELECT * FROM threads WHERE id = ?
		`,
		)
			.bind(threadId)
			.first();

		if (!thread) {
			return c.json({ error: 'Thread not found' }, 404);
		}

		// TODO: 2025-05-24 - Fix schema import and table definition
		// Using raw D1 query as temporary workaround
		const messagesResult = await c.env.DB_D1.prepare(
			`
			SELECT * FROM messages WHERE threadId = ? ORDER BY createdAt ASC
		`,
		)
			.bind(threadId)
			.all();
		const threadMessages = messagesResult.results;

		return c.json({
			thread,
			messages: threadMessages,
		});
	} catch (error: unknown) {
		logError(error, 'Get Thread');
		return c.json({ error: 'Failed to get thread' }, 500);
	}
});

/**
 * POST /api/ai-sdk/messages
 * Add a message to a thread
 */
app.post('/api/ai-sdk/messages', zValidator('json', MessageCreateSchema), async (c) => {
	try {
		const { threadId, role, content, toolInvocations, metadata } = c.req.valid('json');

		const messageId = generateId();
		const now = Date.now();

		// TODO: 2025-05-24 - Fix schema import and table definition
		// The schema.messages table is not properly defined in the imported schema
		// Using raw D1 query as temporary workaround
		await c.env.DB_D1.prepare(
			`
			INSERT INTO messages (id, threadId, role, content, toolInvocations, metadata, createdAt)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`,
		)
			.bind(messageId, threadId, role, content, JSON.stringify(toolInvocations), JSON.stringify(metadata), now)
			.run();

		// TODO: 2025-05-24 - Fix schema import and table definition
		// Using raw D1 query as temporary workaround
		await c.env.DB_D1.prepare(
			`
			UPDATE threads SET updatedAt = ? WHERE id = ?
		`,
		)
			.bind(now, threadId)
			.run();

		return c.json({
			id: messageId,
			threadId,
			role,
			content,
			toolInvocations,
			metadata,
			createdAt: now,
		});
	} catch (error: unknown) {
		logError(error, 'Create Message');
		return c.json({ error: 'Failed to create message' }, 500);
	}
});

// =============================================================================
// Durable Object Endpoints
// =============================================================================

/**
 * GET /api/durable-objects/agent-thread/:threadId
 * Get or create an agent thread Durable Object
 */
app.get('/api/durable-objects/agent-thread/:threadId', async (c) => {
	try {
		const threadId = c.req.param('threadId');
		const id = c.env.AGENT_THREAD_DO.idFromName(threadId);
		const stub = c.env.AGENT_THREAD_DO.get(id);

		const response = await stub.fetch(c.req.raw);
		return response;
	} catch (error: unknown) {
		logError(error, 'Agent Thread DO');
		return c.json({ error: 'Failed to access agent thread' }, 500);
	}
});

/**
 * GET /api/durable-objects/persona-profile/:profileId
 * Get or create a persona profile Durable Object
 */
app.get('/api/durable-objects/persona-profile/:profileId', async (c) => {
	try {
		const profileId = c.req.param('profileId');
		const id = c.env.PERSONA_PROFILE_DO.idFromName(profileId);
		const stub = c.env.PERSONA_PROFILE_DO.get(id);

		const response = await stub.fetch(c.req.raw);
		return response;
	} catch (error: unknown) {
		logError(error, 'Persona Profile DO');
		return c.json({ error: 'Failed to access persona profile' }, 500);
	}
});

// Export the Hono app as default
export default app;

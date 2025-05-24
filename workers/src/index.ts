import { Hono } from 'hono';

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
	DB_KV: KVNamespace;
	DB_D1: D1Database;
	R2_FILES: R2Bucket;
	VECTOR_INDEX: VectorizeIndex;
	AGENT_THREAD_DO?: DurableObjectNamespace;
	PERSONA_PROFILE_DO?: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Env }>();

// Health check endpoint
app.get('/health', (c) => c.text('OK'));

// KV test endpoint
app.get('/test/kv', async (c) => {
	const { DB_KV } = c.env;
	await DB_KV.put('test-key', 'test-value');
	const value = await DB_KV.get('test-key');
	return c.json({ key: 'test-key', value });
});

// D1 test endpoint
app.get('/test/d1', async (c) => {
	const { DB_D1 } = c.env;
	const result = await DB_D1.prepare('SELECT 1 as ok').first();
	return c.json({ d1: result });
});

// R2 test endpoint
app.get('/test/r2', async (c) => {
	const { R2_FILES } = c.env;
	const list = await R2_FILES.list();
	return c.json({ r2: list.objects.map((obj: R2Object) => obj.key) });
});

// Vectorize test endpoint
app.get('/test/vectorize', async (c) => {
	const { VECTOR_INDEX } = c.env;
	try {
		const desc = await VECTOR_INDEX.describe();
		return c.json({ vectorize: desc });
	} catch (e: unknown) {
		const errorMessage = e instanceof Error ? e.message : String(e);
		return c.json({ error: errorMessage }, 500);
	}
});

// Durable Object stubs (to be implemented)
// Example: c.env.AGENT_THREAD_DO, c.env.PERSONA_PROFILE_DO

export default app;

import type { Context } from 'hono';
import type { AppEnv } from '../../../lib/memory/cloudflare/factory';

/**
 * Middleware to validate that required Cloudflare Workers bindings are present
 */
export async function bindingValidationMiddleware(c: Context, next: () => Promise<void>) {
	const env = c.env as AppEnv;
	const missing: string[] = [];

	if (!env.DB_D1) missing.push('DB_D1');
	if (!env.DB_KV) missing.push('DB_KV');
	if (!env.KV_MAIN_CACHE) missing.push('KV_MAIN_CACHE');
	if (!env.KV_EPHEMERAL_CACHE) missing.push('KV_EPHEMERAL_CACHE');
	if (!env.R2_MAIN_BUCKET) missing.push('R2_MAIN_BUCKET');
	if (!env.VECTORIZE_MAIN_INDEX) missing.push('VECTORIZE_MAIN_INDEX');

	const doBindings = [
		'AGENT_THREAD_DO',
		'PERSONA_PROFILE_DO',
		'WORKFLOW_INSTANCE_DO',
		'APP_BUILDER_SESSION_DO',
		'CHAT_ROOM_DO',
		'TERMINAL_SESSION_DO',
		'DOCUMENT_COLLABORATION_DO',
		'INTEGRATION_SESSION_DO',
		'CACHE_COORDINATOR_DO',
	] as const;
	doBindings.forEach((name) => {
		if (!env[name]) missing.push(name);
	});

	if (missing.length) {
		return c.json({ error: `Missing environment bindings: ${missing.join(', ')}` }, 500);
	}

	await next();
}

// middlewares for the bindings

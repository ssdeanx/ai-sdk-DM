import { Hono } from 'hono';
import Env from '../index';
import type { OverallHealth } from '../../../lib/memory/cloudflare/factory';

const healthRoutes = new Hono<{ Bindings: Env }>();

healthRoutes.get('/', async (c) => {
	try {
		const env = c.env as Env;
		const factory = env.memoryFactory;
		const health: OverallHealth = await factory.runHealthChecks();
		return c.json(health);
	} catch (error: unknown) {
		return c.json(
			{ status: 'unhealthy', services: [], timestamp: Date.now(), error: error instanceof Error ? error.message : String(error) },
			500,
		);
	}
});

export default healthRoutes;

// health check

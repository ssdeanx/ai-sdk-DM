/**
 * API route for most used personas
 */
import { personaManager } from '@/lib/agents/personas/persona-manager';
import * as langfuseIntegration from '@/lib/langfuse-integration';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * GET /api/ai-sdk/agents/personas/scores/most-used
 * Get most used personas (with tracing, logging, and Zod validation)
 */
const MostUsedQuerySchema = z.object({
  limit: z.string().optional(),
});

export async function GET(request: Request) {
  const trace = await langfuseIntegration.createTrace({
    name: 'GET_most_used_personas',
    metadata: { url: request.url },
  });
  try {
    const url = new URL(request.url);
    const query = MostUsedQuerySchema.parse({
      limit: url.searchParams.get('limit') || undefined,
    });
    const limit = query.limit ? parseInt(query.limit, 10) : 5;

    const mostUsedPersonas = await personaManager.getMostUsedPersonas(limit);

    if (trace && trace.id) {
      await langfuseIntegration.logEvent({
        traceId: trace.id,
        name: 'most_used_personas_fetched',
        metadata: { count: mostUsedPersonas.length },
      });
    }
    await upstashLogger.info(
      'most-used-personas-route',
      'Fetched most used personas',
      { count: mostUsedPersonas.length }
    );
    return NextResponse.json(
      mostUsedPersonas.map(({ persona, usageCount }) => ({
        persona: {
          id: persona.id,
          name: persona.name,
          description: persona.description,
        },
        score: usageCount,
      }))
    );
  } catch (error) {
    if (trace && trace.id) {
      await langfuseIntegration.logEvent({
        traceId: trace.id,
        name: 'error_fetching_most_used_personas',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
    await upstashLogger.error(
      'most-used-personas-route',
      'Failed to fetch most used personas',
      error instanceof Error ? error : { error }
    );
    return NextResponse.json(
      { error: 'Failed to fetch most used personas' },
      { status: 500 }
    );
  }
}

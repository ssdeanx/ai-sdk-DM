/**
 * API route for persona recommendations
 */
import { personaManager } from '@/lib/agents/personas/persona-manager';
import * as langfuseIntegration from '@/lib/langfuse-integration';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * POST /api/ai-sdk/agents/personas/scores/recommend
 * Get a persona recommendation based on context (with tracing, logging, and Zod validation)
 */
const RecommendBodySchema = z.object({
  context: z.any(),
});

export async function POST(request: Request) {
  const trace = await langfuseIntegration.createTrace({
    name: 'POST_persona_recommend',
    metadata: { url: request.url },
  });
  try {
    const body = await request.json();
    const parsed = RecommendBodySchema.safeParse(body);
    if (!parsed.success) {
      if (trace && trace.id) {
        await langfuseIntegration.logEvent({
          traceId: trace.id,
          name: 'missing_recommend_context',
          metadata: { error: parsed.error.message },
        });
      }
      await upstashLogger.error(
        'persona-recommend-route',
        'context is required',
        { error: parsed.error.message }
      );
      return NextResponse.json(
        { error: 'context is required' },
        { status: 400 }
      );
    }
    const { context } = parsed.data;
    // Get recommendation
    const recommendation =
      await personaManager.getPersonaRecommendation(context);

    if (!recommendation) {
      if (trace && trace.id) {
        await langfuseIntegration.logEvent({
          traceId: trace.id,
          name: 'no_persona_found',
          metadata: { context },
        });
      }
      await upstashLogger.info(
        'persona-recommend-route',
        'No suitable persona found',
        { context }
      );
      return NextResponse.json(
        { error: 'No suitable persona found' },
        { status: 404 }
      );
    }
    if (trace && trace.id) {
      await langfuseIntegration.logEvent({
        traceId: trace.id,
        name: 'persona_recommended',
        metadata: {
          personaId: recommendation.persona.id,
          score: recommendation.score,
        },
      });
    }
    await upstashLogger.info('persona-recommend-route', 'Persona recommended', {
      personaId: recommendation.persona.id,
      score: recommendation.score,
    });
    return NextResponse.json({
      persona: {
        id: recommendation.persona.id,
        name: recommendation.persona.name,
        description: recommendation.persona.description,
      },
      score: recommendation.score,
      matchReason: recommendation.matchReason,
    });
  } catch (error) {
    if (trace && trace.id) {
      await langfuseIntegration.logEvent({
        traceId: trace.id,
        name: 'error_persona_recommend',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
    await upstashLogger.error(
      'persona-recommend-route',
      'Error getting persona recommendation',
      error instanceof Error ? error : { error }
    );
    return NextResponse.json(
      { error: 'Failed to get persona recommendation' },
      { status: 500 }
    );
  }
}

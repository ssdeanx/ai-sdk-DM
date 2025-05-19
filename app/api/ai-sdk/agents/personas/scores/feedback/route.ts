/**
 * API route for persona feedback
 */

import { NextResponse } from 'next/server';
import { personaManager } from '@/lib/agents/personas/persona-manager';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import * as langfuseIntegration from '@/lib/langfuse-integration';
import { z } from 'zod';
/**
 * POST /api/ai-sdk/agents/personas/scores/feedback
 * Record user feedback for a persona (with tracing)
 */
const feedbackSchema = z.object({
  personaId: z.string(),
  rating: z.number().min(0).max(1),
  feedback: z.string().optional(),
});

export async function POST(request: Request) {
  const trace = await langfuseIntegration.createTrace({
    name: 'POST_persona_feedback',
    metadata: { url: request.url },
  });
  try {
    const body = await request.json();
    const parseResult = feedbackSchema.safeParse(body);

    if (!parseResult.success) {
      if (trace && trace.id) {
        await langfuseIntegration.logEvent({
          traceId: trace.id,
          name: 'invalid_feedback_params',
          metadata: { errors: parseResult.error.errors },
        });
      }
      await upstashLogger.info('persona-feedback-route', 'Invalid params', {
        event: 'invalid-params',
        errors: parseResult.error.errors,
      });
      return NextResponse.json(
        { error: 'Invalid personaId, rating, or feedback' },
        { status: 400 }
      );
    }

    const { personaId, rating, feedback } = parseResult.data;

    // Record feedback
    const updatedScore = await personaManager.recordUserFeedback(
      personaId,
      rating,
      feedback as string
    );

    if (trace && trace.id) {
      await langfuseIntegration.logEvent({
        traceId: trace.id,
        name: 'persona_feedback_recorded',
        metadata: { personaId, rating, feedback, updatedScore },
      });
    }
    await upstashLogger.info('persona-feedback-route', 'Feedback recorded', {
      event: 'feedback-recorded',
      personaId,
      rating,
    });
    return NextResponse.json({ success: true, score: updatedScore });
  } catch (error) {
    if (trace && trace.id) {
      await langfuseIntegration.logEvent({
        traceId: trace.id,
        name: 'error_recording_feedback',
        metadata: { error: error instanceof Error ? error.message : error },
      });
    }
    await upstashLogger.error(
      'persona-feedback-route',
      'Error recording feedback',
      { event: 'error', error: error instanceof Error ? error.message : error }
    );
    return NextResponse.json(
      { error: 'Failed to record feedback' },
      { status: 500 }
    );
  }
}

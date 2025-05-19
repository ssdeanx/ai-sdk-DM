/**
 * API routes for persona scores
 */

import { NextResponse } from 'next/server';
import { personaManager } from '@/lib/agents/personas/persona-manager';
import { personaScoreManager } from '@/lib/agents/personas/persona-score-manager';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import * as langfuseIntegration from '@/lib/langfuse-integration';
import { z } from 'zod';

// Zod Schemas

const getScoresQuerySchema = z.object({
  personaId: z.string().optional(),
  sortBy: z.enum(['usage_count', 'success_rate', 'overall_score']).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

const postScoreBodySchema = z.object({
  personaId: z.string(),
  metrics: z.record(z.any()).optional(),
});

const getTopQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).optional(),
});

const getMostUsedQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).optional(),
});

const postFeedbackBodySchema = z.object({
  personaId: z.string(),
  rating: z.union([z.number(), z.string()]),
  feedback: z.string().optional(),
});

const postRecommendBodySchema = z.object({
  context: z.any(),
});

/**
 * GET /api/ai-sdk/agents/personas/scores
 * Get scores for all personas (with tracing)
 */
export async function GET(request: Request) {
  const trace = await langfuseIntegration.createTrace({
    name: 'GET_persona_scores',
    metadata: { url: request.url },
  });
  try {
    const url = new URL(request.url);
    const queryParams = {
      personaId: url.searchParams.get('personaId') ?? undefined,
      sortBy: url.searchParams.get('sortBy') ?? undefined,
      sortDirection: url.searchParams.get('sortDirection') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    };

    const parsedQuery = getScoresQuerySchema.safeParse(queryParams);
    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: parsedQuery.error.errors,
        },
        { status: 400 }
      );
    }
    const { personaId, sortBy, sortDirection, limit } = parsedQuery.data;
    const limitNum = limit ? parseInt(limit, 10) : undefined;

    // If personaId is provided, get score for that specific persona
    if (personaId) {
      const persona = await personaManager.getPersonaById(personaId);
      const score = await personaScoreManager.getScore(personaId);

      if (!persona) {
        if (trace && trace.id) {
          await langfuseIntegration.logEvent({
            traceId: trace.id,
            name: 'persona_not_found',
            metadata: { personaId },
          });
        }
        return NextResponse.json(
          { error: 'Persona not found' },
          { status: 404 }
        );
      }

      if (trace && trace.id) {
        await langfuseIntegration.logEvent({
          traceId: trace.id,
          name: 'persona_score_fetched',
          metadata: { personaId, score },
        });
      }

      return NextResponse.json({
        persona: {
          id: persona.id,
          name: persona.name,
          description: persona.description,
        },
        score,
      });
    }

    // Otherwise, get scores for all personas with optional sorting
    const scores = await personaScoreManager.getAllScores({
      sortBy,
      sortDirection,
      limit: limitNum,
    });

    // Get personas for each score
    const personaScores = await Promise.all(
      scores.map(async (score) => {
        const persona = await personaManager.getPersonaById(score.persona_id);
        return {
          score,
          persona: persona
            ? {
                id: persona.id,
                name: persona.name,
                description: persona.description,
              }
            : null,
        };
      })
    );

    if (trace && trace.id) {
      await langfuseIntegration.logEvent({
        traceId: trace.id,
        name: 'all_persona_scores_fetched',
        metadata: { count: personaScores.length },
      });
    }

    return NextResponse.json(personaScores);
  } catch (error) {
    if (trace && trace.id) {
      await langfuseIntegration.logEvent({
        traceId: trace.id,
        name: 'error_fetching_persona_scores',
        metadata: { error: (error as Error).message },
      });
    }
    await upstashLogger.error(
      'API_PERSONA_SCORES_GET',
      'Error fetching persona scores',
      error as Error
    );
    return NextResponse.json(
      { error: 'Failed to fetch persona scores' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-sdk/agents/personas/scores
 * Update score for a persona (with tracing)
 */
export async function POST(request: Request) {
  const trace = await langfuseIntegration.createTrace({
    name: 'POST_persona_score',
    metadata: { url: request.url },
  });
  try {
    const body = await request.json();
    const parsedBody = postScoreBodySchema.safeParse(body);

    if (!parsedBody.success) {
      if (trace && trace.id) {
        await langfuseIntegration.logEvent({
          traceId: trace.id,
          name: 'invalid_post_body',
          metadata: { errors: parsedBody.error.errors },
        });
      }
      return NextResponse.json(
        { error: 'Invalid request body', details: parsedBody.error.errors },
        { status: 400 }
      );
    }
    const { personaId, metrics } = parsedBody.data;

    // Check if persona exists
    const persona = await personaManager.getPersonaById(personaId);
    if (!persona) {
      if (trace && trace.id) {
        await langfuseIntegration.logEvent({
          traceId: trace.id,
          name: 'persona_not_found',
          metadata: { personaId },
        });
      }
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }

    // Update score with default values if metrics are not provided
    const defaultMetrics = {
      success: false,
      latency: 0,
      adaptabilityFactor: 0,
      metadata: {
        taskType: '',
        executionTime: '',
      },
      ...metrics,
    };

    const updatedScore = await personaManager.recordPersonaUsage(
      personaId,
      defaultMetrics
    );

    if (trace && trace.id) {
      await langfuseIntegration.logEvent({
        traceId: trace.id,
        name: 'persona_score_updated',
        metadata: { personaId, metrics: defaultMetrics, updatedScore },
      });
    }

    return NextResponse.json({
      persona: {
        id: persona.id,
        name: persona.name,
        description: persona.description,
      },
      score: updatedScore,
    });
  } catch (error) {
    if (trace && trace.id) {
      await langfuseIntegration.logEvent({
        traceId: trace.id,
        name: 'error_updating_persona_score',
        metadata: { error: (error as Error).message },
      });
    }
    await upstashLogger.error(
      'API_PERSONA_SCORES_POST',
      'Error updating persona score',
      error as Error
    );
    return NextResponse.json(
      { error: 'Failed to update persona score' },
      { status: 500 }
    );
  }
}
/**
 * GET /api/ai-sdk/agents/personas/scores/top
 * Get top performing personas (with tracing)
 */
export async function GET_top(request: Request) {
  const trace = await langfuseIntegration.createTrace({
    name: 'GET_top_personas',
    metadata: { url: request.url },
  });
  try {
    const url = new URL(request.url);
    const queryParams = {
      limit: url.searchParams.get('limit') ?? undefined,
    };
    const parsedQuery = getTopQuerySchema.safeParse(queryParams);
    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: parsedQuery.error.errors,
        },
        { status: 400 }
      );
    }
    const { limit } = parsedQuery.data;
    const limitNum = limit ? parseInt(limit, 10) : 5;

    const topPersonas = await personaManager.getTopPerformingPersonas(limitNum);

    if (trace && trace.id) {
      await langfuseIntegration.logEvent({
        traceId: trace.id,
        name: 'top_personas_fetched',
        metadata: { count: topPersonas.length },
      });
    }

    return NextResponse.json(
      topPersonas.map(({ persona, score }) => ({
        persona: {
          id: persona.id,
          name: persona.name,
          description: persona.description,
        },
        score,
      }))
    );
  } catch (error) {
    if (trace && trace.id) {
      await langfuseIntegration.logEvent({
        traceId: trace.id,
        name: 'error_fetching_top_personas',
        metadata: { error: (error as Error).message },
      });
    }
    await upstashLogger.error(
      'API_PERSONA_SCORES_TOP',
      'Error fetching top personas',
      error as Error
    );
    return NextResponse.json(
      { error: 'Failed to fetch top personas' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai-sdk/agents/personas/scores/most-used
 * Get most used personas (with tracing)
 */
export async function GET_mostUsed(request: Request) {
  const trace = await langfuseIntegration.createTrace({
    name: 'GET_most_used_personas',
    metadata: { url: request.url },
  });
  try {
    const url = new URL(request.url);
    const queryParams = {
      limit: url.searchParams.get('limit') ?? undefined,
    };
    const parsedQuery = getMostUsedQuerySchema.safeParse(queryParams);
    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: parsedQuery.error.errors,
        },
        { status: 400 }
      );
    }
    const { limit } = parsedQuery.data;
    const limitNum = limit ? parseInt(limit, 10) : 5;

    const mostUsedPersonas = await personaManager.getMostUsedPersonas(limitNum);

    if (trace && trace.id) {
      await langfuseIntegration.logEvent({
        traceId: trace.id,
        name: 'most_used_personas_fetched',
        metadata: { count: mostUsedPersonas.length },
      });
    }

    return NextResponse.json(
      mostUsedPersonas.map(({ persona, usageCount }) => ({
        persona: {
          id: persona.id,
          name: persona.name,
          description: persona.description,
        },
        score: usageCount, // Map usageCount to score for consistent response structure
      }))
    );
  } catch (error) {
    if (trace && trace.id) {
      await langfuseIntegration.logEvent({
        traceId: trace.id,
        name: 'error_fetching_most_used_personas',
        metadata: { error: (error as Error).message },
      });
    }
    await upstashLogger.error(
      'API_PERSONA_SCORES_MOST_USED',
      'Error fetching most used personas',
      error as Error
    );
    return NextResponse.json(
      { error: 'Failed to fetch most used personas' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-sdk/agents/personas/scores/feedback
 * Record user feedback for a persona (with tracing)
 */
export async function POST_feedback(request: Request) {
  const trace = await langfuseIntegration.createTrace({
    name: 'POST_persona_feedback',
    metadata: { url: request.url },
  });
  try {
    const body = await request.json();
    const parsedBody = postFeedbackBodySchema.safeParse(body);

    if (!parsedBody.success) {
      if (trace && trace.id) {
        await langfuseIntegration.logEvent({
          traceId: trace.id,
          name: 'invalid_feedback_body',
          metadata: { errors: parsedBody.error.errors },
        });
      }
      return NextResponse.json(
        { error: 'Invalid request body', details: parsedBody.error.errors },
        { status: 400 }
      );
    }
    const { personaId, rating, feedback } = parsedBody.data;

    if (!personaId || rating === undefined) {
      if (trace && trace.id) {
        await langfuseIntegration.logEvent({
          traceId: trace.id,
          name: 'missing_feedback_params',
          metadata: { personaId, rating },
        });
      }
      return NextResponse.json(
        { error: 'personaId and rating are required' },
        { status: 400 }
      );
    }

    // Ensure rating is between 0 and 1
    const normalizedRating = Math.max(
      0,
      Math.min(1, parseFloat(rating.toString()))
    );

    // Record feedback
    const updatedScore = await personaManager.recordUserFeedback(
      personaId,
      normalizedRating,
      feedback
    );

    if (trace && trace.id) {
      await langfuseIntegration.logEvent({
        traceId: trace.id,
        name: 'persona_feedback_recorded',
        metadata: { personaId, normalizedRating, feedback, updatedScore },
      });
    }

    return NextResponse.json({ success: true, score: updatedScore });
  } catch (error) {
    if (trace && trace.id) {
      await langfuseIntegration.logEvent({
        traceId: trace.id,
        name: 'error_recording_feedback',
        metadata: { error: (error as Error).message },
      });
    }
    await upstashLogger.error(
      'API_PERSONA_SCORES_FEEDBACK',
      'Error recording feedback',
      error as Error
    );
    return NextResponse.json(
      { error: 'Failed to record feedback' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-sdk/agents/personas/scores/recommend
 * Get a persona recommendation based on context (with tracing)
 */
export async function POST_recommend(request: Request) {
  const trace = await langfuseIntegration.createTrace({
    name: 'POST_persona_recommend',
    metadata: { url: request.url },
  });
  try {
    const body = await request.json();
    const parsedBody = postRecommendBodySchema.safeParse(body);

    if (!parsedBody.success) {
      if (trace && trace.id) {
        await langfuseIntegration.logEvent({
          traceId: trace.id,
          name: 'invalid_recommend_body',
          metadata: { errors: parsedBody.error.errors },
        });
      }
      return NextResponse.json(
        { error: 'Invalid request body', details: parsedBody.error.errors },
        { status: 400 }
      );
    }
    const { context } = parsedBody.data;

    if (!context) {
      if (trace && trace.id) {
        await langfuseIntegration.logEvent({
          traceId: trace.id,
          name: 'missing_context',
          metadata: {},
        });
      }
      return NextResponse.json(
        { error: 'context is required' },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: 'No suitable persona found' },
        { status: 404 }
      );
    }

    if (trace && trace.id) {
      await langfuseIntegration.logEvent({
        traceId: trace.id,
        name: 'persona_recommendation_found',
        metadata: {
          personaId: recommendation.persona.id,
          score: recommendation.score,
          matchReason: recommendation.matchReason,
        },
      });
    }

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
        name: 'error_getting_recommendation',
        metadata: { error: (error as Error).message },
      });
    }
    await upstashLogger.error(
      'API_PERSONA_SCORES_RECOMMEND',
      'Error getting persona recommendation',
      error as Error
    );
    return NextResponse.json(
      { error: 'Failed to get persona recommendation' },
      { status: 500 }
    );
  }
}

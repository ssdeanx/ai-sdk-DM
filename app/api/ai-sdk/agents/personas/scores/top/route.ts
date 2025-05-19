/**
 * API route for top performing personas
 */
import { personaManager } from '@/lib/agents/personas/persona-manager';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * GET /api/ai-sdk/agents/personas/scores/top
 * Get top performing personas
 */

// Zod schema for query params
const querySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 5))
    .refine((val) => Number.isInteger(val) && val > 0, {
      message: 'limit must be a positive integer',
    }),
});

// Zod schema for persona object
const personaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

// Zod schema for response
const topPersonaSchema = z.object({
  persona: personaSchema,
  score: z.number(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');

    // Validate and parse query params
    const parseResult = querySchema.safeParse({ limit: limitParam });
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      );
    }
    const limit = parseResult.data.limit;

    const topPersonas = await personaManager.getTopPerformingPersonas(limit);

    // Validate response data
    const responseData = topPersonas.map(({ persona, score }) => ({
      persona: {
        id: persona.id,
        name: persona.name,
        description: persona.description,
      },
      score,
    }));

    const responseParse = z.array(topPersonaSchema).safeParse(responseData);
    if (!responseParse.success) {
      await upstashLogger.error(
        'personas-scores-top-route',
        'Response validation failed',
        responseParse.error
      );
      return NextResponse.json(
        { error: 'Invalid response data' },
        { status: 500 }
      );
    }

    return NextResponse.json(responseParse.data);
  } catch (error) {
    await upstashLogger.error(
      'personas-scores-top-route',
      'Error fetching top personas',
      error instanceof Error ? error : { error }
    );
    return NextResponse.json(
      { error: 'Failed to fetch top personas' },
      { status: 500 }
    );
  }
}

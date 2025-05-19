/**
 * API route for most used personas
 */

import { NextResponse } from 'next/server';
import { personaManager } from '@/lib/agents/personas/persona-manager';

/**
 * GET /api/agents/personas/scores/most-used
 * Get most used personas
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 5;

    const mostUsedPersonas = await personaManager.getMostUsedPersonas(limit);

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
    return NextResponse.json(
      { error: 'Failed to fetch most used personas' },
      { status: 500 }
    );
  }
}

/**
 * API route for top performing personas
 */

import { NextResponse } from 'next/server';
import { personaManager } from '@/lib/agents/personas/persona-manager';

/**
 * GET /api/agents/personas/scores/top
 * Get top performing personas
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 5;

    const topPersonas = await personaManager.getTopPerformingPersonas(limit);

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
    console.error('Error fetching top personas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top personas' },
      { status: 500 }
    );
  }
}

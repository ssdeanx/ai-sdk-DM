/**
 * API route for persona recommendations
 */

import { NextResponse } from 'next/server';
import { personaManager } from '@/lib/agents/personas/persona-manager';

/**
 * POST /api/agents/personas/scores/recommend
 * Get a persona recommendation based on context
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { context } = body;
    
    if (!context) {
      return NextResponse.json(
        { error: 'context is required' },
        { status: 400 }
      );
    }
    
    // Get recommendation
    const recommendation = await personaManager.getPersonaRecommendation(context);
    
    if (!recommendation) {
      return NextResponse.json(
        { error: 'No suitable persona found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      persona: {
        id: recommendation.persona.id,
        name: recommendation.persona.name,
        description: recommendation.persona.description
      },
      score: recommendation.score,
      matchReason: recommendation.matchReason
    });
  } catch (error) {
    console.error('Error getting persona recommendation:', error);
    return NextResponse.json(
      { error: 'Failed to get persona recommendation' },
      { status: 500 }
    );
  }
}

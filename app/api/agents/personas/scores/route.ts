/**
 * API routes for persona scores
 */

import { NextResponse } from 'next/server';
import { personaManager } from '@/lib/agents/personas/persona-manager';
import { personaScoreManager } from '@/lib/agents/personas/persona-score-manager';

/**
 * GET /api/agents/personas/scores
 * Get scores for all personas
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const personaId = url.searchParams.get('personaId');
    const sortBy = url.searchParams.get('sortBy') as 'usage_count' | 'success_rate' | 'overall_score' | undefined;
    const sortDirection = url.searchParams.get('sortDirection') as 'asc' | 'desc' | undefined;
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    
    // If personaId is provided, get score for that specific persona
    if (personaId) {
      const { persona, score } = await personaManager.getPersonaWithScore(personaId);
      
      if (!persona) {
        return NextResponse.json(
          { error: 'Persona not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        persona: {
          id: persona.id,
          name: persona.name,
          description: persona.description
        },
        score
      });
    }
    
    // Otherwise, get scores for all personas with optional sorting
    const scores = await personaScoreManager.getAllScores({
      sortBy,
      sortDirection,
      limit
    });
    
    // Get personas for each score
    const personaScores = await Promise.all(
      scores.map(async (score) => {
        const persona = await personaManager.getPersona(score.persona_id);
        return {
          score,
          persona: persona ? {
            id: persona.id,
            name: persona.name,
            description: persona.description
          } : null
        };
      })
    );
    
    return NextResponse.json(personaScores);
  } catch (error) {
    console.error('Error fetching persona scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch persona scores' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/personas/scores
 * Update score for a persona
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { personaId, metrics } = body;
    
    if (!personaId) {
      return NextResponse.json(
        { error: 'personaId is required' },
        { status: 400 }
      );
    }
    
    // Check if persona exists
    const persona = await personaManager.getPersona(personaId);
    if (!persona) {
      return NextResponse.json(
        { error: 'Persona not found' },
        { status: 404 }
      );
    }
    
    // Update score
    const updatedScore = await personaManager.recordPersonaUsage(personaId, metrics || {});
    
    return NextResponse.json({
      persona: {
        id: persona.id,
        name: persona.name,
        description: persona.description
      },
      score: updatedScore
    });
  } catch (error) {
    console.error('Error updating persona score:', error);
    return NextResponse.json(
      { error: 'Failed to update persona score' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/personas/scores/top
 * Get top performing personas
 */
export async function GET_top(request: Request) {
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
          description: persona.description
        },
        score
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

/**
 * GET /api/agents/personas/scores/most-used
 * Get most used personas
 */
export async function GET_mostUsed(request: Request) {
  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 5;
    
    const mostUsedPersonas = await personaManager.getMostUsedPersonas(limit);
    
    return NextResponse.json(
      mostUsedPersonas.map(({ persona, score }) => ({
        persona: {
          id: persona.id,
          name: persona.name,
          description: persona.description
        },
        score
      }))
    );
  } catch (error) {
    console.error('Error fetching most used personas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch most used personas' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/personas/scores/feedback
 * Record user feedback for a persona
 */
export async function POST_feedback(request: Request) {
  try {
    const body = await request.json();
    const { personaId, rating, feedback } = body;
    
    if (!personaId || rating === undefined) {
      return NextResponse.json(
        { error: 'personaId and rating are required' },
        { status: 400 }
      );
    }
    
    // Ensure rating is between 0 and 1
    const normalizedRating = Math.max(0, Math.min(1, parseFloat(rating)));
    
    // Record feedback
    const updatedScore = await personaManager.recordUserFeedback(
      personaId,
      normalizedRating,
      feedback
    );
    
    return NextResponse.json({ success: true, score: updatedScore });
  } catch (error) {
    console.error('Error recording feedback:', error);
    return NextResponse.json(
      { error: 'Failed to record feedback' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/personas/scores/recommend
 * Get a persona recommendation based on context
 */
export async function POST_recommend(request: Request) {
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

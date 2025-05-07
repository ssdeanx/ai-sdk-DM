/**
 * API route for persona feedback
 */

import { NextResponse } from 'next/server';
import { personaManager } from '@/lib/agents/personas/persona-manager';

/**
 * POST /api/agents/personas/scores/feedback
 * Record user feedback for a persona
 */
export async function POST(request: Request) {
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

import { NextResponse } from 'next/server';

/**
 * GET /api/memory/upstash-config
 * 
 * Returns the Upstash adapter configuration
 * This endpoint is safe to call from the client as it only returns
 * public URLs without tokens
 */
export async function GET() {
  try {
    // Check if Upstash adapter is enabled
    const useUpstashAdapter = process.env.USE_UPSTASH_ADAPTER === 'true';
    
    if (!useUpstashAdapter) {
      return NextResponse.json(
        {
          enabled: false,
          error: 'Upstash adapter is not enabled'
        },
        { status: 400 }
      );
    }
    
    // Get Upstash Redis URL (without token)
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    
    // Get Upstash Vector URL (without token)
    const vectorUrl = process.env.UPSTASH_VECTOR_REST_URL;
    
    // Check if QStash is configured
    const qstashEnabled = !!process.env.QSTASH_URL && !!process.env.QSTASH_TOKEN;
    
    return NextResponse.json({
      enabled: true,
      redisUrl,
      vectorUrl,
      qstashEnabled,
      // Do not include tokens in the response
    });
  } catch (error) {
    console.error('Error getting Upstash adapter configuration:', error);
    
    return NextResponse.json(
      {
        enabled: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

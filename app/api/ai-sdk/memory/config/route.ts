import { NextResponse } from 'next/server';
import { checkUpstashAvailability } from '@/lib/memory/upstash';
import { isMemoryAvailable, getMemoryProvider } from '@/lib/memory/factory';

/**
 * GET /api/memory/config
 *
 * Returns the current memory provider configuration
 */
export async function GET() {
  try {
    // Get the configured memory provider
    const provider = getMemoryProvider();

    // Check if Upstash adapter should be used
    const useUpstashAdapter = process.env.USE_UPSTASH_ADAPTER === 'true';

    // Check if memory provider is available
    const isAvailable = await isMemoryAvailable();

    // Check Upstash availability if adapter is enabled
    let upstashAvailability = { redisAvailable: false, vectorAvailable: false };

    if (useUpstashAdapter || provider === 'upstash') {
      upstashAvailability = await checkUpstashAvailability();
    }

    return NextResponse.json({
      provider,
      useUpstashAdapter,
      isRedisAvailable: upstashAvailability.redisAvailable,
      isVectorAvailable: upstashAvailability.vectorAvailable,
      isReady: isAvailable,
      error: isAvailable ? undefined : 'Memory provider is not available',
    });
  } catch (error) {
    return NextResponse.json(
      {
        provider: 'libsql', // Default to LibSQL
        useUpstashAdapter: false,
        isRedisAvailable: false,
        isVectorAvailable: false,
        isReady: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

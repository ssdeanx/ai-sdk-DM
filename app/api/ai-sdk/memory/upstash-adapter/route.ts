import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
import { checkUpstashAvailability } from '@/lib/memory/upstash';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { z } from 'zod';

const TestTableSchema = z.object({
  id: z.string(),
  content: z.string(),
  created_at: z.string(),
});

/**
 * GET /api/ai-sdk/memory/upstash-adapter
 *
 * Retrieves the configuration and status of the Upstash adapter.
 * This includes whether the adapter is enabled, the availability of
 * Upstash Redis and Vector services, adapter version, and supported features.
 *
 * @returns {Promise<NextResponse>} A JSON response containing the adapter status
 * or an error object if the adapter is not enabled, not available, or an internal error occurs.
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Check if Upstash adapter is enabled
    const useUpstashAdapter = process.env.USE_UPSTASH_ADAPTER === 'true';

    if (!useUpstashAdapter) {
      return NextResponse.json(
        {
          enabled: false,
          error: 'Upstash adapter is not enabled',
        },
        { status: 400 }
      );
    }

    // Check Upstash availability
    const { redisAvailable, vectorAvailable } =
      await checkUpstashAvailability();

    if (!redisAvailable) {
      return NextResponse.json(
        {
          enabled: false,
          error: 'Upstash Redis is not available',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      enabled: true,
      redisAvailable,
      vectorAvailable,
      adapterVersion: '1.0.1',
      features: {
        threads: true,
        messages: true,
        embeddings: vectorAvailable,
        storage: false,
      },
    });
  } catch (error) {
    upstashLogger.error(
      'GET /api/ai-sdk/memory/upstash-adapter failed',
      JSON.stringify({
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        route: 'GET /api/ai-sdk/memory/upstash-adapter',
      })
    );
    return NextResponse.json(
      {
        enabled: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-sdk/memory/upstash-adapter
 *
 * Tests the Upstash adapter connectivity and functionality by performing a
 * simple upsert operation on a test table.
 * This endpoint helps verify that the custom Supabase adapter for Upstash is working correctly.
 *
 * @param {Request} _request - The incoming Next.js request object. It is not directly used in this function.
 * @returns {Promise<NextResponse>} A JSON response indicating the success or failure of the test.
 * On success, it may include a message and sample data.
 * On failure (e.g., adapter not enabled, Upstash unavailable, or operation error),
 * it returns an error object with a corresponding status code.
 */
export async function POST(
  _request: Request,
  { _params }: { _params: Record<string, string> }
): Promise<NextResponse> {
  try {
    // Check if Upstash adapter is enabled
    const useUpstashAdapter = process.env.USE_UPSTASH_ADAPTER === 'true';

    if (!useUpstashAdapter) {
      return NextResponse.json(
        {
          success: false,
          error: 'Upstash adapter is not enabled',
        },
        { status: 400 }
      );
    }

    // Check Upstash availability
    const { redisAvailable } = await checkUpstashAvailability();

    if (!redisAvailable) {
      return NextResponse.json(
        {
          success: false,
          error: 'Upstash Redis is not available for testing',
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Failed to initialize Supabase client for Upstash adapter test.',
        },
        { status: 500 }
      );
    }

    const testData = {
      id: `test-${Date.now()}`,
      content: 'Test data for Upstash adapter',
      created_at: new Date().toISOString(),
    };

    // Use a test table that won't affect production data
    // The Upstash TableClient upsert returns the upserted row or throws on error
    let upsertedRow;
    try {
      upsertedRow = await supabase
        .from<typeof testData>('_test_upstash_adapter', TestTableSchema)
        .upsert(testData);
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: string }).code === '42P01'
      ) {
        return NextResponse.json({
          success: true,
          message: 'Upstash adapter is working (test table not available)',
        });
      }
      throw err;
    }

    return NextResponse.json({
      success: true,
      message: 'Upstash adapter is working',
      data: upsertedRow,
    });
  } catch (error) {
    upstashLogger.error(
      'POST /api/ai-sdk/memory/upstash-adapter failed',
      JSON.stringify({
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        route: 'POST /api/ai-sdk/memory/upstash-adapter',
      })
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

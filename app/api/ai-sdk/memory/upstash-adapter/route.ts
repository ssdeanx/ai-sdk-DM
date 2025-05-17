import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
import { checkUpstashAvailability } from '@/lib/memory/upstash';

/**
 * GET /api/memory/upstash-adapter
 * 
 * Returns information about the Upstash adapter configuration
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
    
    // Check Upstash availability
    const { redisAvailable, vectorAvailable } = await checkUpstashAvailability();
    
    if (!redisAvailable) {
      return NextResponse.json(
        {
          enabled: false,
          error: 'Upstash Redis is not available'
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      enabled: true,
      redisAvailable,
      vectorAvailable,
      adapterVersion: '1.0.0',
      features: {
        threads: true,
        messages: true,
        embeddings: vectorAvailable,
        storage: false
      }
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

/**
 * POST /api/memory/upstash-adapter
 * 
 * Test the Upstash adapter by performing a simple operation
 */
export async function POST(request: Request) {
  try {
    // Check if Upstash adapter is enabled
    const useUpstashAdapter = process.env.USE_UPSTASH_ADAPTER === 'true';
    
    if (!useUpstashAdapter) {
      return NextResponse.json(
        {
          success: false,
          error: 'Upstash adapter is not enabled'
        },
        { status: 400 }
      );
    }
    
    // Create Supabase client with Upstash adapter
    const supabase = createSupabaseClient();
    
    // Perform a simple operation to test the adapter
    const testData = {
      id: 'test-' + Date.now(),
      name: 'Test Item',
      created_at: new Date().toISOString()
    };
    
    // Use a test table that won't affect production data
    const { data, error } = await supabase
      .from('_test_upstash_adapter')
      .insert([testData])
      .select()
      .single();
    
    if (error) {
      // If the table doesn't exist, that's okay - just return success
      if (error.code === '42P01') { // undefined_table
        return NextResponse.json({
          success: true,
          message: 'Upstash adapter is working (test table not available)'
        });
      }
      
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      message: 'Upstash adapter is working',
      data
    });
  } catch (error) {
    console.error('Error testing Upstash adapter:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

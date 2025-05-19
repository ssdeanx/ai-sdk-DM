import { NextResponse } from 'next/server';
import { isSupabaseAvailable } from '@/lib/memory/upstash/supabase-adapter-factory';
import { isLibSQLAvailable } from '@/lib/memory/libsql';
import { getRedisClient } from '@/lib/memory/upstash/upstashClients';
import { handleApiError } from '@/lib/api-error-handler';

// Example: List of API routes to check
const apiRoutesToCheck = [
  '/api/ai-sdk/threads',
  '/api/ai-sdk/models',
  '/api/ai-sdk/apps',
  '/api/ai-sdk/settings',
  '/api/ai-sdk/observability',
  '/api/ai-sdk/providers',
  '/api/ai-sdk/system',
  '/api/ai-sdk/files',
  '/api/ai-sdk/terminal',
];

async function checkUpstashAvailable() {
  const start = Date.now();
  try {
    const redis = getRedisClient();
    await redis.ping();
    return { available: true, latencyMs: Date.now() - start };
  } catch {
    return { available: false, latencyMs: Date.now() - start };
  }
}

async function checkSupabaseAvailable() {
  const start = Date.now();
  try {
    const available = await isSupabaseAvailable();
    return { available, latencyMs: Date.now() - start };
  } catch {
    return { available: false, latencyMs: Date.now() - start };
  }
}

async function checkLibSQLAvailable() {
  const start = Date.now();
  try {
    const available = await isLibSQLAvailable();
    return { available, latencyMs: Date.now() - start };
  } catch {
    return { available: false, latencyMs: Date.now() - start };
  }
}

async function checkApiRoutes() {
  const results: Record<string, { status: string; latencyMs: number }> = {};
  await Promise.all(
    apiRoutesToCheck.map(async (route) => {
      const start = Date.now();
      try {
        const res = await fetch(route, { method: 'HEAD' });
        results[route] = {
          status: res.ok ? 'ok' : 'fail',
          latencyMs: Date.now() - start,
        };
      } catch {
        results[route] = { status: 'fail', latencyMs: Date.now() - start };
      }
    })
  );
  return results;
}

export async function GET() {
  try {
    // Check Supabase connection
    const supabase = await checkSupabaseAvailable();
    // Check LibSQL connection
    const libsql = await checkLibSQLAvailable();
    // Check Upstash connection
    const upstash = await checkUpstashAvailable();
    // Check API route health
    const apiRoutes = await checkApiRoutes();
    return NextResponse.json({
      status: [
        {
          status: 'ok',
          timestamp: new Date().toISOString(),
          supabase: supabase.available,
          supabaseLatencyMs: supabase.latencyMs,
          libsql: libsql.available,
          libsqlLatencyMs: libsql.latencyMs,
          upstash: upstash.available,
          upstashLatencyMs: upstash.latencyMs,
          apiRoutes,
          environment: process.env.NODE_ENV,
        },
      ],
    });
  } catch (error) {
    return handleApiError(error);
  }
}

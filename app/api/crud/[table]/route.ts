/**
 *
 *
 * Generic CRUD API route for Supabase tables
 * @module app/api/crud/[table]/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getDrizzleClient } from '@/lib/memory/supabase';
import { z } from 'zod';
import * as schema from '@/db/supabase/schema';
import { eq, desc, asc } from 'drizzle-orm';
import type { Database } from '@/types/supabase';

// Define allowed tables for security
const allowedTables = ['models', 'agents', 'tools', 'settings'];

// Define a schema for the query parameters
const QuerySchema = z.object({
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
  orderBy: z.string().optional(),
  orderDir: z.enum(['asc', 'desc']).optional(),
});

/**
 * GET handler for retrieving items
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { table: string } }
) {
  const { table } = params;

  // Security check: only allow specific tables
  if (!allowedTables.includes(table)) {
    return NextResponse.json({ error: 'Table not allowed' }, { status: 403 });
  }

  try {
    // Parse query parameters
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const { limit, offset, orderBy, orderDir } =
      QuerySchema.parse(searchParams);

    // Get ID from query params if it exists
    const id = url.searchParams.get('id');

    // Use Drizzle if enabled
    if (process.env.USE_DRIZZLE === 'true') {
      try {
        const db = getDrizzleClient();

        // Get the table schema dynamically
        const tableSchema = (schema as any)[table];

        if (!tableSchema) {
          console.error(
            `Table schema not found for ${table}, falling back to Supabase`
          );
          // Continue to Supabase fallback
        } else {
          // If ID is provided, get a single item
          if (id) {
            const result = await db
              .select()
              .from(tableSchema)
              .where(eq(tableSchema.id, id))
              .limit(1);

            if (result.length === 0) {
              return NextResponse.json(
                { error: 'Item not found' },
                { status: 404 }
              );
            }

            return NextResponse.json(result[0]);
          }

          // Otherwise, get all items with filters
          // For simplicity, we'll just get all items and filter in memory
          // This avoids TypeScript errors with dynamic table schemas
          const allItems = await db.select().from(tableSchema);

          // Filter and sort in memory
          let result = [...allItems];

          // Apply ordering
          if (orderBy && result.length > 0 && orderBy in result[0]) {
            result.sort((a: any, b: any) => {
              if (a[orderBy] < b[orderBy]) return orderDir === 'desc' ? 1 : -1;
              if (a[orderBy] > b[orderBy]) return orderDir === 'desc' ? -1 : 1;
              return 0;
            });
          }

          // Apply pagination
          if (offset !== undefined || limit !== undefined) {
            const start = offset || 0;
            const end = limit ? start + limit : undefined;
            result = result.slice(start, end);
          }

          return NextResponse.json(result);
        }
      } catch (drizzleError) {
        console.error(
          'Error using Drizzle, falling back to Supabase:',
          drizzleError
        );
        // Continue to Supabase fallback
      }
    }

    // Fall back to Supabase client
    const supabase = getSupabaseClient();

    // If ID is provided, get a single item
    if (id) {
      const { data, error } = await supabase
        .from(table as keyof Database['public']['Tables'])
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: error.code === '22P02' ? 400 : 500 }
        );
      }

      if (!data) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      return NextResponse.json(data);
    }

    // Otherwise, get all items with filters
    let query = supabase
      .from(table as keyof Database['public']['Tables'])
      .select('*');

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy, { ascending: orderDir !== 'desc' });
    }

    // Apply pagination
    if (limit !== undefined) {
      query = query.limit(limit);

      if (offset !== undefined) {
        query = query.range(offset, offset + limit - 1);
      }
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error in GET /${params.table}:`, error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating items
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { table: string } }
) {
  const { table } = params;

  // Security check: only allow specific tables
  if (!allowedTables.includes(table)) {
    return NextResponse.json({ error: 'Table not allowed' }, { status: 403 });
  }

  try {
    // Parse request body
    const body = await request.json();

    // Use Drizzle if enabled
    if (process.env.USE_DRIZZLE === 'true') {
      try {
        const db = getDrizzleClient();

        // Get the table schema dynamically
        const tableSchema = (schema as any)[table];

        if (!tableSchema) {
          console.error(
            `Table schema not found for ${table}, falling back to Supabase`
          );
          // Continue to Supabase fallback
        } else {
          // Insert the item
          const result = await db.insert(tableSchema).values(body).returning();

          if (result.length === 0) {
            return NextResponse.json(
              { error: 'Failed to create item' },
              { status: 500 }
            );
          }

          return NextResponse.json(result[0], { status: 201 });
        }
      } catch (drizzleError) {
        console.error(
          'Error using Drizzle, falling back to Supabase:',
          drizzleError
        );
        // Continue to Supabase fallback
      }
    }

    // Fall back to Supabase client
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from(table as keyof Database['public']['Tables'])
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error(`Error in POST /${params.table}:`, error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler for updating items
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { table: string } }
) {
  const { table } = params;

  // Security check: only allow specific tables
  if (!allowedTables.includes(table)) {
    return NextResponse.json({ error: 'Table not allowed' }, { status: 403 });
  }

  try {
    // Parse request body
    const body = await request.json();

    // Get ID from query params
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required for updates' },
        { status: 400 }
      );
    }

    // Use Drizzle if enabled
    if (process.env.USE_DRIZZLE === 'true') {
      try {
        const db = getDrizzleClient();

        // Get the table schema dynamically
        const tableSchema = (schema as any)[table];

        if (!tableSchema) {
          console.error(
            `Table schema not found for ${table}, falling back to Supabase`
          );
          // Continue to Supabase fallback
        } else {
          // Update the item
          const result = await db
            .update(tableSchema)
            .set(body)
            .where(eq(tableSchema.id, id))
            .returning();

          if (result.length === 0) {
            return NextResponse.json(
              { error: 'Item not found' },
              { status: 404 }
            );
          }

          return NextResponse.json(result[0]);
        }
      } catch (drizzleError) {
        console.error(
          'Error using Drizzle, falling back to Supabase:',
          drizzleError
        );
        // Continue to Supabase fallback
      }
    }

    // Fall back to Supabase client
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from(table as keyof Database['public']['Tables'])
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error in PATCH /${params.table}:`, error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for deleting items
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { table: string } }
) {
  const { table } = params;

  // Security check: only allow specific tables
  if (!allowedTables.includes(table)) {
    return NextResponse.json({ error: 'Table not allowed' }, { status: 403 });
  }

  try {
    // Get ID from query params
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required for deletion' },
        { status: 400 }
      );
    }

    // Use Drizzle if enabled
    if (process.env.USE_DRIZZLE === 'true') {
      try {
        const db = getDrizzleClient();

        // Get the table schema dynamically
        const tableSchema = (schema as any)[table];

        if (!tableSchema) {
          console.error(
            `Table schema not found for ${table}, falling back to Supabase`
          );
          // Continue to Supabase fallback
        } else {
          // Delete the item
          const result = await db
            .delete(tableSchema)
            .where(eq(tableSchema.id, id))
            .returning();

          // If no rows were affected, the item might not exist
          if (result.length === 0) {
            return NextResponse.json(
              { error: 'Item not found or already deleted' },
              { status: 404 }
            );
          }

          return NextResponse.json({ success: true });
        }
      } catch (drizzleError) {
        console.error(
          'Error using Drizzle, falling back to Supabase:',
          drizzleError
        );
        // Continue to Supabase fallback
      }
    }

    // Fall back to Supabase client
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from(table as keyof Database['public']['Tables'])
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error in DELETE /${params.table}:`, error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

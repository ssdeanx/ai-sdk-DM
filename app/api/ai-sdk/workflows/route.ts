import { NextRequest, NextResponse } from 'next/server';
import { workflow } from '@/lib/workflow';
import { z } from 'zod';

// Canonical Zod schema for creating a workflow
const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  steps: z
    .array(
      z.object({
        agentId: z.string().min(1, 'Agent ID is required'),
        input: z.string().optional(),
        threadId: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .optional(),
  metadata: z.record(z.any()).optional(),
});

// GET /api/workflows - List all workflows
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = z.coerce
      .number()
      .min(1)
      .max(100)
      .default(10)
      .parse(searchParams.get('limit'));
    const offset = z.coerce
      .number()
      .min(0)
      .default(0)
      .parse(searchParams.get('offset'));

    // Get workflows
    const workflows = await workflow.listWorkflows(limit, offset);

    // TODO: Add output validation if workflow.listWorkflows returns raw data
    return NextResponse.json({ workflows });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to list workflows',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST /api/workflows - Create a new workflow
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request body
    const validationResult = createWorkflowSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    // Create workflow
    const newWorkflow = await workflow.createWorkflow(validationResult.data);

    // TODO: Add output validation if workflow.createWorkflow returns raw data
    return NextResponse.json({ workflow: newWorkflow }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to create workflow',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { workflow } from '@/lib/workflow';
import { z } from 'zod';

// Canonical Zod schema for updating a workflow
const updateWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// GET /api/workflows/:id - Get a specific workflow
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get workflow
    const workflowData = await workflow.getWorkflow(id);

    if (!workflowData) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // TODO: Add output validation if workflow.getWorkflow returns raw data
    return NextResponse.json({ workflow: workflowData });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to get workflow',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// PUT /api/workflows/:id - Update a workflow
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Parse request body
    const body = await request.json();

    // Validate request body
    const validationResult = updateWorkflowSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    // Check if workflow exists
    const existingWorkflow = await workflow.getWorkflow(id);
    if (!existingWorkflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Update workflow
    const updatedWorkflow = await workflow.updateWorkflow(
      id,
      validationResult.data
    );

    // TODO: Add output validation if workflow.updateWorkflow returns raw data
    return NextResponse.json({ workflow: updatedWorkflow });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to update workflow',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE /api/workflows/:id - Delete a workflow
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if workflow exists
    const existingWorkflow = await workflow.getWorkflow(id);
    if (!existingWorkflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Delete workflow
    await workflow.deleteWorkflow(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to delete workflow',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

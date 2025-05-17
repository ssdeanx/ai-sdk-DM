import { NextRequest, NextResponse } from 'next/server';
import { workflow } from '@/lib/workflow';
import { z } from 'zod';

// Schema for adding a step to a workflow
const addStepSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  input: z.string().optional(),
  threadId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// POST /api/workflows/:id/steps - Add a step to a workflow
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Parse request body
    const body = await request.json();

    // Validate request body
    const validationResult = addStepSchema.safeParse(body);
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

    // Add step to workflow
    const updatedWorkflow = await workflow.addWorkflowStep(
      id,
      validationResult.data
    );

    return NextResponse.json({ workflow: updatedWorkflow });
  } catch (error) {
    console.error(`Error adding step to workflow ${params.id}:`, error);
    return NextResponse.json(
      {
        error: 'Failed to add step to workflow',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

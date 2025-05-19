import { NextRequest, NextResponse } from 'next/server';
import { workflow } from '@/lib/workflow';
import { z } from 'zod';

// Zod schema for adding a step to a workflow
const addStepSchema = z.object({
  agentId: z.string(),
  input: z.string().optional(),
  threadId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// POST /api/ai-sdk/workflows/:id/steps - Add a step to a workflow
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const parsed = addStepSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.format() },
        { status: 400 }
      );
    }
    const existingWorkflow = await workflow.getWorkflow(id);
    if (!existingWorkflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }
    const updatedWorkflow = await workflow.addWorkflowStep(id, parsed.data);
    return NextResponse.json({ workflow: updatedWorkflow });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to add workflow step',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

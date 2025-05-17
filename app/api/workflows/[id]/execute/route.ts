import { NextRequest, NextResponse } from 'next/server';
import { workflow } from '@/lib/workflow';

// POST /api/workflows/:id/execute - Execute a workflow
export async function POST(
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

    // Execute workflow
    const executedWorkflow = await workflow.executeWorkflow(id);

    return NextResponse.json({ workflow: executedWorkflow });
  } catch (error) {
    console.error(`Error executing workflow ${params.id}:`, error);
    return NextResponse.json(
      {
        error: 'Failed to execute workflow',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

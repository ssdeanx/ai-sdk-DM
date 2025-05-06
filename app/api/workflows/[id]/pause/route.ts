import { NextRequest, NextResponse } from 'next/server';
import { workflow } from '@/lib/workflow';

// POST /api/workflows/:id/pause - Pause a workflow
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
    
    // Check if workflow is running
    if (existingWorkflow.status !== 'running') {
      return NextResponse.json(
        { error: 'Workflow is not running' },
        { status: 400 }
      );
    }
    
    // Pause workflow
    const updatedWorkflow = await workflow.updateWorkflow(id, { status: 'paused' });
    
    return NextResponse.json({ workflow: updatedWorkflow });
  } catch (error) {
    console.error(`Error pausing workflow ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to pause workflow', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

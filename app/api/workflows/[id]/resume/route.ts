import { NextRequest, NextResponse } from 'next/server';
import { workflow } from '@/lib/workflow';

// POST /api/workflows/:id/resume - Resume a workflow
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
    
    // Check if workflow is paused
    if (existingWorkflow.status !== 'paused') {
      return NextResponse.json(
        { error: 'Workflow is not paused' },
        { status: 400 }
      );
    }
    
    // Resume workflow
    const updatedWorkflow = await workflow.updateWorkflow(id, { status: 'running' });
    
    // Execute workflow
    const executedWorkflow = await workflow.executeWorkflow(id);
    
    return NextResponse.json({ workflow: executedWorkflow });
  } catch (error) {
    console.error(`Error resuming workflow ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to resume workflow', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

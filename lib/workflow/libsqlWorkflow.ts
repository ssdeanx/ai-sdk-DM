import { getGoogleAI } from '../ai';
import { WorkflowAbort, WorkflowContext } from '@upstash/workflow';
import { getLibSQLClient } from '../memory/db';

/**
 * Creates a Google AI instance that can be used within a workflow context
 * This implementation is specific to LibSQL/Turso
 */
export const createWorkflowGoogleAI = (context: WorkflowContext) => {
  const googleAI = getGoogleAI();
  const model = googleAI('gemini-2.0-flash-exp');

  // Wrap the model with workflow context
  return {
    ...model,
    async generate(params: any) {
      try {
        // Call the model through the workflow
        const result = await context.call('ai-generate-step', params);
        return result;
      } catch (error) {
        if (error instanceof WorkflowAbort) {
          throw error;
        } else {
          console.error('Error in workflow AI generation:', error);
          throw error;
        }
      }
    },
  };
};

/**
 * Executes a SQL query within a workflow step
 * This is a helper function for LibSQL/Turso workflows
 */
export const executeWorkflowQuery = async (
  query: string,
  params: any[] = []
) => {
  try {
    const db = getLibSQLClient();
    const result = await db.execute({
      sql: query,
      args: params,
    });
    return result;
  } catch (error) {
    console.error('Error executing workflow query:', error);
    throw error;
  }
};

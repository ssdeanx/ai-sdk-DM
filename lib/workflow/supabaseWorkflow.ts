import { getGoogleAI } from '../ai';
import { WorkflowAbort, WorkflowContext } from '@upstash/workflow';

/**
 * Creates a Google AI instance that can be used within a workflow context
 * This implementation is specific to Supabase Workflow
 */
export const createWorkflowGoogleAI = (context: WorkflowContext) => {
  // Get the Google AI provider
  const googleAI = getGoogleAI();
  // Get the model
  const model = googleAI('gemini-1.5-pro');

  // Return a wrapped model that uses the workflow context for API calls
  return {
    ...model,
    async generate(params: any) {
      try {
        // Make the API call through the workflow context
        // Pass the parameters directly to the workflow step
        const responseInfo = await context.call('openai-call-step', params);

        return responseInfo;
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

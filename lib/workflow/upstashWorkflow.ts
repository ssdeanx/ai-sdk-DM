import { getGoogleAI } from '../ai';
import { HTTPMethods } from '@upstash/qstash';
import { WorkflowAbort, WorkflowContext } from '@upstash/workflow';

export const createWorkflowGoogleAI = (context: WorkflowContext) => {
  return getGoogleAI({
    compatibility: "strict",
    fetch: async (input, init) => {
      try {
        // Prepare headers from init.headers
        const headers = init?.headers
          ? Object.fromEntries(new Headers(init.headers).entries())
          : {};

        // Prepare body from init.body
        const body = init?.body ? JSON.parse(init.body as string) : undefined;

        // Make network call
        const responseInfo = await context.call("openai-call-step", {
          url: input.toString(),
          method: init?.method as HTTPMethods,
          headers,
          body,
        });

        // Construct headers for the response
        const responseHeaders = new Headers(
          Object.entries(responseInfo.header).reduce((acc, [key, values]) => {
            acc[key] = values.join(", ");
            return acc;
          }, {} as Record<string, string>)
        );

        // Return the constructed response
        return new Response(JSON.stringify(responseInfo.body), {
          status: responseInfo.status,
          headers: responseHeaders,
        });
      } catch (error) {
        if (error instanceof WorkflowAbort) {
          throw error
        } else {
          console.error("Error in fetch implementation:", error);
          throw error; // Rethrow error for further handling
        }
      }
    },
  });
};
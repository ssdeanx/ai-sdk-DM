import { NextResponse } from 'next/server';
import { AssistantResponse } from 'ai';
import OpenAI from 'openai';
import { createMemoryThread, saveMessage } from '@/lib/memory/memory';
import { createTrace, logEvent } from '@/lib/langfuse-integration';
import { handleApiError } from '@/lib/api-error-handler';
import { v4 as uuidv4 } from 'uuid';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { threadId, message } = await req.json();

    // Validate request
    if (!message || !message.content) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Create a trace for this assistant interaction
    const trace = await createTrace({
      name: 'openai_assistant_interaction',
      userId: threadId || 'anonymous',
      metadata: {
        messageContent: message.content,
      },
    });

    // Log the user message event
    if (trace?.id) {
      await logEvent({
        traceId: trace.id,
        name: 'user_message',
        metadata: {
          role: 'user',
          content: message.content,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return AssistantResponse({
      threadId,
      messageId: message.id,

      async process({ forwardStream, sendDataMessage }) {
        try {
          // Create a thread if needed
          const openaiThreadId =
            threadId ?? (await openai.beta.threads.create({})).id;

          // If this is a new thread, create a memory thread for persistence
          if (!threadId) {
            try {
              await createMemoryThread('OpenAI Assistant Chat', {
                metadata: {
                  source: 'openai-assistant',
                  openai_thread_id: openaiThreadId,
                  created_at: new Date().toISOString(),
                },
              });
            } catch (error) {
              console.error('Error creating memory thread:', error);
            }
          }

          // Save user message to memory
          try {
            await saveMessage(openaiThreadId, 'user', message.content, {
              count_tokens: true,
              metadata: {
                source: 'openai-assistant',
                timestamp: new Date().toISOString(),
                message_id: message.id,
              },
            });
          } catch (error) {
            console.error('Error saving user message:', error);
          }

          // Add user message to thread
          await openai.beta.threads.messages.create(openaiThreadId, {
            role: 'user',
            content: message.content,
          });

          // Send initial status
          sendDataMessage({ type: 'status', status: 'started' });

          // Run the assistant
          let runResult = await forwardStream(
            openai.beta.threads.runs.createAndStream(openaiThreadId, {
              assistant_id: process.env.OPENAI_ASSISTANT_ID!,
            })
          );

          // Handle tool calls if needed
          while (runResult.status === 'requires_action') {
            const toolCalls =
              runResult.required_action!.submit_tool_outputs.tool_calls;
            const tool_outputs = [];

            // Process each tool call
            for (const toolCall of toolCalls) {
              try {
                // Log tool call
                if (trace?.id) {
                  await logEvent({
                    traceId: trace.id,
                    name: 'tool_call',
                    metadata: {
                      tool_call_id: toolCall.id,
                      tool_name: toolCall.function.name,
                      arguments: toolCall.function.arguments,
                      timestamp: new Date().toISOString(),
                    },
                  });
                }

                // Execute the tool (in a real implementation, you would have a tool registry)
                let toolOutput;
                switch (toolCall.function.name) {
                  case 'get_current_weather':
                    toolOutput = await executeWeatherTool(
                      JSON.parse(toolCall.function.arguments)
                    );
                    break;
                  case 'search_web':
                    toolOutput = await executeSearchTool(
                      JSON.parse(toolCall.function.arguments)
                    );
                    break;
                  default:
                    toolOutput = {
                      error: `Tool ${toolCall.function.name} not implemented`,
                    };
                }

                // Log tool result
                if (trace?.id) {
                  await logEvent({
                    traceId: trace.id,
                    name: 'tool_result',
                    metadata: {
                      tool_call_id: toolCall.id,
                      tool_name: toolCall.function.name,
                      result: toolOutput,
                      timestamp: new Date().toISOString(),
                    },
                  });
                }

                // Add to tool outputs
                tool_outputs.push({
                  tool_call_id: toolCall.id,
                  output: JSON.stringify(toolOutput),
                });
              } catch (error) {
                console.error(
                  `Error executing tool ${toolCall.function.name}:`,
                  error
                );
                tool_outputs.push({
                  tool_call_id: toolCall.id,
                  output: JSON.stringify({
                    error: `Error executing tool: ${error.message || 'Unknown error'}`,
                  }),
                });
              }
            }

            // Submit tool outputs
            runResult = await forwardStream(
              openai.beta.threads.runs.submitToolOutputsStream(
                openaiThreadId,
                runResult.id,
                { tool_outputs }
              )
            );
          }

          // Get the assistant's response
          const messages =
            await openai.beta.threads.messages.list(openaiThreadId);
          const assistantMessages = messages.data.filter(
            (msg) => msg.role === 'assistant'
          );

          if (assistantMessages.length > 0) {
            const latestMessage = assistantMessages[0];

            // Save assistant message to memory
            try {
              await saveMessage(
                openaiThreadId,
                'assistant',
                typeof latestMessage.content[0].text === 'object'
                  ? latestMessage.content[0].text.value
                  : JSON.stringify(latestMessage.content),
                {
                  count_tokens: true,
                  generate_embeddings: true,
                  metadata: {
                    source: 'openai-assistant',
                    timestamp: new Date().toISOString(),
                    message_id: latestMessage.id,
                    run_id: runResult.id,
                  },
                }
              );
            } catch (error) {
              console.error('Error saving assistant message:', error);
            }

            // Log assistant message
            if (trace?.id) {
              await logEvent({
                traceId: trace.id,
                name: 'assistant_message',
                metadata: {
                  role: 'assistant',
                  content:
                    typeof latestMessage.content[0].text === 'object'
                      ? latestMessage.content[0].text.value
                      : JSON.stringify(latestMessage.content),
                  timestamp: new Date().toISOString(),
                  message_id: latestMessage.id,
                  run_id: runResult.id,
                },
              });
            }
          }

          // Send completion status
          sendDataMessage({ type: 'status', status: 'completed' });
        } catch (error) {
          console.error('Error in assistant process:', error);
          sendDataMessage({
            type: 'error',
            error: error.message || 'Unknown error in assistant process',
          });
        }
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// Mock tool implementations
async function executeWeatherTool(args: { location: string }) {
  // In a real implementation, this would call a weather API
  return {
    temperature: 72,
    unit: 'fahrenheit',
    conditions: 'Partly Cloudy',
    humidity: 45,
    windSpeed: 10,
    windUnit: 'mph',
    windDirection: 'NE',
  };
}

async function executeSearchTool(args: { query: string }) {
  // In a real implementation, this would call a search API
  return {
    results: [
      {
        title: 'Search Result 1',
        url: 'https://example.com/1',
        snippet: 'This is the first search result.',
      },
      {
        title: 'Search Result 2',
        url: 'https://example.com/2',
        snippet: 'This is the second search result.',
      },
    ],
  };
}

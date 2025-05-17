/**
 * Langfuse Integration Module
 *
 * This module provides a comprehensive integration with Langfuse for tracing,
 * observability, and model evaluation in AI applications.
 */

import { Langfuse } from 'langfuse';

// Initialize Langfuse client with configuration
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY as string,
  secretKey: process.env.LANGFUSE_SECRET_KEY as string,
  baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
});

// Create a trace
export async function createTrace({
  name,
  userId,
  metadata,
}: {
  name: string;
  userId?: string;
  metadata?: any;
}) {
  try {
    const trace = langfuse.trace({
      name,
      userId,
      metadata,
    });
    return trace;
  } catch (error) {
    console.error('Langfuse trace creation error:', error);
    // Don't throw - we don't want to break the application if tracing fails
    return null;
  }
}

// Create a generation
export async function createGeneration({
  traceId,
  name,
  model,
  modelParameters,
  input,
  output,
  startTime,
  endTime,
  metadata,
}: {
  traceId: string;
  name: string;
  model: string;
  modelParameters?: any;
  input: any; // Use 'any' or a more specific type like CoreMessage[] | string
  output: any; // Use 'any' or a more specific type like string
  startTime: Date;
  endTime: Date;
  metadata?: any;
}) {
  try {
    const generation = langfuse.generation({
      traceId,
      name,
      model,
      modelParameters,
      input,
      output,
      startTime,
      endTime,
      metadata,
    });
    return generation;
  } catch (error) {
    console.error('Langfuse generation creation error:', error);
    // Don't throw - we don't want to break the application if tracing fails
    return null;
  }
}

/**
 * Create a span to measure the duration of an operation
 *
 * @param options - Configuration options for the span
 * @param options.traceId - The ID of the trace this span belongs to
 * @param options.name - The name of the span
 * @param options.startTime - The start time of the span
 * @param options.endTime - The end time of the span
 * @param options.metadata - Optional additional metadata for the span
 * @param options.parentObservationId - Optional ID of the parent span or generation
 * @returns The created span object or null if there was an error
 */
export async function createSpan({
  traceId,
  name,
  startTime,
  endTime,
  metadata,
  parentObservationId,
}: {
  traceId: string;
  name: string;
  startTime: Date;
  endTime: Date;
  metadata?: any;
  parentObservationId?: string;
}) {
  try {
    // Create span parameters
    const spanParams: any = {
      traceId,
      name,
      startTime,
      endTime,
      metadata,
    };

    // Add parent observation ID if provided
    if (parentObservationId) {
      spanParams.parentObservationId = parentObservationId;
    }

    const span = langfuse.span(spanParams);
    return span;
  } catch (error) {
    console.error('Langfuse span creation error:', error);
    // Don't throw - we don't want to break the application if tracing fails
    return null;
  }
}

/**
 * Create and start a span, returning a function to end it
 *
 * @param options - Configuration options for the span
 * @param options.traceId - The ID of the trace this span belongs to
 * @param options.name - The name of the span
 * @param options.metadata - Optional additional metadata for the span
 * @param options.parentObservationId - Optional ID of the parent span or generation
 * @returns An object with the span and an end function
 */
export function startSpan({
  traceId,
  name,
  metadata,
  parentObservationId,
}: {
  traceId: string;
  name: string;
  metadata?: any;
  parentObservationId?: string;
}) {
  const startTime = new Date();

  return {
    spanId: `span-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    end: async (endMetadata?: any) => {
      const endTime = new Date();

      // Merge initial metadata with end metadata
      const mergedMetadata = {
        ...metadata,
        ...endMetadata,
        durationMs: endTime.getTime() - startTime.getTime(),
      };

      return await createSpan({
        traceId,
        name,
        startTime,
        endTime,
        metadata: mergedMetadata,
        parentObservationId,
      });
    },
  };
}

// Log an event
export async function logEvent({
  traceId,
  name,
  metadata,
}: {
  traceId: string;
  name: string;
  metadata?: any;
}) {
  try {
    const event = langfuse.event({
      traceId,
      name,
      metadata,
    });
    return event;
  } catch (error) {
    console.error('Langfuse event creation error:', error);
    // Don't throw - we don't want to break the application if tracing fails
    return null;
  }
}

/**
 * Score a generation or trace for model evaluation
 *
 * @param options - Configuration options for scoring
 * @param options.traceId - The ID of the trace to score
 * @param options.name - The name of the score
 * @param options.value - The score value (typically between 0 and 1)
 * @param options.generationId - Optional ID of the specific generation to score
 * @param options.comment - Optional comment explaining the score
 * @returns The created score object or null if there was an error
 */
export async function scoreGeneration({
  traceId,
  name,
  value,
  generationId,
  comment,
}: {
  traceId: string;
  name: string;
  value: number;
  generationId?: string;
  comment?: string;
}) {
  try {
    // Create the score with the available parameters
    const scoreParams: any = {
      traceId,
      name,
      value,
    };

    // Add comment if provided
    if (comment) {
      scoreParams.comment = comment;
    } else if (generationId) {
      // If no comment but we have a generationId, create a comment that references it
      scoreParams.comment = `Score for generation ${generationId}`;
    }

    const score = langfuse.score(scoreParams);
    return score;
  } catch (error) {
    console.error('Langfuse score creation error:', error);
    // Don't throw - we don't want to break the application if scoring fails
    return null;
  }
}

/**
 * Log a prompt template for prompt management and versioning
 *
 * @param options - Configuration options for the prompt
 * @param options.name - The name of the prompt template
 * @param options.prompt - The prompt template string or object
 * @param options.version - Optional version identifier
 * @param options.tags - Optional tags for categorizing the prompt
 * @returns The created prompt object or null if there was an error
 */
export async function logPrompt({
  name,
  prompt,
  version,
  tags,
  traceId,
}: {
  name: string;
  prompt: string | object;
  version?: string;
  tags?: string[];
  traceId?: string;
}) {
  try {
    const promptContent =
      typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
    const promptMetadata = {
      promptName: name,
      promptContent,
      ...(version ? { version } : {}),
      ...(tags ? { tags } : {}),
    };

    // If we have a traceId, create an event linked to the trace
    if (traceId) {
      langfuse.event({
        traceId,
        name: `prompt_template_${name}`,
        metadata: promptMetadata,
      });
    } else {
      // Otherwise create a standalone trace for this prompt
      const trace = langfuse.trace({
        name: `prompt_template_${name}`,
        metadata: promptMetadata,
      });

      // Add an event to the trace
      if (trace?.id) {
        langfuse.event({
          traceId: trace.id,
          name: 'prompt_created',
          metadata: {
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    // Return a structured object representing the prompt
    return {
      id: `prompt-${Date.now()}`,
      name,
      prompt: promptContent,
      version,
      tags,
    };
  } catch (error) {
    console.error('Langfuse prompt creation error:', error);
    // Don't throw - we don't want to break the application if prompt logging fails
    return null;
  }
}

/**
 * Create a dataset for model evaluation
 *
 * @param options - Configuration options for the dataset
 * @param options.name - The name of the dataset
 * @param options.description - Optional description of the dataset
 * @param options.items - Optional array of dataset items
 * @returns The created dataset trace ID or null if there was an error
 */
export async function createDataset({
  name,
  description,
  items = [],
}: {
  name: string;
  description?: string;
  items?: Array<{
    input: any;
    expectedOutput?: any;
    metadata?: any;
  }>;
}) {
  try {
    // Create a trace to represent the dataset
    const trace = langfuse.trace({
      name: `dataset_${name}`,
      metadata: {
        type: 'dataset',
        description,
        itemCount: items.length,
        createdAt: new Date().toISOString(),
      },
    });

    if (!trace?.id) {
      throw new Error('Failed to create dataset trace');
    }

    // Log each dataset item as a generation
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      langfuse.generation({
        traceId: trace.id,
        name: `dataset_item_${i}`,
        model: 'dataset_item',
        input: item.input,
        output: item.expectedOutput || '',
        metadata: {
          ...item.metadata,
          isDatasetItem: true,
          itemIndex: i,
        },
      });
    }

    // Log dataset creation event
    langfuse.event({
      traceId: trace.id,
      name: 'dataset_created',
      metadata: {
        timestamp: new Date().toISOString(),
        itemCount: items.length,
      },
    });

    return {
      id: trace.id,
      name,
      description,
      itemCount: items.length,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Langfuse dataset creation error:', error);
    return null;
  }
}

/**
 * Log a model evaluation run
 *
 * @param options - Configuration options for the evaluation run
 * @param options.name - The name of the evaluation run
 * @param options.modelId - The ID of the model being evaluated
 * @param options.datasetId - The ID of the dataset used for evaluation
 * @param options.metrics - The evaluation metrics
 * @param options.results - Optional array of individual evaluation results
 * @returns The created evaluation run trace ID or null if there was an error
 */
/**
 * Log user feedback for a generation or trace
 *
 * @param options - Configuration options for the feedback
 * @param options.traceId - The ID of the trace to score
 * @param options.rating - The user rating (typically 1-5 or true/false for thumbs up/down)
 * @param options.generationId - Optional ID of the specific generation to rate
 * @param options.comment - Optional user comment
 * @param options.userId - Optional ID of the user providing feedback
 * @returns The created feedback score object or null if there was an error
 */
export async function logUserFeedback({
  traceId,
  rating,
  generationId,
  comment,
  userId,
}: {
  traceId: string;
  rating: number | boolean;
  generationId?: string;
  comment?: string;
  userId?: string;
}) {
  try {
    // Convert boolean ratings to numbers (true = 1, false = 0)
    const numericRating =
      typeof rating === 'boolean' ? (rating ? 1 : 0) : rating;

    // Create the score with the available parameters
    const scoreParams: any = {
      traceId,
      name: 'user_feedback',
      value: numericRating,
    };

    // Add comment if provided
    if (comment) {
      scoreParams.comment = comment;
    }

    // Create the score
    langfuse.score(scoreParams);

    // Log additional event with more context
    langfuse.event({
      traceId,
      name: 'user_feedback_received',
      metadata: {
        rating: numericRating,
        generationId,
        comment,
        userId,
        timestamp: new Date().toISOString(),
      },
    });

    // Return a structured response
    return {
      traceId,
      rating: numericRating,
      generationId,
      comment,
      userId,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Langfuse user feedback error:', error);
    return null;
  }
}

export async function logEvaluationRun({
  name,
  modelId,
  datasetId,
  metrics,
  results = [],
}: {
  name: string;
  modelId: string;
  datasetId: string;
  metrics: Record<string, number>;
  results?: Array<{
    input: any;
    output: any;
    expectedOutput?: any;
    scores: Record<string, number>;
    metadata?: any;
  }>;
}) {
  try {
    // Create a trace to represent the evaluation run
    const trace = langfuse.trace({
      name: `eval_run_${name}`,
      metadata: {
        type: 'evaluation_run',
        modelId,
        datasetId,
        metrics,
        resultCount: results.length,
        createdAt: new Date().toISOString(),
      },
    });

    if (!trace?.id) {
      throw new Error('Failed to create evaluation run trace');
    }

    // Log overall metrics as scores
    for (const [metricName, metricValue] of Object.entries(metrics)) {
      langfuse.score({
        traceId: trace.id,
        name: metricName,
        value: metricValue,
        comment: `Overall ${metricName} for model ${modelId} on dataset ${datasetId}`,
      });
    }

    // Log each evaluation result
    for (let i = 0; i < results.length; i++) {
      const result = results[i];

      // Create a generation for this evaluation result
      const generation = langfuse.generation({
        traceId: trace.id,
        name: `eval_result_${i}`,
        model: modelId,
        input: result.input,
        output: result.output,
        metadata: {
          ...result.metadata,
          expectedOutput: result.expectedOutput,
          isEvaluationResult: true,
          resultIndex: i,
        },
      });

      // Log scores for this generation
      if (generation?.id) {
        for (const [scoreName, scoreValue] of Object.entries(result.scores)) {
          langfuse.score({
            traceId: trace.id,
            name: scoreName,
            value: scoreValue,
            comment: `Score for generation ${generation.id}, result ${i}`,
          });
        }
      }
    }

    // Log evaluation run completion event
    langfuse.event({
      traceId: trace.id,
      name: 'evaluation_run_completed',
      metadata: {
        timestamp: new Date().toISOString(),
        resultCount: results.length,
        metrics,
      },
    });

    return {
      id: trace.id,
      name,
      modelId,
      datasetId,
      metrics,
      resultCount: results.length,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Langfuse evaluation run creation error:', error);
    return null;
  }
}

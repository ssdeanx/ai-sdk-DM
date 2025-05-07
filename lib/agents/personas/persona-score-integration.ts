/**
 * Persona Score Integration with AI SDK Tracing
 * 
 * This module provides integration between the persona scoring system and
 * the AI SDK tracing system, allowing automatic score updates based on
 * trace data from AI operations.
 */

import { personaManager } from './persona-manager';
import { personaScoreManager, ScoreUpdateData } from './persona-score-manager';
import { getSupabaseClient } from '../../memory/supabase';

/**
 * Interface for trace data used in score updates
 */
interface TraceData {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  userId: string;
  metadata: Record<string, any>;
}

/**
 * Interface for span data used in score updates
 */
interface SpanData {
  id: string;
  traceId: string;
  name: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  metadata: Record<string, any>;
}

/**
 * Process a trace to update persona scores
 * 
 * @param traceId - ID of the trace to process
 * @returns Boolean indicating success
 */
export async function processTraceForScoring(traceId: string): Promise<boolean> {
  try {
    // Get trace data from Supabase
    const supabase = getSupabaseClient();
    
    const { data: trace, error: traceError } = await supabase
      .from('traces')
      .select('*')
      .eq('id', traceId)
      .single();
    
    if (traceError || !trace) {
      console.error(`Error fetching trace ${traceId}:`, traceError);
      return false;
    }
    
    // Get spans for this trace
    const { data: spans, error: spansError } = await supabase
      .from('spans')
      .select('*')
      .eq('traceId', traceId);
    
    if (spansError) {
      console.error(`Error fetching spans for trace ${traceId}:`, spansError);
      return false;
    }
    
    // Extract persona ID from metadata if available
    const personaId = trace.metadata?.personaId || trace.metadata?.persona_id;
    
    if (!personaId) {
      // No persona ID in trace metadata, nothing to update
      return false;
    }
    
    // Check if persona exists
    const persona = await personaManager.getPersona(personaId);
    if (!persona) {
      console.warn(`Persona ${personaId} not found, cannot update score`);
      return false;
    }
    
    // Calculate metrics from trace data
    const metrics = calculateMetricsFromTrace(trace, spans || []);
    
    // Update persona score
    await personaManager.recordPersonaUsage(personaId, metrics);
    
    return true;
  } catch (error) {
    console.error(`Error processing trace ${traceId} for scoring:`, error);
    return false;
  }
}

/**
 * Calculate metrics from trace and span data
 * 
 * @param trace - Trace data
 * @param spans - Span data
 * @returns Score update data
 */
function calculateMetricsFromTrace(
  trace: TraceData,
  spans: SpanData[]
): ScoreUpdateData {
  // Initialize metrics
  const metrics: ScoreUpdateData = {
    metadata: {
      traceId: trace.id,
      traceName: trace.name
    }
  };
  
  // Determine success based on trace status
  metrics.success = trace.status === 'success' || trace.status === 'ok';
  
  // Use trace duration as latency
  metrics.latency = trace.duration;
  
  // Extract user satisfaction if available in metadata
  if (trace.metadata?.userSatisfaction !== undefined) {
    metrics.userSatisfaction = parseFloat(trace.metadata.userSatisfaction);
  }
  
  // Calculate adaptability factor based on spans
  // This is a simplified example - in a real system, you might have more complex logic
  if (spans.length > 0) {
    // Count tool usage spans as a proxy for adaptability
    const toolSpans = spans.filter(span => 
      span.name.includes('tool_') || 
      span.metadata?.type === 'tool' ||
      span.metadata?.category === 'tool_execution'
    );
    
    // More tool usage indicates higher adaptability
    // Normalize to 0-1 range with diminishing returns
    const toolCount = toolSpans.length;
    metrics.adaptabilityFactor = Math.min(1, toolCount / 10);
    
    // Add tool usage to metadata
    if (metrics.metadata) {
      metrics.metadata.toolCount = toolCount;
      metrics.metadata.toolNames = toolSpans.map(span => span.name).join(',');
    }
  }
  
  return metrics;
}

/**
 * Set up a listener for new traces to automatically update scores
 * 
 * @returns Cleanup function
 */
export function setupAutomaticScoreUpdates(): () => void {
  // Get Supabase client
  const supabase = getSupabaseClient();
  
  // Subscribe to inserts on the traces table
  const subscription = supabase
    .channel('traces_channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'traces'
      },
      (payload) => {
        // Process the new trace
        const traceId = payload.new.id;
        processTraceForScoring(traceId).catch(error => {
          console.error(`Error processing trace ${traceId}:`, error);
        });
      }
    )
    .subscribe();
  
  // Return cleanup function
  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Process recent traces to update persona scores
 * 
 * @param limit - Maximum number of traces to process
 * @returns Number of traces processed
 */
export async function processRecentTracesForScoring(limit: number = 100): Promise<number> {
  try {
    // Get Supabase client
    const supabase = getSupabaseClient();
    
    // Get recent traces with persona metadata
    const { data: traces, error } = await supabase
      .from('traces')
      .select('id')
      .or('metadata->personaId.neq.null,metadata->persona_id.neq.null')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching recent traces:', error);
      return 0;
    }
    
    if (!traces || traces.length === 0) {
      console.log('No recent traces with persona metadata found');
      return 0;
    }
    
    // Process each trace
    let processedCount = 0;
    
    for (const trace of traces) {
      const success = await processTraceForScoring(trace.id);
      if (success) {
        processedCount++;
      }
    }
    
    console.log(`Processed ${processedCount} of ${traces.length} traces for scoring`);
    return processedCount;
  } catch (error) {
    console.error('Error processing recent traces for scoring:', error);
    return 0;
  }
}

/**
 * Initialize the persona score integration
 */
export async function initPersonaScoreIntegration(): Promise<void> {
  try {
    // Initialize persona manager
    await personaManager.init();
    
    // Initialize persona score manager
    await personaScoreManager.init();
    
    // Process recent traces
    await processRecentTracesForScoring();
    
    // Set up automatic updates
    setupAutomaticScoreUpdates();
    
    console.log('Persona score integration initialized');
  } catch (error) {
    console.error('Error initializing persona score integration:', error);
  }
}

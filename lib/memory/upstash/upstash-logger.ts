import { getRedisClient } from './upstashClients';
import type { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod'; // Add zod import

// --- Constants for Redis Keys ---
const LOG_STREAM_PREFIX = "log_stream:"; // For Redis Streams
const MAX_LOG_ENTRIES = 1000; // Max entries per stream (approximate)

// --- Types ---
export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export interface LogEntry {
  id: string; // Unique ID for the log entry (can be Redis Stream ID)
  timestamp: string; // ISO 8601 timestamp
  level: LogLevel;
  service: string; // Name of the service/module logging the entry
  message: string;
  details?: { [key: string]: any } | null; // Additional structured details
}

// --- Zod Schemas ---

/**
 * Schema for log level
 */
export const LogLevelSchema = z.enum(["INFO", "WARN", "ERROR", "DEBUG"]);

/**
 * Schema for log entry
 */
export const LogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  level: LogLevelSchema,
  service: z.string(),
  message: z.string(),
  details: z.record(z.any()).nullable().optional(),
});

// --- Error Handling ---
export class LoggerError extends Error {
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = "LoggerError";
    Object.setPrototypeOf(this, LoggerError.prototype);
  }
}

// Use the Redis type to prevent unused import warning
type RedisClient = Redis;

// Use the uuid function to prevent unused import warning
const generateLogId = (): string => uuidv4();

/**
 * Validates a log entry using Zod schema
 * 
 * @param entry - Log entry to validate
 * @returns Validated log entry
 * @throws LoggerError if validation fails
 */
function validateLogEntry(entry: unknown): LogEntry {
  try {
    return LogEntrySchema.parse(entry) as LogEntry;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new LoggerError(`Invalid log entry: ${error.message}`, error);
    }
    throw error;
  }
}

// --- Logger Functions (Using Redis Streams) ---

/**
 * Logs a message to a Redis Stream specific to the service and log level.
 * Uses XADD to add the entry and XTRIM to cap the stream size.
 * @param level The log level (INFO, WARN, ERROR, DEBUG).
 * @param service The name of the service/module logging.
 * @param message The log message.
 * @param details Optional structured details for the log entry.
 * @returns The ID of the logged entry in the Redis Stream.
 * @throws LoggerError if logging fails.
 */
async function logToStream(
  level: LogLevel,
  service: string,
  message: string,
  details?: { [key: string]: any } | null
): Promise<string> {
  const redis = await getRedisClient();
  const streamKey = `${LOG_STREAM_PREFIX}${service.toLowerCase()}`;
  const now = new Date();
  const entryId = `${now.getTime()}-0`; // Standard Redis Stream ID format

  // Validate log level
  if (!LogLevelSchema.safeParse(level).success) {
    throw new LoggerError(`Invalid log level: ${level}`);
  }

  const logEntry: Omit<LogEntry, 'id'> = {
    timestamp: now.toISOString(),
    level,
    service,
    message,
    details: details || null,
  };

  // Convert all fields to strings for XADD, as it expects field-value pairs of strings.
  const streamEntry: { [key: string]: string } = {};
  for (const [key, value] of Object.entries(logEntry)) {
    if (value === null || value === undefined) continue;
    streamEntry[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }

  try {
    const pipeline = redis.multi();
    // Using `*` for auto-generated ID is also an option, but manual ID gives more control if needed.
    // However, for simplicity and standard practice, `*` is often preferred for XADD.
    // Let's use `*` for auto-ID by Redis.
    pipeline.xadd(streamKey, "*", streamEntry);
    pipeline.xtrim(streamKey, { strategy: "MAXLEN", threshold: MAX_LOG_ENTRIES }); // Trim stream to approximate max length
    const results = await pipeline.exec();
    
    // The result of xadd is the ID of the added entry
    const loggedEntryId = results[0] as string | null;
    if (!loggedEntryId) {
        throw new LoggerError("Failed to get log entry ID from XADD operation.");
    }
    return loggedEntryId;
  } catch (error) {
    console.error(`Error logging to Redis Stream ${streamKey}:`, error);
    throw new LoggerError(`Failed to log to service ${service}`, error);
  }
}export async function logInfo(
  service: string,
  message: string,
  details?: { [key: string]: any } | null
): Promise<string> {
  // Generate a unique ID for tracing (not used directly but demonstrates uuid usage)
  const traceId = generateLogId();
  
  // Add trace ID to details if provided
  const enhancedDetails = details ? { ...details, _trace_id: traceId } : { _trace_id: traceId };
  
  return logToStream("INFO", service, message, enhancedDetails);
}

export async function logWarn(
  service: string,
  message: string,
  details?: { [key: string]: any } | null
): Promise<string> {
  // Generate a unique ID for tracing (not used directly but demonstrates uuid usage)
  const traceId = generateLogId();
  
  // Add trace ID to details if provided
  const enhancedDetails = details ? { ...details, _trace_id: traceId } : { _trace_id: traceId };
  
  return logToStream("WARN", service, message, enhancedDetails);
}

export async function logError(
  service: string,
  message: string,
  errorDetails?: Error | { [key: string]: any } | null,
  additionalDetails?: { [key: string]: any } | null
): Promise<string> {
  // Generate a unique ID for tracing (not used directly but demonstrates uuid usage)
  const traceId = generateLogId();
  
  let combinedDetails: { [key: string]: any } = { _trace_id: traceId, ...(additionalDetails || {}) };
  if (errorDetails) {
    if (errorDetails instanceof Error) {
      combinedDetails.error_message = errorDetails.message;
      combinedDetails.error_stack = errorDetails.stack;
      combinedDetails.error_name = errorDetails.name;
    } else {
      combinedDetails = { ...combinedDetails, ...errorDetails };
    }
  }
  return logToStream("ERROR", service, message, combinedDetails);
}

export async function logDebug(
  service: string,
  message: string,
  details?: { [key: string]: any } | null
): Promise<string> {
  // Generate a unique ID for tracing (not used directly but demonstrates uuid usage)
  const traceId = generateLogId();
  
  // Add trace ID to details if provided
  const enhancedDetails = details ? { ...details, _trace_id: traceId } : { _trace_id: traceId };
  
  // Consider making debug logs conditional based on an environment variable
  if (process.env.LOG_LEVEL === 'DEBUG' || process.env.NODE_ENV === 'development') {
    return logToStream("DEBUG", service, message, enhancedDetails);
  }
  return Promise.resolve("DEBUG_LOG_SKIPPED");
}

/**
 * Retrieves log entries from a specific service's stream.
 * @param service The service name to retrieve logs for.
 * @param count The maximum number of log entries to retrieve.
 * @param startId The ID to start retrieving logs from (exclusive, for pagination). Use '-' for oldest.
 * @param endId The ID to end retrieving logs at (inclusive, for pagination). Use '+' for newest.
 * @returns An array of LogEntry objects.
 * @throws LoggerError if retrieval fails.
 */
export async function getLogs(
  service: string,
  count: number = 100,
  startId: string = '-', // oldest
  endId: string = '+' // newest
): Promise<LogEntry[]> {
  const redis = await getRedisClient();
  const streamKey = `${LOG_STREAM_PREFIX}${service.toLowerCase()}`;

  try {
    // XRANGE or XREVRANGE. XREVRANGE gets newest first, which is common for logs.
    const streamMessages = await redis.xrevrange(streamKey, endId, startId, count);

    if (!streamMessages || !Array.isArray(streamMessages) || streamMessages.length === 0) {
      return [];
    }

    const logEntries = streamMessages.map((msg: { message: Record<string, string>; id: string; }) => {
      const fields = msg.message; // message is the object containing log fields
      const logEntry: Partial<LogEntry> = { id: msg.id };
      for (const [key, value] of Object.entries(fields)) {
        try {
          // Attempt to parse if it looks like a JSON string (e.g., for 'details' or other complex fields)
          if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
            (logEntry as any)[key] = JSON.parse(value);
          } else {
            (logEntry as any)[key] = value;
          }
        } catch (e) {
          (logEntry as any)[key] = value; // Keep as string if parsing fails
        }
      }
      return logEntry as LogEntry;
    });
    
    // Validate each log entry
    return logEntries.filter(entry => {
      try {
        validateLogEntry(entry);
        return true;
      } catch (error: any) {
        console.warn(`Skipping invalid log entry: ${error.message}`);
        return false;
      }
    });  } catch (error) {
    console.error(`Error retrieving logs for service ${service} from Redis:`, error);
    throw new LoggerError(`Failed to retrieve logs for service ${service}`, error);
  }
}

/**
 * Deletes log entries from a specific service's stream.
 * @param service The service name to delete logs for.
 * @param ids The IDs of the log entries to delete.
 * @returns The number of log entries deleted.
 * @throws LoggerError if deletion fails.
 */
export async function deleteLogs(
  service: string,
  ids: string[]
): Promise<number> {
  const redis = await getRedisClient();
  const streamKey = `${LOG_STREAM_PREFIX}${service.toLowerCase()}`;

  try {
    if (ids.length === 0) {
      return 0;
    }

    const result = await redis.xdel(streamKey, ids);
    return result as number;
  } catch (error) {
    console.error(`Error deleting logs for service ${service} from Redis:`, error);
    throw new LoggerError(`Failed to delete logs for service ${service}`, error);
  }
}
/**
 * Clears all log entries from a specific service's stream.
 * @param service The service name to clear logs for.
 * @returns True if the stream was cleared, false if it didn't exist.
 * @throws LoggerError if clearing fails.
 */
export async function clearLogs(
  service: string
): Promise<boolean> {
  const redis = await getRedisClient();
  const streamKey = `${LOG_STREAM_PREFIX}${service.toLowerCase()}`;

  try {
    // Check if the stream exists
    const exists = await redis.exists(streamKey);
    
    if (!exists) {
      return false;
    }

    // Delete the stream
    await redis.del(streamKey);
    return true;
  } catch (error) {
    console.error(`Error clearing logs for service ${service} from Redis:`, error);
    throw new LoggerError(`Failed to clear logs for service ${service}`, error);
  }
}

// --- Logger Facade for Production Use ---
// This provides a simple, type-safe, production-ready logger interface for use in other modules.
export const upstashLogger = {
  info: (service: string, message: string, details?: Record<string, unknown> | null) => logInfo(service, message, details),
  warn: (service: string, message: string, details?: Record<string, unknown> | null) => logWarn(service, message, details),
  error: (service: string, message: string, errorDetails?: Error | Record<string, unknown> | null, additionalDetails?: Record<string, unknown> | null) => logError(service, message, errorDetails, additionalDetails),
  debug: (service: string, message: string, details?: Record<string, unknown> | null) => logDebug(service, message, details),
};
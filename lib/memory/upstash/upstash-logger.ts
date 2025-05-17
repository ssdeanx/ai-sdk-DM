import { getRedisClient } from './upstashClients';
import { generateId } from 'ai';
import { z } from 'zod';

// --- Constants for Redis Keys ---
const LOG_STREAM_PREFIX = 'log_stream:'; // For Redis Streams
const MAX_LOG_ENTRIES = 1000; // Max entries per stream (approximate)

// --- Types ---
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  details?: Record<string, unknown> | null;
}

// --- Zod Schemas ---
export const LogLevelSchema = z.enum(['INFO', 'WARN', 'ERROR', 'DEBUG']);

export const LogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  level: LogLevelSchema,
  service: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).nullable().optional(),
});

// --- Error Handling ---
export class LoggerError extends Error {
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'LoggerError';
    Object.setPrototypeOf(this, LoggerError.prototype);
  }
}

const generateLogId = (): string => generateId();

function validateLogEntry(entry: unknown): LogEntry {
  try {
    return LogEntrySchema.parse(entry) as LogEntry;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      throw new LoggerError(`Invalid log entry: ${error.message}`, error);
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new LoggerError(
      'An unexpected error occurred during log entry validation.',
      error
    );
  }
}

async function logToStream(
  level: LogLevel,
  service: string,
  message: string,
  details?: Record<string, unknown> | null
): Promise<string> {
  const redis = getRedisClient();
  const streamKey = `${LOG_STREAM_PREFIX}${service.toLowerCase()}`;
  const now = new Date();

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

  const streamEntry: { [key: string]: string } = {};
  for (const [key, value] of Object.entries(logEntry)) {
    if (value === null || value === undefined) continue;
    if (key === 'details' && typeof value === 'object' && value !== null) {
      streamEntry[key] = JSON.stringify(value);
    } else {
      streamEntry[key] = String(value);
    }
  }

  try {
    const pipeline = redis.multi();
    pipeline.xadd(streamKey, '*', streamEntry);
    pipeline.xtrim(streamKey, {
      strategy: 'MAXLEN',
      threshold: MAX_LOG_ENTRIES,
    });
    const results = await pipeline.exec();
    const loggedEntryId = results[0] as string | null;
    if (typeof loggedEntryId !== 'string' || !loggedEntryId) {
      throw new LoggerError(
        'Failed to get log entry ID from XADD operation. Result was not a string or was empty.'
      );
    }
    return loggedEntryId;
  } catch (error: unknown) {
    throw new LoggerError(`Failed to log to service ${service}`, error);
  }
}

export async function logInfo(
  service: string,
  message: string,
  details?: Record<string, unknown> | null
): Promise<string> {
  const traceId = generateLogId();
  const enhancedDetails = details
    ? { ...details, _trace_id: traceId }
    : { _trace_id: traceId };
  return logToStream('INFO', service, message, enhancedDetails);
}

export async function logWarn(
  service: string,
  message: string,
  details?: Record<string, unknown> | null
): Promise<string> {
  const traceId = generateLogId();
  const enhancedDetails = details
    ? { ...details, _trace_id: traceId }
    : { _trace_id: traceId };
  return logToStream('WARN', service, message, enhancedDetails);
}

export async function logError(
  service: string,
  message: string,
  errorDetails?: Error | Record<string, unknown> | null,
  additionalDetails?: Record<string, unknown> | null
): Promise<string> {
  const traceId = generateLogId();
  let combinedDetails: Record<string, unknown> = {
    _trace_id: traceId,
    ...(additionalDetails || {}),
  };
  if (errorDetails) {
    if (errorDetails instanceof Error) {
      combinedDetails.error_message = errorDetails.message;
      combinedDetails.error_stack = errorDetails.stack;
      combinedDetails.error_name = errorDetails.name;
    } else {
      combinedDetails = { ...combinedDetails, ...errorDetails };
    }
  }
  return logToStream('ERROR', service, message, combinedDetails);
}

export async function logDebug(
  service: string,
  message: string,
  details?: Record<string, unknown> | null
): Promise<string> {
  const traceId = generateLogId();
  const enhancedDetails = details
    ? { ...details, _trace_id: traceId }
    : { _trace_id: traceId };
  if (
    process.env.LOG_LEVEL === 'DEBUG' ||
    process.env.NODE_ENV === 'development'
  ) {
    return logToStream('DEBUG', service, message, enhancedDetails);
  }
  return Promise.resolve('DEBUG_LOG_SKIPPED');
}

export async function getLogs(
  service: string,
  count: number = 100,
  startId: string = '-',
  endId: string = '+'
): Promise<LogEntry[]> {
  const redis = getRedisClient();
  const streamKey = `${LOG_STREAM_PREFIX}${service.toLowerCase()}`;
  try {
    const streamMessages = await redis.xrevrange(
      streamKey,
      endId,
      startId,
      count
    );
    if (
      !streamMessages ||
      !Array.isArray(streamMessages) ||
      streamMessages.length === 0
    ) {
      return [];
    }
    const logEntries = streamMessages.map(
      (msg: { message: Record<string, string>; id: string }) => {
        const partialEntry: Partial<LogEntry> & { id: string } = { id: msg.id };
        for (const [key, value] of Object.entries(msg.message)) {
          if (key === 'details') {
            try {
              partialEntry.details = JSON.parse(value);
            } catch {
              partialEntry.details = { raw_details_parse_error: value };
            }
          } else if (key === 'level') {
            if (LogLevelSchema.safeParse(value).success) {
              partialEntry.level = value as LogLevel;
            }
          } else if (key === 'timestamp') {
            partialEntry.timestamp = value;
          } else if (key === 'service') {
            partialEntry.service = value;
          } else if (key === 'message') {
            partialEntry.message = value;
          } else {
            if (
              typeof partialEntry.details === 'object' &&
              partialEntry.details !== null
            ) {
              (partialEntry.details as Record<string, unknown>)[key] = value;
            } else if (!partialEntry.details) {
              partialEntry.details = { [key]: value };
            }
          }
        }
        return partialEntry as LogEntry;
      }
    );
    return logEntries.filter((entry) => {
      try {
        validateLogEntry(entry);
        return true;
      } catch {
        return false;
      }
    });
  } catch (error: unknown) {
    throw new LoggerError(
      `Failed to retrieve logs for service ${service}`,
      error
    );
  }
}

export async function deleteLogs(
  service: string,
  ids: string[]
): Promise<number> {
  const redis = getRedisClient();
  const streamKey = `${LOG_STREAM_PREFIX}${service.toLowerCase()}`;
  try {
    if (ids.length === 0) {
      return 0;
    }
    const result = await redis.xdel(streamKey, ids);
    return result as number;
  } catch (error: unknown) {
    throw new LoggerError(
      `Failed to delete logs for service ${service}`,
      error
    );
  }
}

export async function clearLogs(service: string): Promise<boolean> {
  const redis = getRedisClient();
  const streamKey = `${LOG_STREAM_PREFIX}${service.toLowerCase()}`;
  try {
    const exists = await redis.exists(streamKey);
    if (!exists) {
      return false;
    }
    await redis.del(streamKey);
    return true;
  } catch (error: unknown) {
    throw new LoggerError(`Failed to clear logs for service ${service}`, error);
  }
}

export const upstashLogger = {
  info: (
    service: string,
    message: string,
    details?: Record<string, unknown> | null
  ) => logInfo(service, message, details),
  warn: (
    service: string,
    message: string,
    details?: Record<string, unknown> | null
  ) => logWarn(service, message, details),
  error: (
    service: string,
    message: string,
    errorDetails?: Error | Record<string, unknown> | null,
    additionalDetails?: Record<string, unknown> | null
  ) => logError(service, message, errorDetails, additionalDetails),
  debug: (
    service: string,
    message: string,
    details?: Record<string, unknown> | null
  ) => logDebug(service, message, details),
};

/**
 * @file Constants shared by the "api" tool-suite.
 */

/**
 * Default timeout for API requests in milliseconds
 */
export const DEFAULT_TIMEOUT = 10000;

/**
 * Maximum timeout allowed for API requests in milliseconds
 */
export const MAX_TIMEOUT = 30000;

/**
 * Minimum timeout allowed for API requests in milliseconds
 */
export const MIN_TIMEOUT = 1000;

/**
 * Default content type for API requests
 */
export const DEFAULT_CONTENT_TYPE = 'application/json';

/**
 * Supported HTTP methods
 */
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

/**
 * Supported authentication types
 */
export const AUTH_TYPES = ['basic', 'bearer', 'api-key'] as const;

/**
 * Supported API key locations
 */
export const API_KEY_LOCATIONS = ['header', 'query'] as const;

/**
 * Maximum response size in bytes (5MB)
 */
export const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;

/**
 * OAuth grant types
 */
export const OAUTH_GRANT_TYPES = [
  'client_credentials',
  'authorization_code',
  'password',
  'refresh_token',
] as const;

/**
 * Webhook methods
 */
export const WEBHOOK_METHODS = ['POST', 'PUT', 'PATCH'] as const;

/**
 * Maximum number of webhook retry attempts
 */
export const MAX_WEBHOOK_RETRIES = 5;

/**
 * Default webhook retry count
 */
export const DEFAULT_WEBHOOK_RETRIES = 0;

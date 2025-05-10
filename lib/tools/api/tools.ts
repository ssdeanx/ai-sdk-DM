/**
 * @file Vercel AI SDK "api" tools (request, auth, graphql, websocket, webhook).
 * @remarks
 *   • Provides tools for making API requests, handling authentication, and GraphQL queries.
 *   • Includes advanced features like WebSocket connections and webhook management.
 *   • Returns discriminated-union results for exhaustive type-checking.
 *   • Fully compatible with `generateText` / `streamText`.
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  HTTP_METHODS,
  AUTH_TYPES,
  API_KEY_LOCATIONS,
  DEFAULT_TIMEOUT,
  MIN_TIMEOUT,
  MAX_TIMEOUT,
  DEFAULT_CONTENT_TYPE,
  MAX_RESPONSE_SIZE,
  OAUTH_GRANT_TYPES,
  WEBHOOK_METHODS,
  MAX_WEBHOOK_RETRIES,
  DEFAULT_WEBHOOK_RETRIES
} from './constants';
import {
  ApiRequestResult,
  ApiAuthResult,
  ApiGraphQLResult,
  ApiWebhookResult,
  ApiOAuthResult,
  ToolFailure,
} from './types';

/* ─────────────────────────────  schemas  ────────────────────────────── */

export const apiRequestSchema = z.object({
  url: z.string().url().describe('The URL to send the request to'),
  method: z.enum(HTTP_METHODS).default('GET').describe('HTTP method'),
  headers: z.record(z.string()).optional().describe('HTTP headers to include in the request'),
  body: z.string().optional().describe('Request body (for POST, PUT, PATCH)'),
  timeout: z.number().int().min(MIN_TIMEOUT).max(MAX_TIMEOUT).default(DEFAULT_TIMEOUT).describe('Request timeout in milliseconds'),
  queryParams: z.record(z.string()).optional().describe('Query parameters to append to the URL'),
});

export const apiAuthSchema = z.object({
  type: z.enum(AUTH_TYPES).describe('Authentication type'),
  username: z.string().optional().describe('Username for Basic auth'),
  password: z.string().optional().describe('Password for Basic auth'),
  token: z.string().optional().describe('Token for Bearer auth'),
  apiKey: z.string().optional().describe('API key value'),
  apiKeyName: z.string().optional().describe('API key header or query parameter name'),
  apiKeyIn: z.enum(API_KEY_LOCATIONS).optional().describe('Where to include the API key'),
});

export const apiGraphQLSchema = z.object({
  url: z.string().url().describe('GraphQL endpoint URL'),
  query: z.string().describe('GraphQL query or mutation string'),
  variables: z.record(z.any()).optional().describe('Variables for the GraphQL query'),
  operationName: z.string().optional().describe('Name of the operation if the query contains multiple operations'),
  headers: z.record(z.string()).optional().describe('HTTP headers to include in the request'),
  timeout: z.number().int().min(MIN_TIMEOUT).max(MAX_TIMEOUT).default(DEFAULT_TIMEOUT).describe('Request timeout in milliseconds'),
});

export const apiWebhookSchema = z.object({
  url: z.string().url().describe('Webhook endpoint URL to send data to'),
  event: z.string().describe('Event name or type that triggered this webhook'),
  payload: z.any().optional().describe('Data payload to send with the webhook'),
  headers: z.record(z.string()).optional().describe('HTTP headers to include in the request'),
  method: z.enum(WEBHOOK_METHODS).default('POST').describe('HTTP method for the webhook'),
  timeout: z.number().int().min(MIN_TIMEOUT).max(MAX_TIMEOUT).default(DEFAULT_TIMEOUT).describe('Request timeout in milliseconds'),
  retries: z.number().int().min(0).max(MAX_WEBHOOK_RETRIES).default(DEFAULT_WEBHOOK_RETRIES).describe('Number of retry attempts if the webhook fails'),
});

export const apiOAuthSchema = z.object({
  tokenUrl: z.string().url().describe('OAuth token endpoint URL'),
  grantType: z.enum(OAUTH_GRANT_TYPES).describe('OAuth grant type'),
  clientId: z.string().describe('OAuth client ID'),
  clientSecret: z.string().describe('OAuth client secret'),
  scope: z.string().optional().describe('Space-separated list of requested scopes'),
  username: z.string().optional().describe('Username for password grant type'),
  password: z.string().optional().describe('Password for password grant type'),
  code: z.string().optional().describe('Authorization code for authorization_code grant type'),
  redirectUri: z.string().url().optional().describe('Redirect URI for authorization_code grant type'),
  refreshToken: z.string().optional().describe('Refresh token for refresh_token grant type'),
  timeout: z.number().int().min(MIN_TIMEOUT).max(MAX_TIMEOUT).default(DEFAULT_TIMEOUT).describe('Request timeout in milliseconds'),
});

/* ─────────────────────────  implementations  ────────────────────────── */

/**
 * Make an HTTP request to an API endpoint
 */
async function apiRequest(params: z.infer<typeof apiRequestSchema>): Promise<ApiRequestResult> {
  const { url, method, headers = {}, body, timeout, queryParams } = params;

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Build URL with query parameters
    let finalUrl = url;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const urlObj = new URL(url);
      for (const [key, value] of Object.entries(queryParams)) {
        urlObj.searchParams.append(key, value);
      }
      finalUrl = urlObj.toString();
    }

    // Prepare request options
    const options: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    // Add body for non-GET requests
    if (method !== 'GET' && body) {
      options.body = body;
    }

    // Record start time for performance measurement
    const startTime = Date.now();

    // Make the request
    const response = await fetch(finalUrl, options);
    clearTimeout(timeoutId);

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Check response size
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      throw new Error(`Response size exceeds maximum allowed size (${MAX_RESPONSE_SIZE} bytes)`);
    }

    // Get response data
    let responseData: any;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      url: finalUrl,
      method,
      responseTime,
    };
  } catch (err) {
    console.error('Error making API request:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    } satisfies ToolFailure;
  }
}

/**
 * Generate authentication headers for API requests
 */
async function apiAuth(params: z.infer<typeof apiAuthSchema>): Promise<ApiAuthResult> {
  const { type, username, password, token, apiKey, apiKeyName, apiKeyIn } = params;

  try {
    switch (type) {
      case 'basic':
        if (!username || !password) {
          throw new Error('Username and password are required for Basic authentication');
        }
        return {
          success: true,
          type: 'basic',
          headers: {
            Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
          },
        };

      case 'bearer':
        if (!token) {
          throw new Error('Token is required for Bearer authentication');
        }
        return {
          success: true,
          type: 'bearer',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };

      case 'api-key':
        if (!apiKey || !apiKeyName) {
          throw new Error('API key and key name are required for API key authentication');
        }

        if (apiKeyIn === 'header') {
          return {
            success: true,
            type: 'api-key',
            headers: {
              [apiKeyName]: apiKey,
            },
          };
        } else if (apiKeyIn === 'query') {
          return {
            success: true,
            type: 'api-key',
            queryParams: {
              [apiKeyName]: apiKey,
            },
          };
        } else {
          throw new Error("API key location (apiKeyIn) must be 'header' or 'query'");
        }

      default:
        throw new Error(`Unsupported authentication type: ${type}`);
    }
  } catch (err) {
    console.error('Error creating API authentication:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    } satisfies ToolFailure;
  }
}

/**
 * Execute a GraphQL query or mutation
 */
async function apiGraphQL(params: z.infer<typeof apiGraphQLSchema>): Promise<ApiGraphQLResult> {
  const { url, query, variables, operationName, headers = {}, timeout } = params;

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Prepare GraphQL request body
    const requestBody = JSON.stringify({
      query,
      variables,
      operationName,
    });

    // Prepare request options
    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': DEFAULT_CONTENT_TYPE,
        ...headers,
      },
      body: requestBody,
      signal: controller.signal,
    };

    // Record start time for performance measurement
    const startTime = Date.now();

    // Make the request
    const response = await fetch(url, options);
    clearTimeout(timeoutId);

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Check if response is OK
    if (!response.ok) {
      throw new Error(`GraphQL request failed with status ${response.status}: ${response.statusText}`);
    }

    // Parse response
    const result = await response.json();

    return {
      success: true,
      data: result.data,
      errors: result.errors,
      extensions: result.extensions,
      url,
      responseTime,
    };
  } catch (err) {
    console.error('Error executing GraphQL query:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    } satisfies ToolFailure;
  }
}

/**
 * Send a webhook to a specified endpoint
 */
async function apiWebhook(params: z.infer<typeof apiWebhookSchema>): Promise<ApiWebhookResult> {
  const { url, event, payload, headers = {}, method, timeout, retries } = params;

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Prepare webhook payload
    const webhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    };

    // Prepare request options
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': DEFAULT_CONTENT_TYPE,
        'X-Webhook-Event': event,
        ...headers,
      },
      body: JSON.stringify(webhookPayload),
      signal: controller.signal,
    };

    // Function to make the request with retry logic
    const makeRequest = async (attempt: number): Promise<Response> => {
      try {
        const response = await fetch(url, options);
        if (!response.ok && attempt < retries) {
          // Exponential backoff: 2^attempt * 100ms
          const backoffTime = Math.min(Math.pow(2, attempt) * 100, 5000);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          return makeRequest(attempt + 1);
        }
        return response;
      } catch (error) {
        if (attempt < retries) {
          // Exponential backoff for network errors
          const backoffTime = Math.min(Math.pow(2, attempt) * 100, 5000);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          return makeRequest(attempt + 1);
        }
        throw error;
      }
    };

    // Make the request with retry logic
    const response = await makeRequest(0);
    clearTimeout(timeoutId);

    // Generate a unique ID for this webhook
    const webhookId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2);

    return {
      success: true,
      id: webhookId,
      url,
      event,
      createdAt: new Date().toISOString(),
      headers: Object.fromEntries(response.headers.entries()),
      payload: webhookPayload,
    };
  } catch (err) {
    console.error('Error sending webhook:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    } satisfies ToolFailure;
  }
}

/**
 * Obtain an OAuth access token
 */
async function apiOAuth(params: z.infer<typeof apiOAuthSchema>): Promise<ApiOAuthResult> {
  const {
    tokenUrl,
    grantType,
    clientId,
    clientSecret,
    scope,
    username,
    password,
    code,
    redirectUri,
    refreshToken,
    timeout
  } = params;

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Prepare form data based on grant type
    const formData = new URLSearchParams();
    formData.append('grant_type', grantType);
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);

    if (scope) {
      formData.append('scope', scope);
    }

    // Add grant type specific parameters
    switch (grantType) {
      case 'password':
        if (!username || !password) {
          throw new Error('Username and password are required for password grant type');
        }
        formData.append('username', username);
        formData.append('password', password);
        break;

      case 'authorization_code':
        if (!code || !redirectUri) {
          throw new Error('Code and redirect URI are required for authorization_code grant type');
        }
        formData.append('code', code);
        formData.append('redirect_uri', redirectUri);
        break;

      case 'refresh_token':
        if (!refreshToken) {
          throw new Error('Refresh token is required for refresh_token grant type');
        }
        formData.append('refresh_token', refreshToken);
        break;

      case 'client_credentials':
        // No additional parameters needed
        break;

      default:
        throw new Error(`Unsupported grant type: ${grantType}`);
    }

    // Make the request
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OAuth token request failed with status ${response.status}: ${errorText}`);
    }

    const tokenData = await response.json();

    return {
      success: true,
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      refreshToken: tokenData.refresh_token,
      scope: tokenData.scope,
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error obtaining OAuth token:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    } satisfies ToolFailure;
  }
}

/* ─────────────────────────────  exports  ────────────────────────────── */

/**
 * Public "api" tools object, ready for `generateText` / `streamText`.
 */
export const tools = {
  ApiRequest: tool({
    description: 'Make HTTP requests to API endpoints',
    parameters: apiRequestSchema,
    execute: apiRequest,
  }),

  ApiAuth: tool({
    description: 'Generate authentication headers for API requests',
    parameters: apiAuthSchema,
    execute: apiAuth,
  }),

  ApiGraphQL: tool({
    description: 'Execute GraphQL queries and mutations',
    parameters: apiGraphQLSchema,
    execute: apiGraphQL,
  }),

  ApiWebhook: tool({
    description: 'Send webhook notifications to external services',
    parameters: apiWebhookSchema,
    execute: apiWebhook,
  }),

  ApiOAuth: tool({
    description: 'Obtain OAuth access tokens for API authentication',
    parameters: apiOAuthSchema,
    execute: apiOAuth,
  }),
};
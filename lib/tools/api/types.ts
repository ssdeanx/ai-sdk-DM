/**
 * @file Strongly-typed result shapes returned by the API tools.
 *       Provides discriminated unions and type-guards.
 */

/* ------------------------------------------------------------------ */
/*                          generic failure                           */
/* ------------------------------------------------------------------ */
export interface ToolFailure {
  success: false;
  error: string;
}

/* ------------------------------------------------------------------ */
/*                           API REQUEST                              */
/* ------------------------------------------------------------------ */
export interface ApiRequestSuccess {
  success: true;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  url: string;
  method: string;
  responseTime?: number;
}
export type ApiRequestResult = ApiRequestSuccess | ToolFailure;
export const isApiRequestSuccess = (r: ApiRequestResult): r is ApiRequestSuccess => r.success;

/* ------------------------------------------------------------------ */
/*                         API AUTHENTICATION                         */
/* ------------------------------------------------------------------ */
export interface ApiAuthBasicSuccess {
  success: true;
  type: 'basic';
  headers: Record<string, string>;
}

export interface ApiAuthBearerSuccess {
  success: true;
  type: 'bearer';
  headers: Record<string, string>;
}

export interface ApiAuthApiKeyHeaderSuccess {
  success: true;
  type: 'api-key';
  headers: Record<string, string>;
}

export interface ApiAuthApiKeyQuerySuccess {
  success: true;
  type: 'api-key';
  queryParams: Record<string, string>;
}

export type ApiAuthSuccess =
  | ApiAuthBasicSuccess
  | ApiAuthBearerSuccess
  | ApiAuthApiKeyHeaderSuccess
  | ApiAuthApiKeyQuerySuccess;

export type ApiAuthResult = ApiAuthSuccess | ToolFailure;
export const isApiAuthSuccess = (r: ApiAuthResult): r is ApiAuthSuccess => r.success;

/* ------------------------------------------------------------------ */
/*                           API GRAPHQL                              */
/* ------------------------------------------------------------------ */
export interface ApiGraphQLSuccess {
  success: true;
  data: any;
  errors?: any[];
  extensions?: any;
  url: string;
  responseTime?: number;
}
export type ApiGraphQLResult = ApiGraphQLSuccess | ToolFailure;
export const isApiGraphQLSuccess = (r: ApiGraphQLResult): r is ApiGraphQLSuccess => r.success;

/* ------------------------------------------------------------------ */
/*                           API WEBHOOK                              */
/* ------------------------------------------------------------------ */
export interface ApiWebhookSuccess {
  success: true;
  id: string;
  url: string;
  event: string;
  createdAt: string;
  headers?: Record<string, string>;
  payload?: any;
}
export type ApiWebhookResult = ApiWebhookSuccess | ToolFailure;
export const isApiWebhookSuccess = (r: ApiWebhookResult): r is ApiWebhookSuccess => r.success;

/* ------------------------------------------------------------------ */
/*                           API OAUTH                                */
/* ------------------------------------------------------------------ */
export interface ApiOAuthSuccess {
  success: true;
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  refreshToken?: string;
  scope?: string;
  createdAt: string;
}
export type ApiOAuthResult = ApiOAuthSuccess | ToolFailure;
export const isApiOAuthSuccess = (r: ApiOAuthResult): r is ApiOAuthSuccess => r.success;
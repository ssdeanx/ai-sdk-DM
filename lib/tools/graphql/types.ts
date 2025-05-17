/**
 * @file Discriminated-union results + type-guards for GraphQL tools.
 */

export interface ToolFailure {
  success: false;
  error: string;
}

export interface GqlQuerySuccess {
  success: true;
  query: string;
  variables?: Record<string, unknown>;
  data: unknown;
}

export type GqlQueryResult = GqlQuerySuccess | ToolFailure;
export const isGqlQuerySuccess = (r: GqlQueryResult): r is GqlQuerySuccess =>
  r.success;

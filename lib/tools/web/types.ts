/**
 * @file Discriminated-union result shapes + handy type-guards for the web tools.
 */

/* ------------------------------------------------------------------ */
/*                             Failure                                */
/* ------------------------------------------------------------------ */

export interface ToolFailure {
    success: false;
    error: string;
  }

  /* ------------------------------------------------------------------ */
  /*                            WebSearch                               */
  /* ------------------------------------------------------------------ */

  export interface WebSearchItem {
    title: string;
    snippet: string;
    url: string;
  }

  export interface WebSearchSuccess {
    success: true;
    query: string;
    totalResults: number;
    results: WebSearchItem[];
  }

  export type WebSearchResult = WebSearchSuccess | ToolFailure;
  export const isWebSearchSuccess = (r: WebSearchResult): r is WebSearchSuccess =>
    r.success;

/* ------------------------------------------------------------------ */
/*                            WebExtract                              */
/* ------------------------------------------------------------------ */

export interface WebExtractSuccess {
  success: true;
  url: string;
  title: string;
  content: string;
}

export type WebExtractResult = WebExtractSuccess | ToolFailure;
export const isWebExtractSuccess = (r: WebExtractResult): r is WebExtractSuccess =>
  r.success;

/* ------------------------------------------------------------------ */
/*                             WebScrape                              */
/* ------------------------------------------------------------------ */

export interface WebScrapeSuccess {
  success: true;
  url: string;
  data: Record<string, string>;
}

export type WebScrapeResult = WebScrapeSuccess | ToolFailure;
export const isWebScrapeSuccess = (r: WebScrapeResult): r is WebScrapeSuccess =>
  r.success;
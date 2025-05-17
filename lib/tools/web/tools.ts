/**
 * @file Web-oriented tools (search, extract, scrape) for the Vercel AI SDK.
 *
 * @remarks
 *   • Uses the built-in `fetch` (Node ≥ 18) – no external HTTP client needed.
 *   • DOM parsing is done via `cheerio` – install with: `npm i cheerio`.
 *   • Each tool returns a discriminated union (`success: true | false`) that
 *     matches the shapes in `lib/tools/web/types.ts`.
 */

import { tool } from 'ai';
import { z } from 'zod';
import * as cheerio from 'cheerio';
import { MAX_RESULTS, DEFAULT_UA } from './constants';
import {
  WebSearchResult,
  WebExtractResult,
  WebScrapeResult,
  ToolFailure,
} from './types';

/* ───────────────────────────────  schemas  ─────────────────────────────── */

export const webSearchSchema = z.object({
  query: z.string().describe('Search query'),
  numResults: z
    .number()
    .int()
    .min(1)
    .max(MAX_RESULTS)
    .default(5)
    .describe('Number of results to return'),
});

export const webExtractSchema = z.object({
  url: z.string().url().describe('URL to fetch & extract'),
  selector: z.string().optional().describe('CSS selector (optional)'),
});

export const webScrapeSchema = z.object({
  url: z.string().url().describe('URL to scrape'),
  selectors: z
    .record(z.string())
    .describe('Map of key → CSS selector pairs to extract'),
});

/* ────────────────────────────  helpers  ──────────────────────────────── */

/** Abort fetch after 10 s to avoid hanging requests. */
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Fetch raw HTML with UA header, timeout and a single retry on network errors.
 */
const getHtml = async (url: string): Promise<string> => {
  const attempt = async (): Promise<string> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        headers: { 'user-agent': DEFAULT_UA },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await attempt();
  } catch (err) {
    /* one retry for transient network errors */
    return await attempt();
  }
};

/** Collapse repeated whitespace & trim long strings. */
const clean = (txt: string, max = 2_000): string =>
  txt.replace(/\s+/g, ' ').trim().slice(0, max);

/* ────────────────────────────  executions  ───────────────────────────── */

/**
 * Light-weight search hitting DuckDuckGo’s HTML endpoint.
 * No API-key required (HTML output can change any time).
 */
async function webSearch(
  params: z.infer<typeof webSearchSchema>
): Promise<WebSearchResult> {
  const { query, numResults } = params;

  try {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const html = await getHtml(url);
    const $ = cheerio.load(html);

    const results: Array<{ title: string; snippet: string; url: string }> = [];
    $('a.result__a').each((_, el) => {
      if (results.length >= numResults) return false; // break
      const title = clean($(el).text());
      const href = $(el).attr('href') ?? '';
      const snippet = clean(
        $(el).closest('.result').find('.result__snippet').text()
      );
      results.push({ title, snippet, url: href });
    });

    return { success: true, query, totalResults: results.length, results };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
    } satisfies ToolFailure;
  }
}
/**
 * Fetch a page & optionally extract a specific selector’s text.
 */
async function webExtract(
  params: z.infer<typeof webExtractSchema>
): Promise<WebExtractResult> {
  const { url, selector } = params;

  try {
    const html = await getHtml(url);
    const $ = cheerio.load(html);

    const title = clean($('title').first().text());
    const content = selector
      ? clean($(selector).first().text()) // if selector missing → empty string
      : clean($('body').text());

    return { success: true, url, title, content };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
    } satisfies ToolFailure;
  }
}

/**
 * Extract multiple selectors in a single request.
 */
async function webScrape(
  params: z.infer<typeof webScrapeSchema>
): Promise<WebScrapeResult> {
  const { url, selectors } = params;

  try {
    const html = await getHtml(url);
    const $ = cheerio.load(html);

    const data: Record<string, string> = {};
    for (const [key, sel] of Object.entries(selectors)) {
      data[key] = clean($(sel).first().text());
    }

    return { success: true, url, data };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
    } satisfies ToolFailure;
  }
}

/* ─────────────────────────────  exports  ────────────────────────────── */

export const tools = {
  WebSearch: tool({
    description: 'Search the web via DuckDuckGo (HTML scrape)',
    parameters: webSearchSchema,
    execute: webSearch,
  }),
  WebExtract: tool({
    description: 'Extract text from a web page (whole body or selector)',
    parameters: webExtractSchema,
    execute: webExtract,
  }),
  WebScrape: tool({
    description: 'Scrape multiple selectors from a page',
    parameters: webScrapeSchema,
    execute: webScrape,
  }),
};

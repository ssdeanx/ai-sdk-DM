/**
 * This file exports the agentic tools and adapters for use with the AI SDK.
 */

import { createAISDKTools } from './ai-sdk'
import { WikipediaClient } from './wikipedia-client'
import { WikidataClient } from './wikidata-client'
import { RedditClient } from './reddit-client'
import { ArXivClient } from './arxiv-client'
import { BraveSearchClient } from './brave-search-client'
import { calculator } from './calculator'
import { e2b } from './e2b'
import { FirecrawlClient } from './firecrawl-client'
import { GitHubClient } from './github-client'
import { GoogleCustomSearchClient } from './google-custom-search-client'
import { TavilyClient } from './tavily-client'


export const wikipediaTools = createAISDKTools(new WikipediaClient())
export const wikidataTools = createAISDKTools(new WikidataClient())
export const redditTools = createAISDKTools(new RedditClient())
export const arxivTools = createAISDKTools(new ArXivClient({}))
export const braveSearchTools = createAISDKTools(new BraveSearchClient())
export const calculatorTools = createAISDKTools(calculator)
export const e2bTools = createAISDKTools(e2b)
export const firecrawlTools = createAISDKTools(new FirecrawlClient())
export const githubTools = createAISDKTools(new GitHubClient())
export const googleCustomSearchTools = createAISDKTools(new GoogleCustomSearchClient())
export const tavilyTools = createAISDKTools(new TavilyClient())


export const agenticTools = {
  ...wikipediaTools,
  ...wikidataTools,
  ...redditTools,
  ...arxivTools,
  ...braveSearchTools,
  ...calculatorTools,
  ...e2bTools,
  ...firecrawlTools,
  ...githubTools,
  ...googleCustomSearchTools,
  ...tavilyTools
}
export type AgenticTools = typeof agenticTools
export type AgenticTool = keyof AgenticTools
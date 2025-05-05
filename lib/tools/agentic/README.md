# Agentic Tools AI SDK Integration

The following files in this folder have been patched to export their tools using `createAISDKTools` for Vercel AI SDK compatibility:

- wikipedia-client.ts
- wikidata-client.ts
- reddit-client.ts
- arxiv-client.ts
- brave-search-client.ts
- calculator.ts
- e2b.ts
- firecrawl-client.ts
- google-custom-search-client.ts
- tavily-client.ts
- polygon-client.ts
- github-client.ts

**If you add new tool files, follow this pattern:**
1. Import `createAISDKTools` from `./ai-sdk`.
2. Export your tool as `export const <name>Tools = createAISDKTools(new <ClassName>())` or similar.

All major agentic tool files are now patched and ready for use with the Vercel AI SDK.

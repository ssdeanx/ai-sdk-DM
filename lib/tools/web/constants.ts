/**
 * @file Shared literals & utility constants for the “web” tool-suite.
 */

export const MAX_RESULTS = 10 as const;

/**
 * User-Agent string sent with every outbound request.  Feel free to tweak /
 * replace with your product name.
 */
export const DEFAULT_UA =
  'ai-sdk-web-tools (+https://github.com/ssdeanx/ai-sdk-dm)';
export const DEFAULT_UA_HEADER = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3`;
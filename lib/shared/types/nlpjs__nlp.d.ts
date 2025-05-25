/**
 * Type declarations for the '@nlpjs/nlp' module.
 *
 * This file provides fallback types for the '@nlpjs/nlp' package since no official
 * @types package is available. Further type refinements can be added as needed.
 */

declare module '@nlpjs/nlp' {
  export class NlpManager {
    constructor(options: { languages: string[] });
    addDocument(language: string, utterance: string, intent: string): void;
    train(): Promise<void>;
    process(
      language: string,
      input: string
    ): Promise<{ intent: string; score: number }>;
  }
}

# AI SDK Core: Testing
[AI SDK Core](https://ai-sdk.dev/docs/ai-sdk-core)Testing

Testing language models can be challenging, because they are non-deterministic and calling them is slow and expensive.

To enable you to unit test your code that uses the AI SDK, the AI SDK Core includes mock providers and test helpers. You can import the following helpers from `ai/test`:

*   `MockEmbeddingModelV1`: A mock embedding model using the [embedding model v1 specification](https://github.com/vercel/ai/blob/main/packages/provider/src/embedding-model/v1/embedding-model-v1.ts).
*   `MockLanguageModelV1`: A mock language model using the [language model v1 specification](https://github.com/vercel/ai/blob/main/packages/provider/src/language-model/v1/language-model-v1.ts).
*   `mockId`: Provides an incrementing integer ID.
*   `mockValues`: Iterates over an array of values with each call. Returns the last value when the array is exhausted.
*   [`simulateReadableStream`](https://ai-sdk.dev/docs/reference/ai-sdk-core/simulate-readable-stream): Simulates a readable stream with delays.

With mock providers and test helpers, you can control the output of the AI SDK and test your code in a repeatable and deterministic way without actually calling a language model provider.

[Examples](#examples)
---------------------

You can use the test helpers with the AI Core functions in your unit tests:

### [generateText](#generatetext)

```

import { generateText } from 'ai';
import { MockLanguageModelV1 } from 'ai/test';
const result = await generateText({
  model: new MockLanguageModelV1({
    doGenerate: async () => ({
      rawCall: { rawPrompt: null, rawSettings: {} },
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20 },
      text: `Hello, world!`,
    }),
  }),
  prompt: 'Hello, test!',
});
```


### [streamText](#streamtext)

```

import { streamText, simulateReadableStream } from 'ai';
import { MockLanguageModelV1 } from 'ai/test';
const result = streamText({
  model: new MockLanguageModelV1({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: 'text-delta', textDelta: 'Hello' },
          { type: 'text-delta', textDelta: ', ' },
          { type: 'text-delta', textDelta: `world!` },
          {
            type: 'finish',
            finishReason: 'stop',
            logprobs: undefined,
            usage: { completionTokens: 10, promptTokens: 3 },
          },
        ],
      }),
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  }),
  prompt: 'Hello, test!',
});
```


### [generateObject](#generateobject)

```

import { generateObject } from 'ai';
import { MockLanguageModelV1 } from 'ai/test';
import { z } from 'zod';
const result = await generateObject({
  model: new MockLanguageModelV1({
    defaultObjectGenerationMode: 'json',
    doGenerate: async () => ({
      rawCall: { rawPrompt: null, rawSettings: {} },
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20 },
      text: `{"content":"Hello, world!"}`,
    }),
  }),
  schema: z.object({ content: z.string() }),
  prompt: 'Hello, test!',
});
```


### [streamObject](#streamobject)

```

import { streamObject, simulateReadableStream } from 'ai';
import { MockLanguageModelV1 } from 'ai/test';
import { z } from 'zod';
const result = streamObject({
  model: new MockLanguageModelV1({
    defaultObjectGenerationMode: 'json',
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: 'text-delta', textDelta: '{ ' },
          { type: 'text-delta', textDelta: '"content": ' },
          { type: 'text-delta', textDelta: `"Hello, ` },
          { type: 'text-delta', textDelta: `world` },
          { type: 'text-delta', textDelta: `!"` },
          { type: 'text-delta', textDelta: ' }' },
          {
            type: 'finish',
            finishReason: 'stop',
            logprobs: undefined,
            usage: { completionTokens: 10, promptTokens: 3 },
          },
        ],
      }),
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  }),
  schema: z.object({ content: z.string() }),
  prompt: 'Hello, test!',
});
```


### [Simulate Data Stream Protocol Responses](#simulate-data-stream-protocol-responses)

You can also simulate [Data Stream Protocol](about:/docs/ai-sdk-ui/stream-protocol#data-stream-protocol) responses for testing, debugging, or demonstration purposes.

Here is a Next example:

```

import { simulateReadableStream } from 'ai';
export async function POST(req: Request) {
  return new Response(
    simulateReadableStream({
      initialDelayInMs: 1000, // Delay before the first chunk
      chunkDelayInMs: 300, // Delay between chunks
      chunks: [
        `0:"This"\n`,
        `0:" is an"\n`,
        `0:"example."\n`,
        `e:{"finishReason":"stop","usage":{"promptTokens":20,"completionTokens":50},"isContinued":false}\n`,
        `d:{"finishReason":"stop","usage":{"promptTokens":20,"completionTokens":50}}\n`,
      ],
    }).pipeThrough(new TextEncoderStream()),
    {
      status: 200,
      headers: {
        'X-Vercel-AI-Data-Stream': 'v1',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    },
  );
}
```

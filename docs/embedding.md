# AI SDK Core: Embeddings
[AI SDK Core](https://ai-sdk.dev/docs/ai-sdk-core)Embeddings

Embeddings are a way to represent words, phrases, or images as vectors in a high-dimensional space. In this space, similar words are close to each other, and the distance between words can be used to measure their similarity.

[Embedding a Single Value](#embedding-a-single-value)
-----------------------------------------------------

The AI SDK provides the [`embed`](https://ai-sdk.dev/docs/reference/ai-sdk-core/embed) function to embed single values, which is useful for tasks such as finding similar words or phrases or clustering text. You can use it with embeddings models, e.g. `openai.embedding('text-embedding-3-large')` or `mistral.embedding('mistral-embed')`.

```

import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
// 'embedding' is a single embedding object (number[])
const { embedding } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: 'sunny day at the beach',
});
```


[Embedding Many Values](#embedding-many-values)
-----------------------------------------------

When loading data, e.g. when preparing a data store for retrieval-augmented generation (RAG), it is often useful to embed many values at once (batch embedding).

The AI SDK provides the [`embedMany`](https://ai-sdk.dev/docs/reference/ai-sdk-core/embed-many) function for this purpose. Similar to `embed`, you can use it with embeddings models, e.g. `openai.embedding('text-embedding-3-large')` or `mistral.embedding('mistral-embed')`.

```

import { openai } from '@ai-sdk/openai';
import { embedMany } from 'ai';
// 'embeddings' is an array of embedding objects (number[][]).
// It is sorted in the same order as the input values.
const { embeddings } = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: [
    'sunny day at the beach',
    'rainy afternoon in the city',
    'snowy night in the mountains',
  ],
});
```


[Embedding Similarity](#embedding-similarity)
---------------------------------------------

After embedding values, you can calculate the similarity between them using the [`cosineSimilarity`](https://ai-sdk.dev/docs/reference/ai-sdk-core/cosine-similarity) function. This is useful to e.g. find similar words or phrases in a dataset. You can also rank and filter related items based on their similarity.

```

import { openai } from '@ai-sdk/openai';
import { cosineSimilarity, embedMany } from 'ai';
const { embeddings } = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: ['sunny day at the beach', 'rainy afternoon in the city'],
});
console.log(
  `cosine similarity: ${cosineSimilarity(embeddings[0], embeddings[1])}`,
);
```


[Token Usage](#token-usage)
---------------------------

Many providers charge based on the number of tokens used to generate embeddings. Both `embed` and `embedMany` provide token usage information in the `usage` property of the result object:

```

import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
const { embedding, usage } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: 'sunny day at the beach',
});
console.log(usage); // { tokens: 10 }
```


[Settings](#settings)
---------------------

### [Retries](#retries)

Both `embed` and `embedMany` accept an optional `maxRetries` parameter of type `number` that you can use to set the maximum number of retries for the embedding process. It defaults to `2` retries (3 attempts in total). You can set it to `0` to disable retries.

```

import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
const { embedding } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: 'sunny day at the beach',
  maxRetries: 0, // Disable retries
});
```


### [Abort Signals and Timeouts](#abort-signals-and-timeouts)

Both `embed` and `embedMany` accept an optional `abortSignal` parameter of type [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) that you can use to abort the embedding process or set a timeout.

```

import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
const { embedding } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: 'sunny day at the beach',
  abortSignal: AbortSignal.timeout(1000), // Abort after 1 second
});
```


Both `embed` and `embedMany` accept an optional `headers` parameter of type `Record<string, string>` that you can use to add custom headers to the embedding request.

```

import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
const { embedding } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: 'sunny day at the beach',
  headers: { 'X-Custom-Header': 'custom-value' },
});
```


[Embedding Providers & Models](#embedding-providers--models)
------------------------------------------------------------

Several providers offer embedding models:
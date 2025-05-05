# AI SDK Core: Generating Structured Data
[AI SDK Core](https://ai-sdk.dev/docs/ai-sdk-core)Generating Structured Data

While text generation can be useful, your use case will likely call for generating structured data. For example, you might want to extract information from text, classify data, or generate synthetic data.

Many language models are capable of generating structured data, often defined as using "JSON modes" or "tools". However, you need to manually provide schemas and then validate the generated data as LLMs can produce incorrect or incomplete structured data.

The AI SDK standardises structured object generation across model providers with the [`generateObject`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-object) and [`streamObject`](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-object) functions. You can use both functions with different output strategies, e.g. `array`, `object`, or `no-schema`, and with different generation modes, e.g. `auto`, `tool`, or `json`. You can use [Zod schemas](https://ai-sdk.dev/docs/reference/ai-sdk-core/zod-schema), [Valibot](https://ai-sdk.dev/docs/reference/ai-sdk-core/valibot-schema), or [JSON schemas](https://ai-sdk.dev/docs/reference/ai-sdk-core/json-schema) to specify the shape of the data that you want, and the AI model will generate data that conforms to that structure.

You can pass Zod objects directly to the AI SDK functions or use the `zodSchema` helper function.

[Generate Object](#generate-object)
-----------------------------------

The `generateObject` generates structured data from a prompt. The schema is also used to validate the generated data, ensuring type safety and correctness.

```

import { generateObject } from 'ai';
import { z } from 'zod';
const { object } = await generateObject({
  model: yourModel,
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(z.object({ name: z.string(), amount: z.string() })),
      steps: z.array(z.string()),
    }),
  }),
  prompt: 'Generate a lasagna recipe.',
});
```


See `generateObject` in action with [these examples](#more-examples)

### [Accessing response headers & body](#accessing-response-headers--body)

Sometimes you need access to the full response from the model provider, e.g. to access some provider-specific headers or body content.

You can access the raw response headers and body using the `response` property:

```

import { generateText } from 'ai';
const result = await generateText({
  // ...
});
console.log(JSON.stringify(result.response.headers, null, 2));
console.log(JSON.stringify(result.response.body, null, 2));
```


[Stream Object](#stream-object)
-------------------------------

Given the added complexity of returning structured data, model response time can be unacceptable for your interactive use case. With the [`streamObject`](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-object) function, you can stream the model's response as it is generated.

```

import { streamObject } from 'ai';
const { partialObjectStream } = streamObject({
  // ...
});
// use partialObjectStream as an async iterable
for await (const partialObject of partialObjectStream) {
  console.log(partialObject);
}
```


You can use `streamObject` to stream generated UIs in combination with React Server Components (see [Generative UI](../ai-sdk-rsc))) or the [`useObject`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-object) hook.

See `streamObject` in action with [these examples](#more-examples)

### [`onError` callback](#onerror-callback)

`streamObject` immediately starts streaming. Errors become part of the stream and are not thrown to prevent e.g. servers from crashing.

To log errors, you can provide an `onError` callback that is triggered when an error occurs.

```

import { streamObject } from 'ai';
const result = streamObject({
  // ...
  onError({ error }) {
    console.error(error); // your error logging logic here
  },
});
```


[Output Strategy](#output-strategy)
-----------------------------------

You can use both functions with different output strategies, e.g. `array`, `object`, or `no-schema`.

### [Object](#object)

The default output strategy is `object`, which returns the generated data as an object. You don't need to specify the output strategy if you want to use the default.

### [Array](#array)

If you want to generate an array of objects, you can set the output strategy to `array`. When you use the `array` output strategy, the schema specifies the shape of an array element. With `streamObject`, you can also stream the generated array elements using `elementStream`.

```

import { openai } from '@ai-sdk/openai';
import { streamObject } from 'ai';
import { z } from 'zod';
const { elementStream } = streamObject({
  model: openai('gpt-4-turbo'),
  output: 'array',
  schema: z.object({
    name: z.string(),
    class: z
      .string()
      .describe('Character class, e.g. warrior, mage, or thief.'),
    description: z.string(),
  }),
  prompt: 'Generate 3 hero descriptions for a fantasy role playing game.',
});
for await (const hero of elementStream) {
  console.log(hero);
}
```


### [Enum](#enum)

If you want to generate a specific enum value, e.g. for classification tasks, you can set the output strategy to `enum` and provide a list of possible values in the `enum` parameter.

Enum output is only available with `generateObject`.

```

import { generateObject } from 'ai';
const { object } = await generateObject({
  model: yourModel,
  output: 'enum',
  enum: ['action', 'comedy', 'drama', 'horror', 'sci-fi'],
  prompt:
    'Classify the genre of this movie plot: ' +
    '"A group of astronauts travel through a wormhole in search of a ' +
    'new habitable planet for humanity."',
});
```


### [No Schema](#no-schema)

In some cases, you might not want to use a schema, for example when the data is a dynamic user request. You can use the `output` setting to set the output format to `no-schema` in those cases and omit the schema parameter.

```

import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
const { object } = await generateObject({
  model: openai('gpt-4-turbo'),
  output: 'no-schema',
  prompt: 'Generate a lasagna recipe.',
});
```


[Generation Mode](#generation-mode)
-----------------------------------

While some models (like OpenAI) natively support object generation, others require alternative methods, like modified [tool calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling). The `generateObject` function allows you to specify the method it will use to return structured data.

*   `auto`: The provider will choose the best mode for the model. This recommended mode is used by default.
*   `tool`: A tool with the JSON schema as parameters is provided and the provider is instructed to use it.
*   `json`: The response format is set to JSON when supported by the provider, e.g. via json modes or grammar-guided generation. If grammar-guided generation is not supported, the JSON schema and instructions to generate JSON that conforms to the schema are injected into the system prompt.

Please note that not every provider supports all generation modes. Some providers do not support object generation at all.

[Schema Name and Description](#schema-name-and-description)
-----------------------------------------------------------

You can optionally specify a name and description for the schema. These are used by some providers for additional LLM guidance, e.g. via tool or schema name.

```

import { generateObject } from 'ai';
import { z } from 'zod';
const { object } = await generateObject({
  model: yourModel,
  schemaName: 'Recipe',
  schemaDescription: 'A recipe for a dish.',
  schema: z.object({
    name: z.string(),
    ingredients: z.array(z.object({ name: z.string(), amount: z.string() })),
    steps: z.array(z.string()),
  }),
  prompt: 'Generate a lasagna recipe.',
});
```


[Error Handling](#error-handling)
---------------------------------

When `generateObject` cannot generate a valid object, it throws a [`AI_NoObjectGeneratedError`](https://ai-sdk.dev/docs/reference/ai-sdk-errors/ai-no-object-generated-error).

This error occurs when the AI provider fails to generate a parsable object that conforms to the schema. It can arise due to the following reasons:

*   The model failed to generate a response.
*   The model generated a response that could not be parsed.
*   The model generated a response that could not be validated against the schema.

The error preserves the following information to help you log the issue:

*   `text`: The text that was generated by the model. This can be the raw text or the tool call text, depending on the object generation mode.
*   `response`: Metadata about the language model response, including response id, timestamp, and model.
*   `usage`: Request token usage.
*   `cause`: The cause of the error (e.g. a JSON parsing error). You can use this for more detailed error handling.

```

import { generateObject, NoObjectGeneratedError } from 'ai';
try {
  await generateObject({ model, schema, prompt });
} catch (error) {
  if (NoObjectGeneratedError.isInstance(error)) {
    console.log('NoObjectGeneratedError');
    console.log('Cause:', error.cause);
    console.log('Text:', error.text);
    console.log('Response:', error.response);
    console.log('Usage:', error.usage);
  }
}
```


[Repairing Invalid or Malformed JSON](#repairing-invalid-or-malformed-json)
---------------------------------------------------------------------------

The `repairText` function is experimental and may change in the future.

Sometimes the model will generate invalid or malformed JSON. You can use the `repairText` function to attempt to repair the JSON.

It receives the error, either a `JSONParseError` or a `TypeValidationError`, and the text that was generated by the model. You can then attempt to repair the text and return the repaired text.

```

import { generateObject } from 'ai';
const { object } = await generateObject({
  model,
  schema,
  prompt,
  experimental_repairText: async ({ text, error }) => {
    // example: add a closing brace to the text
    return text + '}';
  },
});
```


[Structured outputs with `generateText` and `streamText`](#structured-outputs-with-generatetext-and-streamtext)
---------------------------------------------------------------------------------------------------------------

You can generate structured data with `generateText` and `streamText` by using the `experimental_output` setting.

Some models, e.g. those by OpenAI, support structured outputs and tool calling at the same time. This is only possible with `generateText` and `streamText`.

Structured output generation with `generateText` and `streamText` is experimental and may change in the future.

### [`generateText`](#generatetext)

```

// experimental_output is a structured object that matches the schema:
const { experimental_output } = await generateText({
  // ...
  experimental_output: Output.object({
    schema: z.object({
      name: z.string(),
      age: z.number().nullable().describe('Age of the person.'),
      contact: z.object({
        type: z.literal('email'),
        value: z.string(),
      }),
      occupation: z.object({
        type: z.literal('employed'),
        company: z.string(),
        position: z.string(),
      }),
    }),
  }),
  prompt: 'Generate an example person for testing.',
});
```


### [`streamText`](#streamtext)

```

// experimental_partialOutputStream contains generated partial objects:
const { experimental_partialOutputStream } = await streamText({
  // ...
  experimental_output: Output.object({
    schema: z.object({
      name: z.string(),
      age: z.number().nullable().describe('Age of the person.'),
      contact: z.object({
        type: z.literal('email'),
        value: z.string(),
      }),
      occupation: z.object({
        type: z.literal('employed'),
        company: z.string(),
        position: z.string(),
      }),
    }),
  }),
  prompt: 'Generate an example person for testing.',
});
```


[More Examples](#more-examples)
-------------------------------

You can see `generateObject` and `streamObject` in action using various frameworks in the following examples:

### [`generateObject`](#generateobject)

### [`streamObject`](#streamobject)
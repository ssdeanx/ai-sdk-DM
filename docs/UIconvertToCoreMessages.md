# AI SDK UI: convertToCoreMessages
AI SDK UIconvertToCoreMessages

The `convertToCoreMessages` function is no longer required. The AI SDK now automatically converts the incoming messages to the `CoreMessage` format.

The `convertToCoreMessages` function is used to transform an array of UI messages from the `useChat` hook into an array of `CoreMessage` objects. These `CoreMessage` objects are compatible with AI core functions like `streamText`.

```

import { openai } from '@ai-sdk/openai';
import { convertToCoreMessages, streamText } from 'ai';
export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: openai('gpt-4o'),
    messages: convertToCoreMessages(messages),
  });
  return result.toDataStreamResponse();
}
```


Import
-----------------

```
import { convertToCoreMessages } from "ai"
```


API Signature
-------------------------------

### Parameters

An array of UI messages from the useChat hook to be converted

### options:

{ tools?: ToolSet }

Optional configuration object. Provide tools to enable multi-modal tool responses.

### Returns

An array of `CoreMessage` objects.

An array of CoreMessage objects

The `convertToCoreMessages` function supports tools that can return multi-modal content. This is useful when tools need to return non-text content like images.

```

import { tool } from 'ai';
import { z } from 'zod';
const screenshotTool = tool({
  parameters: z.object({}),
  execute: async () => 'imgbase64',
  experimental_toToolResultContent: result => [{ type: 'image', data: result }],
});
const result = streamText({
  model: openai('gpt-4'),
  messages: convertToCoreMessages(messages, {
    tools: {
      screenshot: screenshotTool,
    },
  }),
});
```


Tools can implement the optional `experimental_toToolResultContent` method to transform their results into multi-modal content. The content is an array of content parts, where each part has a `type` (e.g., 'text', 'image') and corresponding data.